import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createOrcamentoObra,
  deleteOrcamentoObra,
  getMateriais,
  getObras,
  getOrcamentosObra,
  updateOrcamentoObra,
} from '../api/client'
import type {
  AtualizarOrcamentoObraInput,
  CriarOrcamentoObraInput,
  OrcamentoObraItem,
  StatusOrcamentoMaterial,
} from '../types/orcamento'
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

function badgeStatusOrcamento(status: StatusOrcamentoMaterial) {
  switch (status) {
    case 'ULTRAPASSADO':
      return {
        bg: '#fee2e2',
        cor: '#991b1b',
        borda: '#fecaca',
        barra: '#dc2626',
        texto: 'Orcamento Ultrapassado',
      }
    case 'ATENCAO':
      return {
        bg: '#fef3c7',
        cor: '#92400e',
        borda: '#fde68a',
        barra: '#d97706',
        texto: 'Em Atencao (>= 80%)',
      }
    case 'DENTRO_DO_LIMITE':
      return {
        bg: '#dcfce7',
        cor: '#166534',
        borda: '#bbf7d0',
        barra: '#16a34a',
        texto: 'Dentro do Limite',
      }
  }
}

export function OrcamentoObraPage() {
  const queryClient = useQueryClient()

  // Filtros
  const [obraIdFiltro, setObraIdFiltro] = useState<string>('')
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | StatusOrcamentoMaterial>('TODOS')
  const [busca, setBusca] = useState('')
  const [mensagemFeedback, setMensagemFeedback] = useState<string | null>(null)
  const [erroFeedback, setErroFeedback] = useState<string | null>(null)

  // Modal: Novo Limite Orcamentario
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [obraIdForm, setObraIdForm] = useState('')
  const [materialIdForm, setMaterialIdForm] = useState('')
  const [quantidadeOrcadaForm, setQuantidadeOrcadaForm] = useState('')
  const [observacaoForm, setObservacaoForm] = useState('')
  const [erroFormNovo, setErroFormNovo] = useState<string | null>(null)

  // Modal: Editar Limite Orcamentario
  const [orcamentoEmEdicao, setOrcamentoEmEdicao] = useState<OrcamentoObraItem | null>(null)
  const [novaQuantidadeEdicao, setNovaQuantidadeEdicao] = useState('')
  const [novaObservacaoEdicao, setNovaObservacaoEdicao] = useState('')
  const [erroFormEdicao, setErroFormEdicao] = useState<string | null>(null)

  // Queries
  const { data: obras = [] } = useQuery({
    queryKey: ['obras'],
    queryFn: () => getObras(false),
  })

  const { data: materiais = [] } = useQuery({
    queryKey: ['materiais-orcamento'],
    queryFn: () => getMateriais({ somenteAtivos: true }),
  })

  const { data: painel, isLoading: carregandoOrcamentos } = useQuery({
    queryKey: ['orcamentos-obra', obraIdFiltro],
    queryFn: () =>
      getOrcamentosObra({
        obraId: obraIdFiltro || undefined,
      }),
  })

  const todosItens = painel?.itens ?? []
  const resumo = painel?.resumo ?? {
    totalItensOrcados: 0,
    totalUltrapassados: 0,
    totalEmAtencao: 0,
    totalDentroDoLimite: 0,
  }

  // Itens que ultrapassaram o limite (para o painel de controle de estouro da Engenharia)
  const itensUltrapassados = todosItens.filter((it) => it.statusOrcamento === 'ULTRAPASSADO')

  // Aplicacao de filtros locais de status e busca textual
  const itensFiltrados = todosItens.filter((it) => {
    if (statusFiltro !== 'TODOS' && it.statusOrcamento !== statusFiltro) {
      return false
    }

    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    const matCod = it.material.codigo.toLowerCase()
    const matDesc = it.material.descricao.toLowerCase()
    const obraNome = it.obra.nome.toLowerCase()
    const obraCod = it.obra.codigo.toLowerCase()
    const obs = (it.observacao || '').toLowerCase()

    return (
      matCod.includes(termo) ||
      matDesc.includes(termo) ||
      obraNome.includes(termo) ||
      obraCod.includes(termo) ||
      obs.includes(termo)
    )
  })

  // Mutations
  const criarMutation = useMutation({
    mutationFn: (dados: CriarOrcamentoObraInput) => createOrcamentoObra(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos-obra'] })
      queryClient.invalidateQueries({ queryKey: ['limites-orcamento-obra'] })
      setModalNovoAberto(false)
      limparFormNovo()
      setErroFeedback(null)
      setMensagemFeedback('Limite orcamentario cadastrado com sucesso para a obra.')
    },
    onError: (err: any) => {
      setErroFormNovo(extrairErro(err, 'Erro ao cadastrar limite orcamentario'))
    },
  })

  const atualizarMutation = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: AtualizarOrcamentoObraInput }) =>
      updateOrcamentoObra(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos-obra'] })
      queryClient.invalidateQueries({ queryKey: ['limites-orcamento-obra'] })
      setOrcamentoEmEdicao(null)
      setErroFormEdicao(null)
      setErroFeedback(null)
      setMensagemFeedback('Limite orcamentario atualizado com sucesso.')
    },
    onError: (err: any) => {
      setErroFormEdicao(extrairErro(err, 'Erro ao atualizar limite orcamentario'))
    },
  })

  const removerMutation = useMutation({
    mutationFn: (id: string) => deleteOrcamentoObra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos-obra'] })
      queryClient.invalidateQueries({ queryKey: ['limites-orcamento-obra'] })
      setErroFeedback(null)
      setMensagemFeedback('Limite orcamentario removido da obra.')
    },
    onError: (err: any) => {
      setErroFeedback(extrairErro(err, 'Nao foi possivel remover o limite orcamentario'))
    },
  })

  function limparFormNovo() {
    setObraIdForm(obraIdFiltro || '')
    setMaterialIdForm('')
    setQuantidadeOrcadaForm('')
    setObservacaoForm('')
    setErroFormNovo(null)
  }

  function handleAbrirModalNovo() {
    limparFormNovo()
    setModalNovoAberto(true)
  }

  function handleSubmeterNovo(e: FormEvent) {
    e.preventDefault()
    setErroFormNovo(null)

    if (!obraIdForm) {
      setErroFormNovo('Selecione a obra')
      return
    }
    if (!materialIdForm) {
      setErroFormNovo('Selecione o material')
      return
    }
    const qtd = parseFloat(quantidadeOrcadaForm)
    if (isNaN(qtd) || qtd <= 0) {
      setErroFormNovo('Informe uma quantidade orcada maior que zero')
      return
    }

    criarMutation.mutate({
      obraId: obraIdForm,
      materialId: materialIdForm,
      quantidadeOrcada: qtd,
      observacao: observacaoForm.trim() || undefined,
    })
  }

  function handleAbrirEdicao(item: OrcamentoObraItem) {
    setOrcamentoEmEdicao(item)
    setNovaQuantidadeEdicao(String(item.quantidadeOrcada))
    setNovaObservacaoEdicao(item.observacao || '')
    setErroFormEdicao(null)
  }

  function handleSubmeterEdicao(e: FormEvent) {
    e.preventDefault()
    if (!orcamentoEmEdicao) return
    setErroFormEdicao(null)

    const qtd = parseFloat(novaQuantidadeEdicao)
    if (isNaN(qtd) || qtd <= 0) {
      setErroFormEdicao('Informe uma quantidade orcada maior que zero')
      return
    }

    atualizarMutation.mutate({
      id: orcamentoEmEdicao.id,
      dados: {
        quantidadeOrcada: qtd,
        observacao: novaObservacaoEdicao.trim() || null,
      },
    })
  }

  return (
    <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
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
            Controle de Orcamento por Obra
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            Painel da Engenharia e Administracao para definir limites de materiais por obra e monitorar estouros de consumo
          </p>
        </div>

        <button
          type="button"
          onClick={handleAbrirModalNovo}
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
          + Definir Limite de Material
        </button>
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

      {/* Cards de Indicadores (KPIs) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.15rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>MATERIAIS ORCADOS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', marginTop: '0.3rem' }}>
            {resumo.totalItensOrcados}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Limites configurados por obra
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            padding: '1.15rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>DENTRO DO LIMITE</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#15803d', marginTop: '0.3rem' }}>
            {resumo.totalDentroDoLimite}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
            Consumo abaixo de 80% do orcado
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #fde68a',
            padding: '1.15rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>EM ATENCAO (80% A 100%)</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#d97706', marginTop: '0.3rem' }}>
            {resumo.totalEmAtencao}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
            Proximos de atingir o teto da obra
          </div>
        </div>

        <div
          style={{
            backgroundColor: resumo.totalUltrapassados > 0 ? '#fef2f2' : '#ffffff',
            borderRadius: '8px',
            border: `1px solid ${resumo.totalUltrapassados > 0 ? '#f87171' : '#e2e8f0'}`,
            padding: '1.15rem',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 700 }}>
            ORCAMENTO ULTRAPASSADO
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#dc2626', marginTop: '0.3rem' }}>
            {resumo.totalUltrapassados}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#7f1d1d', marginTop: '0.2rem' }}>
            Materiais que excederam o limite
          </div>
        </div>
      </div>

      {/* Painel de Controle de Estouro para Engenharia (exibido quando ha itens ultrapassados) */}
      {itensUltrapassados.length > 0 && (
        <div
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fda4af',
            borderRadius: '8px',
            padding: '1.15rem 1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '0.65rem',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', color: '#9f1239' }}>
                Controle da Engenharia: Materiais com Limite Ultrapassado ({itensUltrapassados.length})
              </h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#881337' }}>
                Estes materiais tiveram requisicoes que superaram a quantidade orcada para a obra. Avalie a necessidade de aditivo orcamentario ou auditoria de aplicacao.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStatusFiltro(statusFiltro === 'ULTRAPASSADO' ? 'TODOS' : 'ULTRAPASSADO')}
              style={{
                backgroundColor: '#be123c',
                color: '#ffffff',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {statusFiltro === 'ULTRAPASSADO' ? 'Mostrar Todos os Materiais' : 'Filtrar Apenas Ultrapassados'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
            {itensUltrapassados.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #fecdd3',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.83rem',
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {item.material.codigo} - {item.material.descricao}
                </div>
                <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                  Obra: <strong>{item.obra.codigo} - {item.obra.nome}</strong>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '0.45rem',
                    paddingTop: '0.45rem',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <span>
                    Limite: <strong>{item.quantidadeOrcada} {item.material.unidadeConsumo.sigla}</strong>
                  </span>
                  <span>
                    Consumido: <strong>{item.quantidadeConsumida} {item.material.unidadeConsumo.sigla}</strong>
                  </span>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>
                    +{item.excedente} {item.material.unidadeConsumo.sigla} ({item.percentualConsumido}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros de Obra, Status e Busca */}
      <div
        style={{
          display: 'flex',
          gap: '0.85rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <select
          aria-label="Filtrar por obra"
          value={obraIdFiltro}
          onChange={(e) => setObraIdFiltro(e.target.value)}
          style={{
            padding: '0.6rem 0.85rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontSize: '0.88rem',
            minWidth: '220px',
          }}
        >
          <option value="">Todas as Obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.codigo} - {o.nome}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Buscar por codigo, material, obra ou observacao..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{
            flex: '1',
            minWidth: '240px',
            padding: '0.6rem 1rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontSize: '0.88rem',
          }}
        />

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'ULTRAPASSADO', label: 'Ultrapassados' },
            { id: 'ATENCAO', label: 'Em Atencao' },
            { id: 'DENTRO_DO_LIMITE', label: 'Dentro do Limite' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFiltro(st.id as any)}
              style={{
                padding: '0.48rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: statusFiltro === st.id ? '#0284c7' : '#cbd5e1',
                backgroundColor: statusFiltro === st.id ? '#0284c7' : '#ffffff',
                color: statusFiltro === st.id ? '#ffffff' : '#475569',
                cursor: 'pointer',
                fontSize: '0.83rem',
                fontWeight: statusFiltro === st.id ? 600 : 400,
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Painel Grafico Comparativo (Orcado vs. Consumido) */}
      {itensFiltrados.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>
                Grafico Comparativo: Limite Orcado vs. Consumo Realizado
              </h2>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Acompanhamento visual de cada material em relacao ao teto definido pela Engenharia (100% = limite orcado)
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#475569' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#16a34a', display: 'inline-block' }} />
                Dentro do Limite (&lt; 80%)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#d97706', display: 'inline-block' }} />
                Em Atencao (80% - 100%)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#dc2626', display: 'inline-block' }} />
                Ultrapassado (&gt; 100%)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {itensFiltrados.map((it) => {
              const cfg = badgeStatusOrcamento(it.statusOrcamento)
              const sigla = it.material.unidadeConsumo.sigla
              const larguraBarra = Math.min(100, Math.max(2, it.percentualConsumido))

              return (
                <div key={`grafico-${it.id}`} style={{ fontSize: '0.83rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>
                        {it.material.codigo} - {it.material.descricao}
                      </strong>{' '}
                      <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                        [{it.obra.codigo} - {it.obra.nome}]
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: '#334155' }}>
                        Consumido: <strong>{it.quantidadeConsumida} {sigla}</strong> / Limite:{' '}
                        <strong>{it.quantidadeOrcada} {sigla}</strong>
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: cfg.cor,
                          backgroundColor: cfg.bg,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.76rem',
                        }}
                      >
                        {it.percentualConsumido}%
                        {it.excedente > 0 ? ` (+${it.excedente} ${sigla} acima do limite)` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso Visual */}
                  <div
                    style={{
                      width: '100%',
                      height: '12px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div
                      style={{
                        width: `${larguraBarra}%`,
                        height: '100%',
                        backgroundColor: cfg.barra,
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabela Detalhada de Orcamento por Obra */}
      {carregandoOrcamentos ? (
        <p style={{ color: '#64748b' }}>Carregando limites orcamentarios...</p>
      ) : itensFiltrados.length === 0 ? (
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
          Nenhum limite orcamentario encontrado para os filtros selecionados.
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Obra</th>
                <th style={{ padding: '0.85rem 1rem' }}>Material</th>
                <th style={{ padding: '0.85rem 1rem' }}>Limite Orcado</th>
                <th style={{ padding: '0.85rem 1rem' }}>Entregue / Pendente</th>
                <th style={{ padding: '0.85rem 1rem' }}>Total Consumido</th>
                <th style={{ padding: '0.85rem 1rem' }}>Saldo / Excedente</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {itensFiltrados.map((it) => {
                const cfg = badgeStatusOrcamento(it.statusOrcamento)
                const sigla = it.material.unidadeConsumo.sigla

                return (
                  <tr
                    key={it.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: it.statusOrcamento === 'ULTRAPASSADO' ? '#fffafb' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '0.85rem 1rem', color: '#0f172a' }}>
                      <div style={{ fontWeight: 600 }}>{it.obra.codigo}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{it.obra.nome}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#0f172a' }}>
                      <div style={{ fontWeight: 600 }}>
                        {it.material.codigo} - {it.material.descricao}
                      </div>
                      {it.observacao && (
                        <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '0.15rem' }}>
                          Obs: {it.observacao}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0369a1' }}>
                      {it.quantidadeOrcada} {sigla}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                      <div>Entregue: <strong>{it.quantidadeEntregue} {sigla}</strong></div>
                      <div>Pendente: <strong>{it.quantidadePendente} {sigla}</strong></div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      {it.quantidadeConsumida} {sigla} ({it.percentualConsumido}%)
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {it.excedente > 0 ? (
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>
                          Excedeu +{it.excedente} {sigla}
                        </span>
                      ) : (
                        <span style={{ color: '#15803d', fontWeight: 600 }}>
                          Restam {it.saldoOrcamento} {sigla}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span
                        style={{
                          backgroundColor: cfg.bg,
                          color: cfg.cor,
                          border: `1px solid ${cfg.borda}`,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cfg.texto}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => handleAbrirEdicao(it)}
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          padding: '0.32rem 0.65rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          marginRight: '0.4rem',
                        }}
                      >
                        Editar Limite
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Deseja remover o limite orcamentario de ${it.material.descricao} na obra ${it.obra.nome}?`
                            )
                          ) {
                            removerMutation.mutate(it.id)
                          }
                        }}
                        style={{
                          backgroundColor: '#fff1f2',
                          color: '#e11d48',
                          border: '1px solid #fecdd3',
                          padding: '0.32rem 0.65rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 500,
                        }}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: DEFINIR NOVO LIMITE DE MATERIAL NA OBRA */}
      {modalNovoAberto && (
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
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem', color: '#0f172a' }}>
              Definir Limite de Material por Obra
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Configure a quantidade maxima orcada para o material na obra selecionada.
            </p>

            {erroFormNovo && (
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
                {erroFormNovo}
              </div>
            )}

            <form onSubmit={handleSubmeterNovo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Obra
                </label>
                <select
                  aria-label="Selecionar obra para orcamento"
                  value={obraIdForm}
                  onChange={(e) => setObraIdForm(e.target.value)}
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
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Material
                </label>
                <SeletorItemPesquisavel
                  itens={materiais.map((m) => ({
                    id: m.id,
                    codigo: m.codigo,
                    descricao: m.descricao,
                    unidade: m.unidadeConsumo?.sigla,
                    detalheExtra: m.categoria?.nome ? `Categoria: ${m.categoria.nome}` : undefined,
                  }))}
                  valorSelecionadoId={materialIdForm}
                  onSelecionar={(id) => setMaterialIdForm(id)}
                  placeholder="Digite o codigo ou descricao do material..."
                  obrigatorio
                  labelAria="Selecionar material para orcamento"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Quantidade Limite Orcada
                </label>
                <input
                  aria-label="Quantidade limite orcada"
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  placeholder="ex: 200"
                  value={quantidadeOrcadaForm}
                  onChange={(e) => setQuantidadeOrcadaForm(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Observacao (opcional)
                </label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder="ex: Previsto no cronograma estrutural base"
                  value={observacaoForm}
                  onChange={(e) => setObservacaoForm(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
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
                  disabled={criarMutation.isPending}
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
                  {criarMutation.isPending ? 'Salvando...' : 'Salvar Limite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR LIMITE ORCAMENTARIO */}
      {orcamentoEmEdicao && (
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
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h2 style={{ margin: '0 0 0.35rem', fontSize: '1.2rem', color: '#0f172a' }}>
              Editar Limite Orcamentario
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.84rem', color: '#64748b' }}>
              {orcamentoEmEdicao.obra.codigo} - {orcamentoEmEdicao.obra.nome} &bull;{' '}
              <strong>{orcamentoEmEdicao.material.descricao}</strong>
            </p>

            {erroFormEdicao && (
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
                {erroFormEdicao}
              </div>
            )}

            <form onSubmit={handleSubmeterEdicao} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Nova Quantidade Limite ({orcamentoEmEdicao.material.unidadeConsumo.sigla})
                </label>
                <input
                  aria-label="Nova quantidade limite"
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={novaQuantidadeEdicao}
                  onChange={(e) => setNovaQuantidadeEdicao(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Observacao
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={novaObservacaoEdicao}
                  onChange={(e) => setNovaObservacaoEdicao(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setOrcamentoEmEdicao(null)}
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
                  disabled={atualizarMutation.isPending}
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
                  {atualizarMutation.isPending ? 'Atualizando...' : 'Salvar Alteracoes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
