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

  const { data: todosLimitesOrcamento = [] } = useQuery({
    queryKey: ['limites-orcamento-todas-obras'],
    queryFn: () => getLimitesOrcamentoObra(),
  })

  const mapaLimitesOrcamento = (() => {
    const mapa = new Map<string, number>()
    for (const lim of limitesOrcamentoObra) {
      mapa.set(lim.materialId, Number(lim.quantidadeOrcada))
    }
    return mapa
  })()

  const mapaDetalhesOrcamentoModal = (() => {
    const mapa = new Map<
      string,
      { quantidadeOrcada: number; quantidadeConsumida: number; saldoOrcamento: number }
    >()
    for (const lim of limitesOrcamentoObra) {
      const orcada = Number(lim.quantidadeOrcada)
      const consumida =
        lim.quantidadeConsumida !== undefined ? Number(lim.quantidadeConsumida) : 0
      const saldo =
        lim.saldoOrcamento !== undefined
          ? Number(lim.saldoOrcamento)
          : Number((orcada - consumida).toFixed(4))
      mapa.set(lim.materialId, {
        quantidadeOrcada: orcada,
        quantidadeConsumida: consumida,
        saldoOrcamento: saldo,
      })
    }
    return mapa
  })()

  const mapaLimitesPorObraMaterial = (() => {
    const mapa = new Map<
      string,
      { quantidadeOrcada: number; quantidadeConsumida: number; saldoOrcamento: number }
    >()
    for (const lim of todosLimitesOrcamento) {
      const orcada = Number(lim.quantidadeOrcada)
      const consumida =
        lim.quantidadeConsumida !== undefined ? Number(lim.quantidadeConsumida) : 0
      const saldo =
        lim.saldoOrcamento !== undefined
          ? Number(lim.saldoOrcamento)
          : Number((orcada - consumida).toFixed(4))
      mapa.set(`${lim.obraId}:${lim.materialId}`, {
        quantidadeOrcada: orcada,
        quantidadeConsumida: consumida,
        saldoOrcamento: saldo,
      })
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

  // Mapa de saldo disponivel por materialId na obra selecionada
  const mapaSaldoFisicoModal = (() => {
    const mapa = new Map<string, { disponivel: number; material: any }>()
    for (const item of materiaisEmEstoqueNaObra) {
      mapa.set(item.material.id, item)
    }
    return mapa
  })()

  // Quantidade consolidada solicitada por materialId no formulario atual
  const mapaQtdSolicitadaModal = (() => {
    const mapa = new Map<string, number>()
    for (const linha of itensForm) {
      if (linha.tipo === 'MATERIAL' && linha.materialId && linha.quantidade > 0) {
        const atual = mapa.get(linha.materialId) || 0
        mapa.set(linha.materialId, Number((atual + Number(linha.quantidade)).toFixed(4)))
      }
    }
    return mapa
  })()

  // Avaliacao em tempo real de estouro de orcamento e saldo fisico no modal
  const alertasModalPorMaterial = (() => {
    const listaEstouroOrcamento: Array<{
      materialId: string
      codigo: string
      descricao: string
      sigla: string
      solicitado: number
      orcado: number
      consumido: number
      saldoOrcamento: number
      excedentePrevisto: number
    }> = []

    const listaFaltaEstoque: Array<{
      materialId: string
      codigo: string
      descricao: string
      sigla: string
      solicitado: number
      disponivel: number
    }> = []

    for (const [materialId, qtdSolicitada] of mapaQtdSolicitadaModal.entries()) {
      const infoEstoque = mapaSaldoFisicoModal.get(materialId)
      const mat = infoEstoque?.material
      const codigo = mat?.codigo || 'MAT'
      const descricao = mat?.descricao || 'Material'
      const sigla = mat?.unidadeConsumo?.sigla || 'UN'
      const disponivel = infoEstoque ? Number(infoEstoque.disponivel) : 0

      if (infoEstoque && qtdSolicitada > disponivel) {
        listaFaltaEstoque.push({
          materialId,
          codigo,
          descricao,
          sigla,
          solicitado: qtdSolicitada,
          disponivel,
        })
      }

      const infoOrc = mapaDetalhesOrcamentoModal.get(materialId)
      if (infoOrc) {
        const totalPosPedido = Number(
          (infoOrc.quantidadeConsumida + qtdSolicitada).toFixed(4)
        )
        if (
          qtdSolicitada > infoOrc.saldoOrcamento ||
          totalPosPedido > infoOrc.quantidadeOrcada
        ) {
          listaEstouroOrcamento.push({
            materialId,
            codigo,
            descricao,
            sigla,
            solicitado: qtdSolicitada,
            orcado: infoOrc.quantidadeOrcada,
            consumido: infoOrc.quantidadeConsumida,
            saldoOrcamento: infoOrc.saldoOrcamento,
            excedentePrevisto: Number(
              Math.max(0, totalPosPedido - infoOrc.quantidadeOrcada).toFixed(4)
            ),
          })
        }
      }
    }

    return { listaEstouroOrcamento, listaFaltaEstoque }
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
    <main className="flex flex-col w-full min-h-screen bg-surface pb-28">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex flex-col gap-6">
        {/* Cabecalho Nativo iOS */}
        <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Controle de Canteiro
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-0.5">
              {ehEncarregado ? 'Minhas Requisicoes de Obra' : 'Requisicoes de Obra'}
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              {ehEncarregado
                ? 'Solicite materiais e ferramentas disponiveis no estoque da obra e acompanhe seus pedidos'
                : 'Atenda requisicoes com baixa automatica no estoque e exporte os registros atendidos para o SIENGE'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                <span>
                  {exportarSiengeMutation.isPending
                    ? 'Exportando CSV...'
                    : `Exportar para SIENGE (CSV)${qtdPendentesSienge > 0 ? ` [${qtdPendentesSienge}]` : ''}`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleAbrirModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Nova Requisicao</span>
            </button>
          </div>
        </div>

        {/* Mensagens de Feedback */}
        {mensagemFeedback && (
          <div className="bg-secondary-container text-on-secondary-container border border-secondary/20 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm">
            <span className="font-medium">{mensagemFeedback}</span>
            <button
              type="button"
              onClick={() => setMensagemFeedback(null)}
              className="text-on-secondary-container font-bold text-lg hover:opacity-70 px-1"
            >
              &times;
            </button>
          </div>
        )}

        {erroFeedback && (
          <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm">
            <span className="font-medium">{erroFeedback}</span>
            <button
              type="button"
              onClick={() => setErroFeedback(null)}
              className="text-on-error-container font-bold text-lg hover:opacity-70 px-1"
            >
              &times;
            </button>
          </div>
        )}

        {/* Summary Spark Card (Stitch Design) */}
        <div className="bg-surface-container-low rounded-2xl p-4 flex items-center justify-between shadow-sm border border-surface-container">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shadow-sm">
              <span className="material-symbols-outlined text-[22px]">pending_actions</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Pico matinal no Almoxarifado</p>
              <p className="text-xs text-on-surface-variant">
                Tempo médio de espera atual: 8 minutos • Separação rápida ativa
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-primary text-[22px]">bolt</span>
        </div>

        {/* Barra de Filtros: iOS Segmented Control + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* iOS Fluid Segmented Control */}
          <div className="bg-surface-container rounded-xl p-1 flex items-center gap-1 select-none shadow-inner overflow-x-auto">
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
                className={`flex-1 min-w-[76px] py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-all ${
                  filtroStatus === st.id
                    ? 'bg-surface-container-lowest text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Buscar por #101, obra, solicitante..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 sm:w-64 px-3.5 py-2 rounded-xl bg-surface-container-high focus:bg-surface-container-lowest border border-surface-container text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all"
            />

            <label className="inline-flex items-center gap-2 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-xl border border-surface-container cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ocultarAtendidas}
                onChange={(e) => setOcultarAtendidas(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
              <span>Ocultar ja atendidas</span>
            </label>

            {podeAtenderEExportar && (
              <select
                aria-label="Filtrar por status de exportacao SIENGE"
                value={filtroSienge}
                onChange={(e) => setFiltroSienge(e.target.value as any)}
                className="px-3 py-2 rounded-xl bg-surface-container-high border border-surface-container text-xs text-on-surface font-medium focus:outline-none"
              >
                <option value="TODAS">SIENGE: Todas</option>
                <option value="PENDENTES">SIENGE: Pendentes</option>
                <option value="EXPORTADAS">SIENGE: Exportadas</option>
              </select>
            )}
          </div>
        </div>

        {/* Lista de Requisicoes (Inset Grouped Cards) */}
        {carregandoRequisicoes ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">
            Carregando requisicoes...
          </div>
        ) : requisicoesFiltradas.length === 0 ? (
          <div className="bg-surface-container-lowest p-8 rounded-2xl text-center text-sm text-on-surface-variant border border-dashed border-surface-container">
            Nenhuma requisicao encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {requisicoesFiltradas.map((r) => {
              const statusConfig = badgeStatus(r.status)
              const podeCancelar =
                r.status === 'SOLICITADA' &&
                (usuario?.id === r.requisitanteId || podeAtenderEExportar)
              const podeAtender = r.status === 'SOLICITADA' && podeAtenderEExportar

              return (
                <div
                  key={r.id}
                  className="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 shadow-sm border border-surface-container hover:shadow-md transition-all flex flex-col gap-3"
                >
                  {/* Linha Superior: #REQ e Status */}
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm sm:text-base font-bold text-primary tracking-tight">
                        #{r.numeroSequencial}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-outline-variant" />
                      <span
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: statusConfig.bg, color: statusConfig.cor }}
                      >
                        {statusConfig.texto}
                      </span>

                      {podeAtenderEExportar && r.status === 'ATENDIDA' && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            r.exportadaSienge
                              ? 'bg-primary-fixed text-on-primary-fixed'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {r.exportadaSienge ? 'Exportada SIENGE' : 'Pendente Exportacao SIENGE'}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-on-surface-variant">
                      Solicitado em: {new Date(r.solicitadaEm).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Localizacao, Solicitante e Retirada */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-surface-container-low p-3 rounded-xl text-xs sm:text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[17px] text-primary">
                        apartment
                      </span>
                      <span className="text-on-surface-variant">Obra / Destino:</span>
                      <strong className="text-on-surface truncate">
                        {r.area?.obra?.codigo} &bull; {r.area?.nome}
                      </strong>
                    </div>

                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-[17px] text-primary">
                        engineering
                      </span>
                      <span className="text-on-surface-variant">Solicitante:</span>
                      <strong className="text-on-surface truncate">{r.requisitante?.nome}</strong>
                    </div>

                    {r.status === 'ATENDIDA' && r.retiradoPor && (
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[17px] text-secondary">
                          badge
                        </span>
                        <span className="text-on-surface-variant">Retirado na obra por:</span>
                        <strong className="text-secondary truncate">{r.retiradoPor}</strong>
                      </div>
                    )}
                  </div>

                  {/* Itens Requisitados */}
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-surface-container">
                    <div className="text-xs font-bold text-on-surface-variant mb-2 uppercase tracking-wide">
                      Itens da Requisicao ({r.itens.length}):
                    </div>
                    <ul className="m-0 pl-4 text-xs sm:text-sm text-on-surface space-y-1">
                      {r.itens.map((it) => {
                        const qtdSol = Number(it.quantidade)
                        const temEntregue =
                          it.quantidadeEntregue !== null && it.quantidadeEntregue !== undefined
                        const qtdEnt = temEntregue ? Number(it.quantidadeEntregue) : null

                        const obraItemId = r.area?.obra?.id || r.area?.obraId
                        const infoOrcCard =
                          obraItemId && it.materialId
                            ? mapaLimitesPorObraMaterial.get(`${obraItemId}:${it.materialId}`)
                            : undefined
                        const excedeLimiteCard = Boolean(
                          infoOrcCard &&
                            r.status !== 'CANCELADA' &&
                            (qtdSol > infoOrcCard.quantidadeOrcada ||
                              infoOrcCard.quantidadeConsumida > infoOrcCard.quantidadeOrcada)
                        )

                        return (
                          <li key={it.id}>
                            {it.material ? (
                              <span>
                                {r.status === 'ATENDIDA' && qtdEnt !== null ? (
                                  <span>
                                    <strong>
                                      Solicitado: {qtdSol} {it.material.unidadeConsumo.sigla} |
                                      Entregue: {qtdEnt} {it.material.unidadeConsumo.sigla}
                                    </strong>{' '}
                                    &mdash; {it.material.descricao}{' '}
                                    <span className="text-on-surface-variant">
                                      ({it.material.codigo})
                                    </span>
                                  </span>
                                ) : (
                                  <span>
                                    <strong>
                                      {qtdSol} {it.material.unidadeConsumo.sigla}
                                    </strong>{' '}
                                    &mdash; {it.material.descricao}{' '}
                                    <span className="text-on-surface-variant">
                                      ({it.material.codigo})
                                    </span>
                                  </span>
                                )}
                                {excedeLimiteCard && infoOrcCard && (
                                  <span className="ml-2 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[11px] font-bold">
                                    Excede Limite Orcado ({infoOrcCard.quantidadeOrcada}{' '}
                                    {it.material.unidadeConsumo.sigla})
                                  </span>
                                )}
                              </span>
                            ) : it.ferramenta ? (
                              <span>
                                <strong>1 un</strong> &mdash; {it.ferramenta.nome}{' '}
                                <span className="text-on-surface-variant">
                                  [Ferramenta cod: {it.ferramenta.codigo}]
                                </span>
                              </span>
                            ) : (
                              <span>Item nao especificado</span>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>

                  {/* Observações e Ações do Card */}
                  <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                    <span className="text-xs text-on-surface-variant italic truncate max-w-md">
                      {r.observacao ? `Obs: ${r.observacao}` : 'Sem observacoes adicionais'}
                    </span>

                    <div className="flex items-center gap-2 ml-auto">
                      {podeAtender && (
                        <button
                          type="button"
                          onClick={() => handleAbrirModalAtendimento(r)}
                          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold shadow-sm active:scale-95 transition-all"
                        >
                          Atender / Entregar Material
                        </button>
                      )}

                      {podeCancelar && (
                        <button
                          type="button"
                          disabled={cancelarRequisicaoMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Deseja cancelar a requisicao #${r.numeroSequencial}?`
                              )
                            ) {
                              cancelarRequisicaoMutation.mutate(r.id)
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-error-container text-on-error-container text-xs font-semibold hover:bg-error/20 active:scale-95 transition-all"
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
      </div>

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
            padding: '16px',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: '1rem', color: '#0f172a' }}>
              Atender Requisicao #{requisicaoEmAtendimento.numeroSequencial}
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#475569' }}>
              Confirme ou ajuste as quantidades entregues e informe o nome de quem esta retirando o material na obra.
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: '16px',
                fontSize: '0.875rem',
                color: '#334155',
              }}
            >
              <div>
                <strong>Obra / Area:</strong> {requisicaoEmAtendimento.area?.obra?.codigo} -{' '}
                {requisicaoEmAtendimento.area?.obra?.nome} &bull; {requisicaoEmAtendimento.area?.nome}
              </div>
              <div style={{ marginTop: '8px' }}>
                <strong>Solicitante:</strong> {requisicaoEmAtendimento.requisitante?.nome}
              </div>
            </div>

            {erroAtendimento && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '16px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroAtendimento}
              </div>
            )}

            <form onSubmit={handleSubmeterAtendimento} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 600 }}>
                  Itens e Quantidades Entregues
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {requisicaoEmAtendimento.itens.map((it) => {
                    const sigla = it.material?.unidadeConsumo?.sigla || 'UN'
                    return (
                      <div
                        key={it.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 140px',
                          gap: '16px',
                          alignItems: 'center',
                          backgroundColor: '#f8fafc',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                            {it.material
                              ? `${it.material.codigo} - ${it.material.descricao}`
                              : `${it.ferramenta?.codigo} - ${it.ferramenta?.nome}`}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                            Quantidade solicitada: <strong>{Number(it.quantidade)} {sigla}</strong>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '8px' }}>
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
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: it.ferramenta ? '#f1f5f9' : '#ffffff',
                              fontSize: '0.875rem',
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
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 600 }}>
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
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRequisicaoEmAtendimento(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 400,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={atenderRequisicaoMutation.isPending}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#15803d',
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
            padding: '16px',
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '32px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: '1rem', color: '#0f172a' }}>
              Nova Requisicao de Obra
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#475569' }}>
              Informe o destino da aplicacao e adicione os materiais (limitados ao saldo disponivel no estoque da obra) ou ferramentas.
            </p>

            {erroForm && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '16px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                  fontSize: '0.875rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroForm}
              </div>
            )}

            <form onSubmit={handleCriarRequisicao} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Selecao da Obra e Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
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
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.875rem',
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
                  <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
                    Area / Pavimento de Destino
                  </label>
                  <select
                    value={areaIdSelecionada}
                    onChange={(e) => setAreaIdSelecionada(e.target.value)}
                    required
                    disabled={!obraIdSelecionada}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: !obraIdSelecionada ? '#f1f5f9' : '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.875rem',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 600 }}>
                    Itens Solicitados
                  </label>
                  <button
                    type="button"
                    onClick={handleAdicionarItem}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0369a1',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    + Adicionar Outro Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {itensForm.map((linha, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          itensForm.length > 1
                            ? '105px minmax(0, 1fr) 88px 28px'
                            : '105px minmax(0, 1fr) 88px',
                        gap: '8px',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: '8px',
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
                          padding: '8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          fontSize: '0.875rem',
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
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              fontSize: '0.875rem',
                              color: '#0f172a',
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '0.875rem', color: '#475569', textAlign: 'center', display: 'block' }}>
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
                              color: '#b91c1c',
                              cursor: 'pointer',
                              fontWeight: 600,
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

                {/* Alertas em Tempo Real: Saldo Fisico e Limite de Orcamento da Engenharia */}
                {alertasModalPorMaterial.listaFaltaEstoque.length > 0 && (
                  <div
                    role="alert"
                    style={{
                      marginTop: '16px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '16px 16px',
                      color: '#991b1b',
                      fontSize: '0.875rem',
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '8px' }}>
                      Saldo fisico insuficiente no estoque da obra (Bloqueio de emissao):
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {alertasModalPorMaterial.listaFaltaEstoque.map((al) => (
                        <li key={al.materialId}>
                          <strong>
                            {al.codigo} - {al.descricao}:
                          </strong>{' '}
                          solicitado {al.solicitado} {al.sigla}, mas ha apenas{' '}
                          <strong>
                            {al.disponivel} {al.sigla}
                          </strong>{' '}
                          disponiveis no almoxarifado desta obra.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {alertasModalPorMaterial.listaEstouroOrcamento.length > 0 && (
                  <div
                    role="status"
                    style={{
                      marginTop: '16px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '6px',
                      padding: '16px 16px',
                      color: '#92400e',
                      fontSize: '0.875rem',
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: '8px' }}>
                      Alerta da Engenharia: Estouro de Orcamento Previsto na Obra
                    </strong>
                    <p style={{ margin: '0 0 8px', color: '#b45309' }}>
                      A quantidade solicitada ultrapassa o teto orcado pela Engenharia. O pedido
                      podera ser enviado se houver saldo fisico, mas ficara destacado no Painel de
                      Estouro de Orcamento:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      {alertasModalPorMaterial.listaEstouroOrcamento.map((al) => (
                        <li key={al.materialId}>
                          <strong>
                            {al.codigo} - {al.descricao}:
                          </strong>{' '}
                          solicitando {al.solicitado} {al.sigla} (Orcado: {al.orcado} {al.sigla} |
                          Ja consumido: {al.consumido} {al.sigla} | Saldo orcado restante:{' '}
                          {al.saldoOrcamento} {al.sigla} | Excedente: +{al.excedentePrevisto}{' '}
                          {al.sigla}).
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Observacao */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#334155', marginBottom: '8px', fontWeight: 400 }}>
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
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Botoes do Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalNovaRequisicaoAberto(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontWeight: 400,
                    fontSize: '0.875rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarRequisicaoMutation.isPending}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0369a1',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  {criarRequisicaoMutation.isPending ? 'Enviando...' : 'Enviar Requisicao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
