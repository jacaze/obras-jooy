import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  atenderRequisicao,
  cancelarRequisicao,
  createRequisicao,
  exportarRequisicoesSienge,
  getAreasObra,
  getFerramentas,
  getLimitesOrcamentoObra,
  getObras,
  getRequisicoes,
  getSaldosEstoque,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type {
  AtenderRequisicaoInput,
  CriarRequisicaoInput,
  Requisicao,
  StatusRequisicao,
} from '../types/requisicao'
import { SeletorItemPesquisavel } from '../components/SeletorItemPesquisavel'

function extrairErro(err: any, fallback: string): string {
  const data = err.response?.data
  if (!data) return fallback
  if (data.campos && typeof data.campos === 'object') {
    const detalhes = Object.entries(data.campos)
      .map(([campo, msg]) => `${campo}: ${msg}`)
      .join(' | ')
    return `${data.erro || 'Dados invalidos'}: ${detalhes}`
  }
  if (data.mensagem) return data.mensagem
  if (data.erro) return data.erro
  return fallback
}

interface ItemLinhaForm {
  tipo: 'MATERIAL' | 'FERRAMENTA'
  materialId: string
  ferramentaId: string
  quantidade: number
}

function gerarChaveIdempotencia(): string {
  return 'req-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36)
}

function dispararDownloadCsv(conteudoCsv: string, nomeArquivo: string) {
  if (typeof window === 'undefined' || !window.URL?.createObjectURL) return
  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', nomeArquivo)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function RequisicoesPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  const ehEncarregado = usuario?.perfil === 'ENCARREGADO'
  const podeAtenderEExportar =
    usuario?.perfil === 'ADMIN' || usuario?.perfil === 'ALMOXARIFE'

  // Filtros de listagem
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS')
  const [ocultarAtendidas, setOcultarAtendidas] = useState(false)
  const [filtroSienge, setFiltroSienge] = useState<'TODAS' | 'PENDENTES' | 'EXPORTADAS'>('TODAS')
  const [mensagemFeedback, setMensagemFeedback] = useState<string | null>(null)
  const [erroFeedback, setErroFeedback] = useState<string | null>(null)

  // Modal: Nova Requisicao
  const [modalNovaRequisicaoAberto, setModalNovaRequisicaoAberto] = useState(false)
  const [obraIdSelecionada, setObraIdSelecionada] = useState('')
  const [areaIdSelecionada, setAreaIdSelecionada] = useState('')
  const [observacao, setObservacao] = useState('')
  const [itensForm, setItensForm] = useState<ItemLinhaForm[]>([
    { tipo: 'MATERIAL', materialId: '', ferramentaId: '', quantidade: 1 },
  ])
  const [chaveIdempotencia, setChaveIdempotencia] = useState(gerarChaveIdempotencia())
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Modal: Atender Requisicao (Almoxarife / Admin)
  const [requisicaoEmAtendimento, setRequisicaoEmAtendimento] = useState<Requisicao | null>(null)
  const [retiradoPor, setRetiradoPor] = useState('')
  const [qtdsEntreguesMap, setQtdsEntreguesMap] = useState<Record<string, string>>({})
  const [erroAtendimento, setErroAtendimento] = useState<string | null>(null)

  // Queries
  const { data: requisicoes = [], isLoading: carregandoRequisicoes } = useQuery({
    queryKey: ['requisicoes'],
    queryFn: () => getRequisicoes(),
  })

  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => getObras(true),
  })

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-obra', obraIdSelecionada],
    queryFn: () => getAreasObra(obraIdSelecionada, true),
    enabled: !!obraIdSelecionada,
  })

  const { data: saldosObraModal = [] } = useQuery({
    queryKey: ['estoque-saldos-obra-modal', obraIdSelecionada],
    queryFn: () => getSaldosEstoque({ obraId: obraIdSelecionada }),
    enabled: !!obraIdSelecionada,
  })

  const { data: limitesOrcamentoObra = [] } = useQuery({
    queryKey: ['limites-orcamento-obra', obraIdSelecionada],
    queryFn: () => getLimitesOrcamentoObra(obraIdSelecionada),
    enabled: !!obraIdSelecionada,
  })

  const mapaLimitesOrcamento = (() => {
    const mapa = new Map<string, number>()
    for (const lim of limitesOrcamentoObra) {
      mapa.set(lim.materialId, Number(lim.quantidadeOrcada))
    }
    return mapa
  })()

  const { data: ferramentas = [] } = useQuery({
    queryKey: ['ferramentas-disponiveis'],
    queryFn: () => getFerramentas({ status: 'DISPONIVEL', somenteAtivas: true }),
  })

  // Itens em estoque na obra selecionada com saldo disponivel positivo (> 0)
  const materiaisEmEstoqueNaObra = (() => {
    const mapa = new Map<string, { material: any; disponivel: number }>()

    for (const s of saldosObraModal) {
      const disp = Number(s.disponivel)
      if (disp <= 0) continue

      const existente = mapa.get(s.materialId)
      if (existente) {
        existente.disponivel = Number((existente.disponivel + disp).toFixed(4))
      } else {
        mapa.set(s.materialId, {
          material: s.material,
          disponivel: disp,
        })
      }
    }

    return Array.from(mapa.values())
  })()

  // Mutations
  const criarRequisicaoMutation = useMutation({
    mutationFn: (dados: CriarRequisicaoInput) => createRequisicao(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setModalNovaRequisicaoAberto(false)
      limparForm()
    },
    onError: (err: any) => {
      setErroForm(extrairErro(err, 'Erro ao criar requisicao'))
    },
  })

  const atenderRequisicaoMutation = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: AtenderRequisicaoInput }) =>
      atenderRequisicao(id, dados),
    onSuccess: (reqAtendida) => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-saldos'] })
      queryClient.invalidateQueries({ queryKey: ['estoque-movimentacoes'] })
      setRequisicaoEmAtendimento(null)
      setRetiradoPor('')
      setQtdsEntreguesMap({})
      setErroAtendimento(null)
      setErroFeedback(null)
      setMensagemFeedback(
        `Requisicao #${reqAtendida.numeroSequencial} atendida com sucesso. Retirado por: ${reqAtendida.retiradoPor}.`
      )
    },
    onError: (err: any) => {
      setErroAtendimento(extrairErro(err, 'Nao foi possivel atender a requisicao'))
    },
  })

  const exportarSiengeMutation = useMutation({
    mutationFn: (incluirJaExportadas: boolean) =>
      exportarRequisicoesSienge({ incluirJaExportadas }),
    onSuccess: (res) => {
      dispararDownloadCsv(res.csv, res.nomeArquivo)
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      setErroFeedback(null)
      setMensagemFeedback(
        `Arquivo ${res.nomeArquivo} gerado com sucesso (${res.totalRequisicoes} requisicao(oes) marcada(s) como exportada(s) para o SIENGE).`
      )
    },
    onError: (err: any) => {
      setMensagemFeedback(null)
      setErroFeedback(extrairErro(err, 'Erro ao exportar requisicoes para o SIENGE'))
    },
  })

  const cancelarRequisicaoMutation = useMutation({
    mutationFn: (id: string) => cancelarRequisicao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
    },
    onError: (err: any) => {
      setErroFeedback(extrairErro(err, 'Nao foi possivel cancelar a requisicao'))
    },
  })

  function limparForm() {
    setObraIdSelecionada('')
    setAreaIdSelecionada('')
    setObservacao('')
    setItensForm([{ tipo: 'MATERIAL', materialId: '', ferramentaId: '', quantidade: 1 }])
    setChaveIdempotencia(gerarChaveIdempotencia())
    setErroForm(null)
  }

  function handleAbrirModal() {
    limparForm()
    setModalNovaRequisicaoAberto(true)
  }

  function handleAbrirModalAtendimento(req: Requisicao) {
    setRequisicaoEmAtendimento(req)
    setRetiradoPor('')
    setErroAtendimento(null)
    const mapaInicial: Record<string, string> = {}
    for (const it of req.itens) {
      mapaInicial[it.id] = String(Number(it.quantidade))
    }
    setQtdsEntreguesMap(mapaInicial)
  }

  function handleSubmeterAtendimento(e: FormEvent) {
    e.preventDefault()
    if (!requisicaoEmAtendimento) return
    setErroAtendimento(null)

    if (retiradoPor.trim().length < 2) {
      setErroAtendimento('Informe o nome de quem esta retirando o material na obra')
      return
    }

    const itensPayload = requisicaoEmAtendimento.itens.map((it) => {
      const valorDigitado = parseFloat(qtdsEntreguesMap[it.id] ?? String(it.quantidade))
      return {
        itemId: it.id,
        quantidadeEntregue: isNaN(valorDigitado) ? 0 : valorDigitado,
      }
    })

    if (itensPayload.some((i) => i.quantidadeEntregue < 0)) {
      setErroAtendimento('A quantidade entregue nao pode ser negativa')
      return
    }

    if (itensPayload.every((i) => i.quantidadeEntregue <= 0)) {
      setErroAtendimento('Informe quantidade entregue maior que zero para ao menos um item')
      return
    }

    atenderRequisicaoMutation.mutate({
      id: requisicaoEmAtendimento.id,
      dados: {
        retiradoPor: retiradoPor.trim(),
        itens: itensPayload,
      },
    })
  }

  function handleAdicionarItem() {
    setItensForm((prev) => [
      ...prev,
      { tipo: 'MATERIAL', materialId: '', ferramentaId: '', quantidade: 1 },
    ])
  }

  function handleRemoverItem(index: number) {
    if (itensForm.length <= 1) return
    setItensForm((prev) => prev.filter((_, i) => i !== index))
  }

  function handleAtualizarItem(index: number, campo: keyof ItemLinhaForm, valor: any) {
    setItensForm((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it
        const atualizado = { ...it, [campo]: valor }
        if (campo === 'tipo') {
          atualizado.materialId = ''
          atualizado.ferramentaId = ''
          atualizado.quantidade = 1
        }
        return atualizado
      })
    )
  }

  function handleCriarRequisicao(e: FormEvent) {
    e.preventDefault()
    setErroForm(null)

    if (!areaIdSelecionada) {
      setErroForm('Selecione a obra e a area/pavimento de aplicacao')
      return
    }

    if (itensForm.length === 0) {
      setErroForm('Adicione ao menos um item a requisicao')
      return
    }

    for (let i = 0; i < itensForm.length; i++) {
      const it = itensForm[i]
      if (it.tipo === 'MATERIAL' && !it.materialId) {
        setErroForm(`Selecione o material no item ${i + 1}`)
        return
      }
      if (it.tipo === 'FERRAMENTA' && !it.ferramentaId) {
        setErroForm(`Selecione a ferramenta no item ${i + 1}`)
        return
      }
      if (it.quantidade <= 0) {
        setErroForm(`Informe uma quantidade valida no item ${i + 1}`)
        return
      }
    }

    criarRequisicaoMutation.mutate({
      areaId: areaIdSelecionada,
      observacao: observacao.trim() || undefined,
      chaveIdempotencia,
      itens: itensForm.map((it) => ({
        materialId: it.tipo === 'MATERIAL' ? it.materialId : null,
        ferramentaId: it.tipo === 'FERRAMENTA' ? it.ferramentaId : null,
        quantidade: Number(it.quantidade),
      })),
    })
  }

  // Contagem de atendidas pendentes de exportacao para o SIENGE
  const qtdPendentesSienge = requisicoes.filter(
    (r) => r.status === 'ATENDIDA' && !r.exportadaSienge
  ).length

  // Filtragem
  const requisicoesFiltradas = requisicoes.filter((r) => {
    if (ocultarAtendidas && r.status === 'ATENDIDA') {
      return false
    }

    if (filtroStatus !== 'TODAS' && r.status !== filtroStatus) {
      return false
    }

    if (podeAtenderEExportar && filtroSienge !== 'TODAS') {
      if (filtroSienge === 'PENDENTES' && (r.status !== 'ATENDIDA' || r.exportadaSienge)) {
        return false
      }
      if (filtroSienge === 'EXPORTADAS' && !r.exportadaSienge) {
        return false
      }
    }

    if (!busca.trim()) return true

    const termo = busca.toLowerCase()
    const num = `#${r.numeroSequencial}`
    const obraNome = r.area?.obra?.nome?.toLowerCase() || ''
    const areaNome = r.area?.nome?.toLowerCase() || ''
    const reqNome = r.requisitante?.nome?.toLowerCase() || ''
    const retiradoNome = r.retiradoPor?.toLowerCase() || ''
    const obs = r.observacao?.toLowerCase() || ''

    return (
      num.includes(termo) ||
      obraNome.includes(termo) ||
      areaNome.includes(termo) ||
      reqNome.includes(termo) ||
      retiradoNome.includes(termo) ||
      obs.includes(termo)
    )
  })

  function badgeStatus(status: StatusRequisicao) {
    switch (status) {
      case 'SOLICITADA':
        return { bg: '#fef3c7', cor: '#92400e', texto: 'Pendente (Aguardando Almoxarifado)' }
      case 'EM_SEPARACAO':
        return { bg: '#e0f2fe', cor: '#0369a1', texto: 'Em Separacao' }
      case 'PRONTA':
        return { bg: '#dcfce7', cor: '#166534', texto: 'Pronta para Retirada' }
      case 'ATENDIDA':
        return { bg: '#dcfce7', cor: '#166534', texto: 'Atendida / Entregue' }
      case 'CANCELADA':
        return { bg: '#fee2e2', cor: '#991b1b', texto: 'Cancelada' }
    }
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Cabecalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 0.25rem', fontSize: '1.75rem' }}>
            {ehEncarregado ? 'Minhas Requisicoes de Obra' : 'Painel de Requisicoes de Obra'}
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            {ehEncarregado
              ? 'Solicite materiais e ferramentas disponiveis no estoque da obra e acompanhe seus pedidos'
              : 'Atenda requisicoes com baixa automatica no estoque e exporte os registros atendidos para o SIENGE'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {podeAtenderEExportar && (
            <button
              type="button"
              disabled={exportarSiengeMutation.isPending}
              onClick={() => {
                setMensagemFeedback(null)
                setErroFeedback(null)
                const reexportar = filtroSienge === 'EXPORTADAS'
                exportarSiengeMutation.mutate(reexportar)
              }}
              style={{
                backgroundColor: '#0f766e',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.15rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.88rem',
              }}
            >
              {exportarSiengeMutation.isPending
                ? 'Exportando CSV...'
                : `Exportar para SIENGE (CSV)${qtdPendentesSienge > 0 ? ` [${qtdPendentesSienge}]` : ''}`}
            </button>
          )}

          <button
            type="button"
            onClick={handleAbrirModal}
            style={{
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            + Nova Requisicao
          </button>
        </div>
      </div>

      {/* Mensagens de Feedback */}
      {mensagemFeedback && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.88rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{mensagemFeedback}</span>
          <button
            type="button"
            onClick={() => setMensagemFeedback(null)}
            style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 700 }}
          >
            &times;
          </button>
        </div>
      )}

      {erroFeedback && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.88rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{erroFeedback}</span>
          <button
            type="button"
            onClick={() => setErroFeedback(null)}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          display: 'flex',
          gap: '0.85rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Buscar por numero (#101), obra, pavimento, solicitante ou quem retirou..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            flex: '1',
            minWidth: '250px',
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontSize: '0.88rem',
          }}
        />

        {/* Botoes dos 3 Status Principais + Todas */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {[
            { id: 'TODAS', label: 'Todas' },
            { id: 'SOLICITADA', label: 'Pendentes' },
            { id: 'ATENDIDA', label: 'Atendidas' },
            { id: 'CANCELADA', label: 'Canceladas' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFiltroStatus(st.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filtroStatus === st.id ? '#0284c7' : '#cbd5e1',
                backgroundColor: filtroStatus === st.id ? '#0284c7' : '#ffffff',
                color: filtroStatus === st.id ? '#ffffff' : '#475569',
                cursor: 'pointer',
                fontSize: '0.84rem',
                fontWeight: filtroStatus === st.id ? 600 : 400,
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Filtro rapido para ocultar requisicoes ja atendidas */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.84rem',
            color: '#334155',
            cursor: 'pointer',
            backgroundColor: '#f8fafc',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
          }}
        >
          <input
            type="checkbox"
            checked={ocultarAtendidas}
            onChange={(e) => setOcultarAtendidas(e.target.checked)}
          />
          Ocultar ja atendidas
        </label>

        {/* Filtro de Exportacao SIENGE (Exclusivo Almoxarife / Admin) */}
        {podeAtenderEExportar && (
          <select
            aria-label="Filtrar por status de exportacao SIENGE"
            value={filtroSienge}
            onChange={(e) => setFiltroSienge(e.target.value as any)}
            style={{
              padding: '0.48rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              fontSize: '0.84rem',
            }}
          >
            <option value="TODAS">SIENGE: Todas</option>
            <option value="PENDENTES">SIENGE: Pendentes de Exportacao</option>
            <option value="EXPORTADAS">SIENGE: Ja Exportadas</option>
          </select>
        )}
      </div>

      {/* Lista de Requisicoes */}
      {carregandoRequisicoes ? (
        <p style={{ color: '#64748b' }}>Carregando requisicoes...</p>
      ) : requisicoesFiltradas.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            padding: '3rem',
            borderRadius: '8px',
            textAlign: 'center',
            color: '#94a3b8',
            border: '1px dashed #cbd5e1',
          }}
        >
          Nenhuma requisicao encontrada para os filtros selecionados.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requisicoesFiltradas.map((r) => {
            const statusConfig = badgeStatus(r.status)
            const podeCancelar =
              r.status === 'SOLICITADA' &&
              (usuario?.id === r.requisitanteId || podeAtenderEExportar)
            const podeAtender =
              r.status === 'SOLICITADA' && podeAtenderEExportar

            return (
              <div
                key={r.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {/* Linha Superior */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color: '#0f172a',
                      }}
                    >
                      #{r.numeroSequencial}
                    </span>
                    <span
                      style={{
                        backgroundColor: statusConfig.bg,
                        color: statusConfig.cor,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {statusConfig.texto}
                    </span>

                    {/* Badge SIENGE exclusivo para Almoxarife e Admin nas requisicoes atendidas */}
                    {podeAtenderEExportar && r.status === 'ATENDIDA' && (
                      <span
                        style={{
                          backgroundColor: r.exportadaSienge ? '#e0f2fe' : '#f1f5f9',
                          color: r.exportadaSienge ? '#0369a1' : '#475569',
                          border: `1px solid ${r.exportadaSienge ? '#bae6fd' : '#cbd5e1'}`,
                          padding: '0.18rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {r.exportadaSienge
                          ? `Exportada para SIENGE${r.exportadaEm ? ` (${new Date(r.exportadaEm).toLocaleDateString('pt-BR')})` : ''}`
                          : 'Pendente Exportacao SIENGE'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Solicitado em: {new Date(r.solicitadaEm).toLocaleString('pt-BR')}
                  </div>
                </div>

                {/* Localizacao, Solicitante e Quem Retirou */}
                <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Obra / Destino: </span>
                    <strong style={{ color: '#1e293b' }}>
                      {r.area?.obra?.codigo} - {r.area?.obra?.nome} &bull; {r.area?.nome}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Solicitante: </span>
                    <strong style={{ color: '#1e293b' }}>
                      {r.requisitante?.nome} ({r.requisitante?.cargo?.nome || 'Encarregado'})
                    </strong>
                  </div>
                  {r.status === 'ATENDIDA' && r.retiradoPor && (
                    <div>
                      <span style={{ color: '#64748b' }}>Retirado na obra por: </span>
                      <strong style={{ color: '#15803d' }}>{r.retiradoPor}</strong>
                    </div>
                  )}
                </div>

                {/* Itens da Requisicao (com historico Solicitado vs Entregue) */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    Itens da Requisicao ({r.itens.length}):
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155' }}>
                    {r.itens.map((it) => {
                      const qtdSol = Number(it.quantidade)
                      const temEntregue =
                        it.quantidadeEntregue !== null && it.quantidadeEntregue !== undefined
                      const qtdEnt = temEntregue ? Number(it.quantidadeEntregue) : null

                      return (
                        <li key={it.id} style={{ marginBottom: '0.25rem' }}>
                          {it.material ? (
                            <>
                              {r.status === 'ATENDIDA' && qtdEnt !== null ? (
                                <span>
                                  <strong>
                                    Solicitado: {qtdSol} {it.material.unidadeConsumo.sigla} | Entregue:{' '}
                                    {qtdEnt} {it.material.unidadeConsumo.sigla}
                                  </strong>{' '}
                                  &mdash; {it.material.descricao}{' '}
                                  <span style={{ color: '#64748b' }}>({it.material.codigo})</span>
                                </span>
                              ) : (
                                <>
                                  <strong>
                                    {qtdSol} {it.material.unidadeConsumo.sigla}
                                  </strong>{' '}
                                  &mdash; {it.material.descricao}{' '}
                                  <span style={{ color: '#64748b' }}>({it.material.codigo})</span>
                                </>
                              )}
                            </>
                          ) : it.ferramenta ? (
                            <>
                              <strong>1 un</strong> &mdash; {it.ferramenta.nome}{' '}
                              <span style={{ color: '#64748b' }}>[Ferramenta cod: {it.ferramenta.codigo}]</span>
                            </>
                          ) : (
                            <span>Item nao especificado</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>

                {/* Observacao e Acoes */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: r.observacao ? 'normal' : 'italic' }}>
                    {r.observacao ? `Obs: ${r.observacao}` : 'Sem observacoes adicionais'}
                    {r.status === 'ATENDIDA' && r.atendidoPor && (
                      <span style={{ marginLeft: '0.75rem', fontStyle: 'normal', color: '#475569' }}>
                        &bull; Atendido por: <strong>{r.atendidoPor.nome}</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {podeAtender && (
                      <button
                        type="button"
                        onClick={() => handleAbrirModalAtendimento(r)}
                        style={{
                          backgroundColor: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.4rem 0.9rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                        }}
                      >
                        Atender / Entregar Material
                      </button>
                    )}

                    {podeCancelar && (
                      <button
                        type="button"
                        disabled={cancelarRequisicaoMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Deseja cancelar a requisicao #${r.numeroSequencial}?`)) {
                            cancelarRequisicaoMutation.mutate(r.id)
                          }
                        }}
                        style={{
                          backgroundColor: '#fff1f2',
                          color: '#e11d48',
                          border: '1px solid #fecdd3',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                        }}
                      >
                        Cancelar Requisicao
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: ATENDER REQUISICAO (ALMOXARIFE / ADMIN) */}
      {requisicaoEmAtendimento && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.75rem',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem', color: '#0f172a' }}>
              Atender Requisicao #{requisicaoEmAtendimento.numeroSequencial}
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Confirme ou ajuste as quantidades entregues e informe o nome de quem esta retirando o material na obra.
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.84rem',
                color: '#334155',
              }}
            >
              <div>
                <strong>Obra / Area:</strong> {requisicaoEmAtendimento.area?.obra?.codigo} -{' '}
                {requisicaoEmAtendimento.area?.obra?.nome} &bull; {requisicaoEmAtendimento.area?.nome}
              </div>
              <div style={{ marginTop: '0.25rem' }}>
                <strong>Solicitante:</strong> {requisicaoEmAtendimento.requisitante?.nome}
              </div>
            </div>

            {erroAtendimento && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroAtendimento}
              </div>
            )}

            <form onSubmit={handleSubmeterAtendimento} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Itens e Quantidades Entregues
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {requisicaoEmAtendimento.itens.map((it) => {
                    const sigla = it.material?.unidadeConsumo?.sigla || 'UN'
                    return (
                      <div
                        key={it.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 140px',
                          gap: '0.75rem',
                          alignItems: 'center',
                          backgroundColor: '#f8fafc',
                          padding: '0.65rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.86rem', color: '#0f172a' }}>
                            {it.material
                              ? `${it.material.codigo} - ${it.material.descricao}`
                              : `${it.ferramenta?.codigo} - ${it.ferramenta?.nome}`}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Quantidade solicitada: <strong>{Number(it.quantidade)} {sigla}</strong>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#475569', marginBottom: '0.2rem' }}>
                            Qtd Entregue ({sigla})
                          </label>
                          <input
                            aria-label={`Quantidade entregue para ${it.material?.descricao || it.ferramenta?.nome}`}
                            type="number"
                            min="0"
                            step="any"
                            required
                            disabled={Boolean(it.ferramenta)}
                            value={qtdsEntreguesMap[it.id] ?? String(Number(it.quantidade))}
                            onChange={(e) =>
                              setQtdsEntreguesMap((prev) => ({
                                ...prev,
                                [it.id]: e.target.value,
                              }))
                            }
                            style={{
                              width: '100%',
                              padding: '0.45rem',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: it.ferramenta ? '#f1f5f9' : '#ffffff',
                              fontSize: '0.85rem',
                              color: '#0f172a',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Retirado por (Responsavel pelo recebimento na obra)
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="ex: Jose da Silva - Pedreiro"
                  value={retiradoPor}
                  onChange={(e) => setRetiradoPor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRequisicaoEmAtendimento(null)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={atenderRequisicaoMutation.isPending}
                  style={{
                    padding: '0.55rem 1.2rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {atenderRequisicaoMutation.isPending
                    ? 'Confirmando...'
                    : 'Confirmar Entrega e Baixar Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA REQUISICAO */}
      {modalNovaRequisicaoAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.75rem',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0f172a' }}>
              Nova Requisicao de Obra
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Informe o destino da aplicacao e adicione os materiais (limitados ao saldo disponivel no estoque da obra) ou ferramentas.
            </p>

            {erroForm && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroForm}
              </div>
            )}

            <form onSubmit={handleCriarRequisicao} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Selecao da Obra e Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                    Obra
                  </label>
                  <select
                    value={obraIdSelecionada}
                    onChange={(e) => {
                      setObraIdSelecionada(e.target.value)
                      setAreaIdSelecionada('')
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="">Selecione a obra...</option>
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.codigo} - {o.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                    Area / Pavimento de Destino
                  </label>
                  <select
                    value={areaIdSelecionada}
                    onChange={(e) => setAreaIdSelecionada(e.target.value)}
                    required
                    disabled={!obraIdSelecionada}
                    style={{
                      width: '100%',
                      padding: '0.55rem',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: !obraIdSelecionada ? '#f1f5f9' : '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.85rem',
                    }}
                  >
                    <option value="">
                      {!obraIdSelecionada ? 'Selecione a obra primeiro' : 'Selecione a area...'}
                    </option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                    Itens Solicitados
                  </label>
                  <button
                    type="button"
                    onClick={handleAdicionarItem}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    + Adicionar Outro Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {itensForm.map((linha, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          itensForm.length > 1
                            ? '105px minmax(0, 1fr) 88px 28px'
                            : '105px minmax(0, 1fr) 88px',
                        gap: '0.5rem',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Tipo */}
                      <select
                        value={linha.tipo}
                        onChange={(e) => handleAtualizarItem(idx, 'tipo', e.target.value)}
                        style={{
                          padding: '0.45rem',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '0.8rem',
                          color: '#0f172a',
                        }}
                      >
                        <option value="MATERIAL">Material</option>
                        <option value="FERRAMENTA">Ferramenta</option>
                      </select>

                      {/* Select Item Pesquisavel: puxa exclusivamente materiais em estoque na obra */}
                      {linha.tipo === 'MATERIAL' ? (
                        <SeletorItemPesquisavel
                          itens={materiaisEmEstoqueNaObra.map(({ material: m, disponivel }) => ({
                            id: m.id,
                            codigo: m.codigo,
                            descricao: m.descricao,
                            unidade: m.unidadeConsumo?.sigla,
                            saldoDisponivel: disponivel,
                            limiteOrcamento: mapaLimitesOrcamento.get(m.id),
                            detalheExtra: m.categoria?.nome ? `Categoria: ${m.categoria.nome}` : undefined,
                          }))}
                          valorSelecionadoId={linha.materialId}
                          onSelecionar={(id) => handleAtualizarItem(idx, 'materialId', id)}
                          placeholder={
                            !obraIdSelecionada
                              ? 'Selecione a obra primeiro para carregar o estoque...'
                              : materiaisEmEstoqueNaObra.length === 0
                                ? 'Nenhum material com saldo em estoque nesta obra'
                                : 'Digite codigo ou descricao do material em estoque...'
                          }
                          desabilitado={!obraIdSelecionada || materiaisEmEstoqueNaObra.length === 0}
                          obrigatorio
                          labelAria={`Selecionar material item ${idx + 1}`}
                        />
                      ) : (
                        <SeletorItemPesquisavel
                          itens={ferramentas.map((f) => ({
                            id: f.id,
                            codigo: f.codigo,
                            descricao: f.nome,
                            detalheExtra: `Status: ${f.status}`,
                          }))}
                          valorSelecionadoId={linha.ferramentaId}
                          onSelecionar={(id) => handleAtualizarItem(idx, 'ferramentaId', id)}
                          placeholder="Digite codigo ou nome da ferramenta..."
                          obrigatorio
                          labelAria={`Selecionar ferramenta item ${idx + 1}`}
                        />
                      )}

                      {/* Quantidade */}
                      <div>
                        {linha.tipo === 'MATERIAL' ? (
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            required
                            placeholder="Qtd"
                            value={linha.quantidade}
                            onChange={(e) => handleAtualizarItem(idx, 'quantidade', parseFloat(e.target.value) || 0)}
                            style={{
                              width: '100%',
                              padding: '0.45rem',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              fontSize: '0.8rem',
                              color: '#0f172a',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'center', display: 'block' }}>
                            1 unidade
                          </span>
                        )}
                      </div>

                      {/* Botao Excluir Linha */}
                      {itensForm.length > 1 && (
                        <div style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '1rem',
                              padding: 0,
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Observacao */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Observacao (opcional)
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="ex: Urgente para a concretagem do bloco norte"
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Botoes do Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNovaRequisicaoAberto(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.85rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarRequisicaoMutation.isPending}
                  style={{
                    padding: '0.55rem 1.2rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {criarRequisicaoMutation.isPending ? 'Enviando...' : 'Enviar Requisicao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
