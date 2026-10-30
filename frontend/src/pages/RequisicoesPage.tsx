import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelarRequisicao,
  createRequisicao,
  getAreasObra,
  getFerramentas,
  getMateriais,
  getObras,
  getRequisicoes,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { CriarRequisicaoInput, StatusRequisicao } from '../types/requisicao'

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

export function RequisicoesPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODAS')

  // Modal Nova Requisicao
  const [modalNovaRequisicaoAberto, setModalNovaRequisicaoAberto] = useState(false)
  const [obraIdSelecionada, setObraIdSelecionada] = useState('')
  const [areaIdSelecionada, setAreaIdSelecionada] = useState('')
  const [observacao, setObservacao] = useState('')
  const [itensForm, setItensForm] = useState<ItemLinhaForm[]>([
    { tipo: 'MATERIAL', materialId: '', ferramentaId: '', quantidade: 1 },
  ])
  const [chaveIdempotencia, setChaveIdempotencia] = useState(gerarChaveIdempotencia())
  const [erroForm, setErroForm] = useState<string | null>(null)

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

  const { data: materiais = [] } = useQuery({
    queryKey: ['materiais'],
    queryFn: () => getMateriais({ somenteAtivos: true }),
  })

  const { data: ferramentas = [] } = useQuery({
    queryKey: ['ferramentas-disponiveis'],
    queryFn: () => getFerramentas({ status: 'DISPONIVEL', somenteAtivas: true }),
  })

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

  const cancelarRequisicaoMutation = useMutation({
    mutationFn: (id: string) => cancelarRequisicao(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
    },
    onError: (err: any) => {
      alert(extrairErro(err, 'Nao foi possivel cancelar a requisicao'))
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

    // Validar se cada item tem selecao
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

  // Filtragem
  const requisicoesFiltradas = requisicoes.filter((r) => {
    if (filtroStatus !== 'TODAS' && r.status !== filtroStatus) {
      return false
    }

    if (!busca.trim()) return true

    const termo = busca.toLowerCase()
    const num = `#${r.numeroSequencial}`
    const obraNome = r.area?.obra?.nome?.toLowerCase() || ''
    const areaNome = r.area?.nome?.toLowerCase() || ''
    const reqNome = r.requisitante?.nome?.toLowerCase() || ''
    const obs = r.observacao?.toLowerCase() || ''

    return (
      num.includes(termo) ||
      obraNome.includes(termo) ||
      areaNome.includes(termo) ||
      reqNome.includes(termo) ||
      obs.includes(termo)
    )
  })

  const ehEncarregado = usuario?.perfil === 'ENCARREGADO'

  function badgeStatus(status: StatusRequisicao) {
    switch (status) {
      case 'SOLICITADA':
        return { bg: '#fef3c7', cor: '#92400e', texto: 'Aguardando Almoxarifado' }
      case 'EM_SEPARACAO':
        return { bg: '#e0f2fe', cor: '#0369a1', texto: 'Em Separacao' }
      case 'PRONTA':
        return { bg: '#dcfce7', cor: '#166534', texto: 'Pronta para Retirada' }
      case 'ATENDIDA':
        return { bg: '#f1f5f9', cor: '#475569', texto: 'Atendida / Entregue' }
      case 'CANCELADA':
        return { bg: '#fee2e2', cor: '#991b1b', texto: 'Cancelada' }
    }
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
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
              ? 'Solicite materiais e ferramentas para o seu canteiro e acompanhe o status de retirada'
              : 'Gerencie e atenda os pedidos de materiais e ferramentas solicitados pelos encarregados'}
          </p>
        </div>

        <button
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

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Buscar por numero (#101), obra, pavimento ou solicitante..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            flex: '1',
            minWidth: '260px',
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontSize: '0.9rem',
          }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'TODAS', label: 'Todas' },
            { id: 'SOLICITADA', label: 'Solicitadas' },
            { id: 'EM_SEPARACAO', label: 'Em Separacao' },
            { id: 'PRONTA', label: 'Prontas' },
            { id: 'ATENDIDA', label: 'Atendidas' },
            { id: 'CANCELADA', label: 'Canceladas' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFiltroStatus(st.id)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filtroStatus === st.id ? '#0284c7' : '#cbd5e1',
                backgroundColor: filtroStatus === st.id ? '#0284c7' : '#ffffff',
                color: filtroStatus === st.id ? '#ffffff' : '#475569',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: filtroStatus === st.id ? 600 : 400,
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
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
              (usuario?.id === r.requisitanteId || usuario?.perfil === 'ADMIN' || usuario?.perfil === 'ALMOXARIFE')

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Solicitado em: {new Date(r.solicitadaEm).toLocaleString('pt-BR')}
                  </div>
                </div>

                {/* Localizacao e Solicitante */}
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
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
                </div>

                {/* Destaque quando pronta para retirada */}
                {r.status === 'PRONTA' && r.codigoRetirada && (
                  <div
                    style={{
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <span style={{ color: '#166534', fontWeight: 600, display: 'block', fontSize: '0.85rem' }}>
                        Retirada Disponivel no Almoxarifado
                      </span>
                      <span style={{ color: '#15803d', fontSize: '0.8rem' }}>
                        Apresente este codigo no balcao de retirada:
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        backgroundColor: '#ffffff',
                        padding: '0.3rem 0.8rem',
                        borderRadius: '4px',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        letterSpacing: '1px',
                      }}
                    >
                      {r.codigoRetirada}
                    </div>
                  </div>
                )}

                {/* Itens da Requisicao */}
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>
                    Itens Solicitados ({r.itens.length}):
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#334155' }}>
                    {r.itens.map((it) => (
                      <li key={it.id} style={{ marginBottom: '0.2rem' }}>
                        {it.material ? (
                          <>
                            <strong>{it.quantidade} {it.material.unidadeConsumo.sigla}</strong> &mdash;{' '}
                            {it.material.descricao} <span style={{ color: '#64748b' }}>({it.material.codigo})</span>
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
                    ))}
                  </ul>
                </div>

                {/* Observacao e Acoes */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: r.observacao ? 'normal' : 'italic' }}>
                    {r.observacao ? `Obs: ${r.observacao}` : 'Sem observacoes adicionais'}
                  </div>

                  {podeCancelar && (
                    <button
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
            )
          })}
        </div>
      )}

      {/* Modal: Nova Requisicao */}
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
              maxWidth: '650px',
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
              Informe o destino da aplicacao e adicione os materiais ou ferramentas necessarios.
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
                        gridTemplateColumns: '110px 1fr 100px 32px',
                        gap: '0.5rem',
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
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

                      {/* Select Item */}
                      {linha.tipo === 'MATERIAL' ? (
                        <select
                          value={linha.materialId}
                          onChange={(e) => handleAtualizarItem(idx, 'materialId', e.target.value)}
                          required
                          style={{
                            padding: '0.45rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            fontSize: '0.8rem',
                            color: '#0f172a',
                          }}
                        >
                          <option value="">Selecione o material...</option>
                          {materiais.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.codigo} - {m.descricao} ({m.unidadeConsumo.sigla})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={linha.ferramentaId}
                          onChange={(e) => handleAtualizarItem(idx, 'ferramentaId', e.target.value)}
                          required
                          style={{
                            padding: '0.45rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            fontSize: '0.8rem',
                            color: '#0f172a',
                          }}
                        >
                          <option value="">Selecione a ferramenta...</option>
                          {ferramentas.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.codigo} - {f.nome}
                            </option>
                          ))}
                        </select>
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
                      <div>
                        {itensForm.length > 1 && (
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
                        )}
                      </div>
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
                    boxSizing: 'border-box',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              {/* Botoes de Acao */}
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
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarRequisicaoMutation.isPending}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {criarRequisicaoMutation.isPending ? 'Enviando Pedido...' : 'Enviar Requisicao'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
