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
        badgeClass: 'ob-badge--crit',
        texto: 'Orcamento Ultrapassado',
      }
    case 'ATENCAO':
      return {
        badgeClass: 'ob-badge--low',
        texto: 'Em Atencao (>= 80%)',
      }
    case 'DENTRO_DO_LIMITE':
      return {
        badgeClass: 'ob-badge--ok',
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
    <main className="flex flex-col relative w-full pt-4 pb-24 bg-surface max-w-5xl mx-auto px-4 md:px-6 font-body text-on-surface">
      {/* Cabecalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container shadow-sm mb-2">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-caption-1 font-semibold text-on-surface tracking-tight">Engenharia &amp; Custos</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Controle de Orcamento por Obra
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Painel da Engenharia e Administracao para definir limites de materiais por obra e monitorar estouros de consumo
          </p>
        </div>

        <button
          type="button"
          onClick={handleAbrirModalNovo}
          className="h-11 px-5 bg-primary text-on-primary rounded-xl font-headline text-headline flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          + Definir Limite de Material
        </button>
      </div>

      {/* Mensagens de Feedback */}
      {mensagemFeedback && (
        <div className="bg-surface-container-lowest border border-secondary/30 text-secondary rounded-xl p-4 mb-4 shadow-sm flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span>{mensagemFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensagemFeedback(null)}
            className="text-secondary hover:opacity-75 font-bold cursor-pointer text-base"
          >
            &times;
          </button>
        </div>
      )}

      {erroFeedback && (
        <div className="bg-error-container/20 border border-error/30 text-error rounded-xl p-4 mb-4 shadow-sm flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{erroFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setErroFeedback(null)}
            className="text-error hover:opacity-75 font-bold cursor-pointer text-base"
          >
            &times;
          </button>
        </div>
      )}

      {/* Cards de Indicadores (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-caption-2 font-semibold text-on-surface-variant uppercase tracking-wider">MATERIAIS ORCADOS</span>
            <span className="material-symbols-outlined text-primary text-[20px]">inventory</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-on-surface mt-2">
            {resumo.totalItensOrcados}
          </div>
          <div className="text-caption-2 text-on-surface-variant mt-1">
            Limites configurados por obra
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-caption-2 font-semibold text-secondary uppercase tracking-wider">DENTRO DO LIMITE</span>
            <span className="material-symbols-outlined text-secondary text-[20px]">verified</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-secondary mt-2">
            {resumo.totalDentroDoLimite}
          </div>
          <div className="text-caption-2 text-on-surface-variant mt-1">
            Consumo abaixo de 80% do orcado
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-surface-container flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-caption-2 font-semibold text-tertiary uppercase tracking-wider">EM ATENCAO (80% A 100%)</span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">warning</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-tertiary mt-2">
            {resumo.totalEmAtencao}
          </div>
          <div className="text-caption-2 text-on-surface-variant mt-1">
            Proximos de atingir o teto da obra
          </div>
        </div>

        <div className={`rounded-xl p-4 shadow-sm border flex flex-col justify-between ${resumo.totalUltrapassados > 0 ? 'bg-error-container/20 border-error/30' : 'bg-surface-container-lowest border-surface-container'}`}>
          <div className="flex items-center justify-between">
            <span className="text-caption-2 font-bold text-error uppercase tracking-wider">ORCAMENTO ULTRAPASSADO</span>
            <span className="material-symbols-outlined text-error text-[20px]">report_problem</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-error mt-2">
            {resumo.totalUltrapassados}
          </div>
          <div className="text-caption-2 text-error/80 mt-1 font-medium">
            Materiais que excederam o limite
          </div>
        </div>
      </div>

      {/* Painel de Controle de Estouro para Engenharia */}
      {itensUltrapassados.length > 0 && (
        <div className="bg-error-container/20 border border-error/30 rounded-xl p-4 sm:p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[20px]">error</span>
                <h2 className="text-base font-bold text-error">
                  Controle da Engenharia: Materiais com Limite Ultrapassado ({itensUltrapassados.length})
                </h2>
              </div>
              <p className="text-caption-1 text-on-surface-variant mt-1">
                Estes materiais tiveram requisicoes que superaram a quantidade orcada para a obra. Avalie a necessidade de aditivo orcamentario ou auditoria de aplicacao.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStatusFiltro(statusFiltro === 'ULTRAPASSADO' ? 'TODOS' : 'ULTRAPASSADO')}
              className="h-9 px-3.5 bg-error text-on-error rounded-lg font-caption-1 font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
            >
              {statusFiltro === 'ULTRAPASSADO' ? 'Mostrar Todos os Materiais' : 'Filtrar Apenas Ultrapassados'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {itensUltrapassados.map((item) => (
              <div
                key={item.id}
                className="bg-surface-container-lowest border border-error/20 rounded-xl p-3.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-headline text-headline text-on-surface">
                    {item.material.codigo} - {item.material.descricao}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-error/15 text-error font-caption-2 font-bold tracking-tight whitespace-nowrap">
                    +{item.excedente} {item.material.unidadeConsumo.sigla} ({item.percentualConsumido}%)
                  </span>
                </div>
                <div className="text-caption-1 text-on-surface-variant mt-1">
                  Obra: <strong>{item.obra.codigo} - {item.obra.nome}</strong>
                </div>
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-surface-container text-caption-1 text-on-surface-variant">
                  <span>
                    Limite: <strong className="text-on-surface">{item.quantidadeOrcada} {item.material.unidadeConsumo.sigla}</strong>
                  </span>
                  <span>
                    Consumido: <strong className="text-error">{item.quantidadeConsumida} {item.material.unidadeConsumo.sigla}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros de Obra, Status e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-stretch sm:items-center">
        <select
          aria-label="Filtrar por obra"
          value={obraIdFiltro}
          onChange={(e) => setObraIdFiltro(e.target.value)}
          className="h-10 px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-on-surface font-caption-1 font-medium shadow-sm outline-none focus:border-primary"
        >
          <option value="">Todas as Obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.codigo} - {o.nome}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Buscar por codigo, material, obra ou observacao..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-container-lowest border border-surface-container text-on-surface text-caption-1 shadow-sm outline-none focus:border-primary"
          />
        </div>

        <div className="flex p-1 bg-surface-container rounded-xl gap-1 overflow-x-auto">
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
              className={`h-8 px-3 rounded-lg text-caption-1 font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFiltro === st.id
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Painel Grafico Comparativo (Orcado vs. Consumido) */}
      {itensFiltrados.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-4 sm:p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">bar_chart</span>
                <h2 className="text-base font-bold text-on-surface">
                  Grafico Comparativo: Limite Orcado vs. Consumo Realizado
                </h2>
              </div>
              <p className="text-caption-1 text-on-surface-variant mt-0.5">
                Acompanhamento visual de cada material em relacao ao teto definido pela Engenharia (100% = limite orcado)
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-caption-2 text-on-surface-variant font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                Dentro do Limite (&lt; 80%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
                Em Atencao (80% - 100%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-error" />
                Ultrapassado (&gt; 100%)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {itensFiltrados.map((it) => {
              const cfg = badgeStatusOrcamento(it.statusOrcamento)
              const sigla = it.material.unidadeConsumo.sigla
              const larguraBarra = Math.min(100, Math.max(2, it.percentualConsumido))
              const isOver = it.statusOrcamento === 'ULTRAPASSADO'
              const isWarning = it.statusOrcamento === 'ATENCAO'

              return (
                <div key={`grafico-${it.id}`} className="p-3 rounded-lg bg-surface-container-low">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-headline text-headline text-on-surface font-semibold">
                        {it.material.codigo} - {it.material.descricao}
                      </span>{' '}
                      <span className="text-caption-1 text-on-surface-variant">
                        [{it.obra.codigo} - {it.obra.nome}]
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-caption-1 text-on-surface-variant">
                        Consumido: <strong className="text-on-surface">{it.quantidadeConsumida} {sigla}</strong> / Limite:{' '}
                        <strong className="text-on-surface">{it.quantidadeOrcada} {sigla}</strong>
                      </span>
                      <span
                        className={`ob-badge ${cfg.badgeClass} font-mono font-bold whitespace-nowrap`}
                      >
                        {it.percentualConsumido}%
                        {it.excedente > 0 ? ` (+${it.excedente} ${sigla} acima do limite)` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso Visual Gradiente Stitch */}
                  <div className="relative w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        isOver
                          ? 'bg-gradient-to-r from-error via-error to-error-container'
                          : isWarning
                            ? 'bg-gradient-to-r from-tertiary-fixed-dim via-tertiary-container to-tertiary'
                            : 'bg-gradient-to-r from-secondary-fixed-dim via-secondary to-secondary'
                      }`}
                      style={{ width: `${larguraBarra}%` }}
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
        <div className="p-8 text-center text-on-surface-variant">Carregando limites orcamentarios...</div>
      ) : itensFiltrados.length === 0 ? (
        <div className="bg-surface-container-lowest p-8 rounded-xl text-center text-on-surface-variant border border-surface-container">
          Nenhum limite orcamentario encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-caption-1">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-container text-left text-on-surface-variant font-semibold">
                  <th className="p-3.5">Obra</th>
                  <th className="p-3.5">Material</th>
                  <th className="p-3.5">Limite Orcado</th>
                  <th className="p-3.5">Entregue / Pendente</th>
                  <th className="p-3.5">Total Consumido</th>
                  <th className="p-3.5">Saldo / Excedente</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {itensFiltrados.map((it) => {
                  const cfg = badgeStatusOrcamento(it.statusOrcamento)
                  const sigla = it.material.unidadeConsumo.sigla

                  return (
                    <tr
                      key={it.id}
                      className={it.statusOrcamento === 'ULTRAPASSADO' ? 'bg-error-container/10' : 'hover:bg-surface-container-low/50 transition-colors'}
                    >
                      <td className="p-3.5 text-on-surface">
                        <div className="font-semibold">{it.obra.codigo}</div>
                        <div className="text-caption-2 text-on-surface-variant">{it.obra.nome}</div>
                      </td>
                      <td className="p-3.5 text-on-surface">
                        <div className="font-semibold">
                          {it.material.codigo} - {it.material.descricao}
                        </div>
                        {it.observacao && (
                          <div className="text-caption-2 text-on-surface-variant mt-0.5">
                            Obs: {it.observacao}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-primary">
                        {it.quantidadeOrcada} {sigla}
                      </td>
                      <td className="p-3.5 text-on-surface-variant text-caption-2">
                        <div>Entregue: <strong className="text-on-surface">{it.quantidadeEntregue} {sigla}</strong></div>
                        <div>Pendente: <strong className="text-on-surface">{it.quantidadePendente} {sigla}</strong></div>
                      </td>
                      <td className="p-3.5 font-semibold text-on-surface">
                        {it.quantidadeConsumida} {sigla} ({it.percentualConsumido}%)
                      </td>
                      <td className="p-3.5">
                        {it.excedente > 0 ? (
                          <span className="text-error font-bold">
                            Excedeu +{it.excedente} {sigla}
                          </span>
                        ) : (
                          <span className="text-secondary font-bold">
                            Restam {it.saldoOrcamento} {sigla}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`ob-badge ${cfg.badgeClass} whitespace-nowrap`}>
                          {cfg.texto}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleAbrirEdicao(it)}
                          className="h-8 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-caption-2 cursor-pointer transition-all mr-2"
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
                          className="h-8 px-3 rounded-lg bg-error-container/40 hover:bg-error-container text-error font-semibold text-caption-2 cursor-pointer transition-all"
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
        </div>
      )}

      {/* MODAL: DEFINIR NOVO LIMITE DE MATERIAL NA OBRA */}
      {modalNovoAberto && (
        <div className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-lg w-full shadow-xl border border-surface-container">
            <h2 className="text-lg font-bold text-on-surface mb-1">
              Definir Limite de Material por Obra
            </h2>
            <p className="text-caption-1 text-on-surface-variant mb-4">
              Configure a quantidade maxima orcada para o material na obra selecionada.
            </p>

            {erroFormNovo && (
              <div className="bg-error-container/20 border border-error/30 text-error p-3 rounded-xl mb-4 text-caption-1 font-medium">
                {erroFormNovo}
              </div>
            )}

            <form onSubmit={handleSubmeterNovo} className="flex flex-col gap-4">
              <div>
                <label className="block text-caption-1 font-semibold text-on-surface mb-1.5">
                  Obra
                </label>
                <select
                  aria-label="Selecionar obra para orcamento"
                  value={obraIdForm}
                  onChange={(e) => setObraIdForm(e.target.value)}
                  required
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-caption-1 outline-none focus:border-primary"
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
                <label className="block text-caption-1 font-semibold text-on-surface mb-1.5">
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
                <label className="block text-caption-1 font-semibold text-on-surface mb-1.5">
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
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-caption-1 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-caption-1 font-medium text-on-surface-variant mb-1.5">
                  Observacao (opcional)
                </label>
                <input
                  type="text"
                  maxLength={255}
                  placeholder="ex: Previsto no cronograma estrutural base"
                  value={observacaoForm}
                  onChange={(e) => setObservacaoForm(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-caption-1 outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoAberto(false)}
                  className="h-10 px-4 rounded-xl border border-surface-container bg-surface-container-low text-on-surface font-semibold text-caption-1 cursor-pointer hover:bg-surface-container transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarMutation.isPending}
                  className="h-10 px-5 rounded-xl bg-primary text-on-primary font-headline text-headline font-semibold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-xl border border-surface-container">
            <h2 className="text-lg font-bold text-on-surface mb-1">
              Editar Limite Orcamentario
            </h2>
            <p className="text-caption-1 text-on-surface-variant mb-4">
              {orcamentoEmEdicao.obra.codigo} - {orcamentoEmEdicao.obra.nome} &bull;{' '}
              <strong className="text-on-surface">{orcamentoEmEdicao.material.descricao}</strong>
            </p>

            {erroFormEdicao && (
              <div className="bg-error-container/20 border border-error/30 text-error p-3 rounded-xl mb-4 text-caption-1 font-medium">
                {erroFormEdicao}
              </div>
            )}

            <form onSubmit={handleSubmeterEdicao} className="flex flex-col gap-4">
              <div>
                <label className="block text-caption-1 font-semibold text-on-surface mb-1.5">
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
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-caption-1 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-caption-1 font-medium text-on-surface-variant mb-1.5">
                  Observacao
                </label>
                <input
                  type="text"
                  maxLength={255}
                  value={novaObservacaoEdicao}
                  onChange={(e) => setNovaObservacaoEdicao(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-caption-1 outline-none focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setOrcamentoEmEdicao(null)}
                  className="h-10 px-4 rounded-xl border border-surface-container bg-surface-container-low text-on-surface font-semibold text-caption-1 cursor-pointer hover:bg-surface-container transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={atualizarMutation.isPending}
                  className="h-10 px-5 rounded-xl bg-primary text-on-primary font-headline text-headline font-semibold shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {atualizarMutation.isPending ? 'Atualizando...' : 'Salvar Alteracoes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
