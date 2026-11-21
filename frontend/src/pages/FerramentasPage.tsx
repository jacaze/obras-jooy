import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFerramentas,
  createFerramenta,
  updateFerramenta,
  registrarEmprestimoFerramenta,
  registrarDevolucaoFerramenta,
  getCautelasFerramenta,
  getUsuariosOpcoes,
  getUsuarios,
  getObras,
  getAreasObra,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Ferramenta, StatusFerramenta, CautelaFerramenta } from '../types/material'

export function FerramentasPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  // Permissoes: Admin, Engenharia e Almoxarife gerenciam catalogo
  const podeGerenciar =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ENGENHARIA' ||
    usuario?.perfil === 'ALMOXARIFE'

  // Somente ALMOXARIFE e ADMIN podem entregar e devolver ferramentas fisicamente
  const podeOperarBalcao =
    usuario?.perfil === 'ADMIN' || usuario?.perfil === 'ALMOXARIFE'

  // Filtros
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [somenteAtivas, setSomenteAtivas] = useState(true)

  // Mensagens
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  // Modal de Criacao e Edicao
  const [modalFerramentaAberto, setModalFerramentaAberto] = useState(false)
  const [ferramentaEmEdicao, setFerramentaEmEdicao] = useState<Ferramenta | null>(null)
  const [formCodigo, setFormCodigo] = useState('')
  const [formNome, setFormNome] = useState('')

  // Modal de Emprestimo (Cautela)
  const [ferramentaParaEmprestimo, setFerramentaParaEmprestimo] = useState<Ferramenta | null>(null)
  const [usuarioEmprestimoId, setUsuarioEmprestimoId] = useState('')
  const [areaEmprestimoId, setAreaEmprestimoId] = useState('')
  const [testadoNaSaida, setTestadoNaSaida] = useState(false)
  const [previsaoDevolucao, setPrevisaoDevolucao] = useState('')
  const [observacaoSaida, setObservacaoSaida] = useState('')

  // Modal de Devolucao
  const [ferramentaParaDevolucao, setFerramentaParaDevolucao] = useState<Ferramenta | null>(null)
  const [testadoNoRetorno, setTestadoNoRetorno] = useState(false)
  const [devolucaoComDefeito, setDevolucaoComDefeito] = useState(false)
  const [observacaoDevolucao, setObservacaoDevolucao] = useState('')

  // Modal de Historico de Cautelas
  const [ferramentaHistorico, setFerramentaHistorico] = useState<Ferramenta | null>(null)

  // Queries
  const { data: ferramentas = [], isLoading: carregandoFerramentas } = useQuery({
    queryKey: ['ferramentas', busca, statusFiltro, somenteAtivas],
    queryFn: () =>
      getFerramentas({
        busca: busca.trim() || undefined,
        status: (statusFiltro as StatusFerramenta) || undefined,
        somenteAtivas,
      }),
  })

  const { data: obras = [] } = useQuery({
    queryKey: ['obras-ferramentas'],
    queryFn: async () => {
      if (typeof getObras === 'function') {
        const res = await getObras(true)
        return res || []
      }
      return []
    },
    enabled: podeOperarBalcao,
  })

  const obraAtivaId = usuario?.obraId || obras[0]?.id || ''

  const { data: areasObra = [] } = useQuery({
    queryKey: ['areas-obra-ferramentas', obraAtivaId],
    queryFn: async () => {
      if (obraAtivaId && typeof getAreasObra === 'function') {
        const res = await getAreasObra(obraAtivaId, true)
        return res || []
      }
      return []
    },
    enabled: Boolean(obraAtivaId && podeOperarBalcao),
  })

  const { data: historicoCautelas = [], isLoading: carregandoHistorico } = useQuery({
    queryKey: ['cautelas-ferramenta', ferramentaHistorico?.id],
    queryFn: async () => {
      if (ferramentaHistorico && typeof getCautelasFerramenta === 'function') {
        const res = await getCautelasFerramenta(ferramentaHistorico.id)
        return res || ferramentaHistorico.cautelas || []
      }
      return ferramentaHistorico?.cautelas || []
    },
    enabled: Boolean(ferramentaHistorico),
  })

  const { data: usuariosOpcoes = [] } = useQuery({
    queryKey: ['usuarios-opcoes-ferramentas'],
    queryFn: async () => {
      if (typeof getUsuariosOpcoes === 'function') {
        const res = await getUsuariosOpcoes()
        if (res && res.length > 0) return res
      }
      return getUsuarios()
    },
    enabled: podeGerenciar,
  })

  const usuariosAtivos = usuariosOpcoes.filter((u) => u.ativo !== false)

  // Indicadores operacionais (KPIs)
  const totalFerramentas = ferramentas.length
  const totalDisponiveis = ferramentas.filter((f) => f.status === 'DISPONIVEL' && f.ativo).length
  const totalEmprestadas = ferramentas.filter((f) => f.status === 'EMPRESTADO').length
  const totalComDefeito = ferramentas.filter((f) => f.status === 'COM_DEFEITO').length

  // Mutations
  const salvarFerramentaMutation = useMutation({
    mutationFn: async () => {
      if (ferramentaEmEdicao) {
        return updateFerramenta(ferramentaEmEdicao.id, { nome: formNome.trim() })
      }
      return createFerramenta({
        codigo: formCodigo.trim().toUpperCase(),
        nome: formNome.trim(),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setModalFerramentaAberto(false)
      setFerramentaEmEdicao(null)
      setFormCodigo('')
      setFormNome('')
      setMensagemErro(null)
      setMensagemSucesso('Ferramenta salva com sucesso no catalogo.')
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao salvar ferramenta.'
      )
    },
  })

  const emprestarFerramentaMutation = useMutation({
    mutationFn: async ({
      id,
      usuarioId,
      areaId,
      testadoNaSaida,
      previsaoDevolucao,
      observacaoSaida,
    }: {
      id: string
      usuarioId: string
      areaId?: string | null
      testadoNaSaida: boolean
      previsaoDevolucao?: string | null
      observacaoSaida?: string | null
    }) =>
      registrarEmprestimoFerramenta(id, {
        usuarioId,
        areaId: areaId || null,
        testadoNaSaida,
        previsaoDevolucao: previsaoDevolucao || null,
        observacaoSaida: observacaoSaida || null,
      }),
    onSuccess: (ferAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setFerramentaParaEmprestimo(null)
      setUsuarioEmprestimoId('')
      setAreaEmprestimoId('')
      setTestadoNaSaida(false)
      setPrevisaoDevolucao('')
      setObservacaoSaida('')
      setMensagemErro(null)
      setMensagemSucesso(
        `Cautela registrada: ${ferAtualizada.codigo} (${ferAtualizada.nome}) testada e entregue para ${ferAtualizada.emprestadoPara?.nome || 'usuario selecionado'}.`
      )
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao registrar emprestimo.'
      )
    },
  })

  const devolverFerramentaMutation = useMutation({
    mutationFn: async ({
      id,
      testadoNoRetorno,
      comDefeito,
      observacaoDevolucao,
    }: {
      id: string
      testadoNoRetorno: boolean
      comDefeito: boolean
      observacaoDevolucao?: string | null
    }) =>
      registrarDevolucaoFerramenta(id, {
        testadoNoRetorno,
        comDefeito,
        observacaoDevolucao: observacaoDevolucao || null,
      }),
    onSuccess: (ferAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setFerramentaParaDevolucao(null)
      setTestadoNoRetorno(false)
      setDevolucaoComDefeito(false)
      setObservacaoDevolucao('')
      setMensagemErro(null)
      setMensagemSucesso(
        ferAtualizada.status === 'COM_DEFEITO'
          ? `Devolucao registrada com avaria: ${ferAtualizada.codigo} testada e encaminhada para manutencao.`
          : `Devolucao registrada com sucesso: ${ferAtualizada.codigo} testada e disponivel novamente no almoxarifado.`
      )
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao registrar devolucao.'
      )
    },
  })

  const atualizarStatusFerramentaMutation = useMutation({
    mutationFn: async ({
      id,
      dados,
      mensagemOk,
    }: {
      id: string
      dados: { status?: StatusFerramenta; ativo?: boolean }
      mensagemOk: string
    }) => {
      const res = await updateFerramenta(id, dados)
      return { res, mensagemOk }
    },
    onSuccess: ({ mensagemOk }) => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setMensagemErro(null)
      setMensagemSucesso(mensagemOk)
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao atualizar ferramenta.'
      )
    },
  })

  return (
    <main className="flex flex-col w-full min-h-screen bg-surface pb-28">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-6 flex flex-col gap-6">
        {/* Cabecalho Nativo iOS */}
        <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Gestão Patrimonial
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-0.5">
              Controle de Ferramentas e Ativos
            </h1>
            <p className="text-xs sm:text-sm text-on-surface-variant">
              Itens devolutivos individuais com rastreamento de emprestimo, devolucao e manutencao em obra.
            </p>
          </div>

          {podeGerenciar && (
            <button
              type="button"
              onClick={() => {
                setFerramentaEmEdicao(null)
                setFormCodigo('')
                setFormNome('')
                setMensagemErro(null)
                setModalFerramentaAberto(true)
              }}
              className="ob-btn ob-btn--primary ob-btn--sm min-h-[48px]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Nova Ferramenta</span>
            </button>
          )}
        </div>

        {/* Industrial Metrics Dashboard: 4 Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="ob-card ob-stat">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant font-mono">
              Total Cadastradas
            </span>
            <div className="ob-stat__v">{totalFerramentas}</div>
            <div className="ob-stat__d">Ativos catalogados</div>
          </div>

          <div className="ob-card ob-stat">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary font-mono">
              Disponíveis
            </span>
            <div className="ob-stat__v text-secondary">{totalDisponiveis}</div>
            <div className="ob-stat__d">Prontas para uso</div>
          </div>

          <div className="ob-card ob-stat">
            <span className="text-xs font-semibold uppercase tracking-wider text-tertiary font-mono">
              Emprestadas
            </span>
            <div className="ob-stat__v text-tertiary">{totalEmprestadas}</div>
            <div className="ob-stat__d">Em campo</div>
          </div>

          <div className="ob-card ob-stat">
            <span className="text-xs font-semibold uppercase tracking-wider text-error font-mono">
              Com Defeito
            </span>
            <div className="ob-stat__v text-error">{totalComDefeito}</div>
            <div className="ob-stat__d">Em manutenção</div>
          </div>
        </div>

        {/* Alertas */}
        {mensagemSucesso && (
          <div
            role="status"
            className="bg-secondary-container text-on-secondary-container border border-secondary/20 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm animate-fade-up"
          >
            <span className="font-medium">{mensagemSucesso}</span>
            <button
              type="button"
              onClick={() => setMensagemSucesso(null)}
              className="text-on-secondary-container font-bold text-lg hover:opacity-70 px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {mensagemErro && (
          <div
            role="alert"
            className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm animate-fade-up"
          >
            <span className="font-medium">{mensagemErro}</span>
            <button
              type="button"
              onClick={() => setMensagemErro(null)}
              className="text-on-error-container font-bold text-lg hover:opacity-70 px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Filtros: Search Bar + Tabs */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="ob-search flex-1 max-w-md">
            <span className="material-symbols-outlined">search</span>
            <input
              id="filtro-ferramenta-busca"
              type="text"
              placeholder="Buscar por código ou nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="ob-input text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="ob-tabs" role="tablist">
              {[
                { id: '', label: 'Todas' },
                { id: 'DISPONIVEL', label: 'Disponíveis' },
                { id: 'EMPRESTADO', label: 'Em Campo' },
                { id: 'COM_DEFEITO', label: 'Com Defeito' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFiltro === st.id}
                  onClick={() => setStatusFiltro(st.id)}
                  className="ob-tab"
                >
                  {st.label}
                </button>
              ))}
            </div>

            <label
              htmlFor="filtro-ferramenta-ativas"
              className="inline-flex items-center gap-2 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-xl border border-surface-container cursor-pointer select-none min-h-[44px]"
            >
              <input
                id="filtro-ferramenta-ativas"
                type="checkbox"
                checked={somenteAtivas}
                onChange={(e) => setSomenteAtivas(e.target.checked)}
                className="w-4 h-4 rounded text-accent-text"
              />
              <span>Exibir somente ativas</span>
            </label>
          </div>
        </div>

        {/* Tabela de Ferramentas */}
        <div className="ob-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="ob-table">
              <thead>
                <tr>
                  <th>Código / Identificação</th>
                  <th>Nome da Ferramenta</th>
                  <th>Status</th>
                  <th>Emprestado Para</th>
                  {podeGerenciar && <th style={{ textAlign: 'right' }}>Ações Operacionais</th>}
                </tr>
              </thead>
              <tbody>
                {carregandoFerramentas ? (
                  <tr>
                    <td
                      colSpan={podeGerenciar ? 5 : 4}
                      className="p-8 text-center text-on-surface-variant font-body"
                    >
                      Carregando ferramentas cadastradas...
                    </td>
                  </tr>
                ) : ferramentas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={podeGerenciar ? 5 : 4}
                      className="p-8 text-center text-on-surface-variant font-body"
                    >
                      Nenhuma ferramenta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  ferramentas.map((fer) => {
                    return (
                      <tr
                        key={fer.id}
                        className={!fer.ativo ? 'opacity-60' : undefined}
                      >
                        <td>
                          <span className="ob-mono font-semibold text-accent-text">
                            {fer.codigo}
                          </span>
                          {!fer.ativo && (
                            <span className="ml-2 ob-badge ob-badge--low">
                              Inativa
                            </span>
                          )}
                        </td>
                        <td className="font-medium text-on-surface">
                          {fer.nome}
                        </td>
                        <td>
                          {fer.status === 'DISPONIVEL' && (
                            <span className="ob-badge ob-badge--ok">
                              Disponível
                            </span>
                          )}
                          {fer.status === 'EMPRESTADO' && (
                            <span className="ob-badge ob-badge--info">
                              Emprestado
                            </span>
                          )}
                          {fer.status === 'COM_DEFEITO' && (
                            <span className="ob-badge ob-badge--crit">
                              Com Defeito
                            </span>
                          )}
                        </td>
                        <td className="text-sm font-body">
                          {fer.status === 'EMPRESTADO' && fer.emprestadoPara ? (
                            <div className="space-y-0.5">
                              <div>
                                <span className="font-semibold text-on-surface">
                                  {fer.emprestadoPara.nome}
                                </span>
                                <span className="text-on-surface-variant text-xs ml-1.5 font-mono">
                                  (@{fer.emprestadoPara.login})
                                </span>
                              </div>
                              {fer.cautelas && fer.cautelas[0] && !fer.cautelas[0].devolvidaEm && (
                                <div className="text-xs text-on-surface-variant flex flex-wrap gap-2 items-center">
                                  {fer.cautelas[0].area && (
                                    <span className="bg-surface-container px-2 py-0.5 rounded font-medium">
                                      Local: {fer.cautelas[0].area.nome}
                                    </span>
                                  )}
                                  {fer.cautelas[0].testadoNaSaida && (
                                    <span className="text-secondary font-medium">
                                      Testada na saída
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-on-surface-variant">-</span>
                          )}
                        </td>
                        {podeGerenciar && (
                          <td style={{ textAlign: 'right' }}>
                            <div className="inline-flex items-center gap-2 flex-wrap justify-end">
                              {podeOperarBalcao && fer.status === 'DISPONIVEL' && fer.ativo && (
                                <button
                                  type="button"
                                  aria-label="Emprestar"
                                  onClick={() => {
                                    setFerramentaParaEmprestimo(fer)
                                    setUsuarioEmprestimoId('')
                                    setAreaEmprestimoId('')
                                    setTestadoNaSaida(false)
                                    setPrevisaoDevolucao('')
                                    setObservacaoSaida('')
                                    setMensagemErro(null)
                                  }}
                                  className="ob-btn ob-btn--solid ob-btn--sm"
                                >
                                  <span className="material-symbols-outlined text-[18px]">output</span>
                                  <span>Registrar saída</span>
                                </button>
                              )}

                              {podeOperarBalcao && fer.status === 'EMPRESTADO' && (
                                <button
                                  type="button"
                                  aria-label="Devolver"
                                  onClick={() => {
                                    setFerramentaParaDevolucao(fer)
                                    setTestadoNoRetorno(false)
                                    setDevolucaoComDefeito(false)
                                    setObservacaoDevolucao('')
                                    setMensagemErro(null)
                                  }}
                                  className="ob-btn ob-btn--primary ob-btn--sm"
                                >
                                  <span className="material-symbols-outlined text-[18px]">assignment_return</span>
                                  <span>Registrar devolução</span>
                                </button>
                              )}

                              {podeOperarBalcao && fer.status === 'COM_DEFEITO' && (
                                <button
                                  type="button"
                                  aria-label="Liberar Conserto"
                                  disabled={atualizarStatusFerramentaMutation.isPending}
                                  onClick={() =>
                                    atualizarStatusFerramentaMutation.mutate({
                                      id: fer.id,
                                      dados: { status: 'DISPONIVEL' },
                                      mensagemOk: `Manutencao concluida: ${fer.codigo} (${fer.nome}) liberada para uso.`,
                                    })
                                  }
                                  className="ob-btn ob-btn--outline ob-btn--sm"
                                >
                                  <span className="material-symbols-outlined text-[18px]">build</span>
                                  <span>Liberar Conserto</span>
                                </button>
                              )}

                              <button
                                type="button"
                                aria-label="Historico"
                                onClick={() => setFerramentaHistorico(fer)}
                                className="ob-btn ob-btn--outline ob-btn--sm"
                              >
                                Histórico
                              </button>

                              <button
                                type="button"
                                aria-label="Editar"
                                onClick={() => {
                                  setFerramentaEmEdicao(fer)
                                  setFormCodigo(fer.codigo)
                                  setFormNome(fer.nome)
                                  setModalFerramentaAberto(true)
                                }}
                                className="ob-btn ob-btn--outline ob-btn--sm"
                              >
                                Editar
                              </button>

                              {fer.status !== 'EMPRESTADO' && (
                                <button
                                  type="button"
                                  disabled={atualizarStatusFerramentaMutation.isPending}
                                  onClick={() =>
                                    atualizarStatusFerramentaMutation.mutate({
                                      id: fer.id,
                                      dados: { ativo: !fer.ativo },
                                      mensagemOk: fer.ativo
                                        ? `Ferramenta ${fer.codigo} inativada no catalogo.`
                                        : `Ferramenta ${fer.codigo} reativada no catalogo.`,
                                    })
                                  }
                                  className="ob-btn ob-btn--outline ob-btn--sm text-error border-error/30 hover:bg-error-container/20"
                                >
                                  {fer.ativo ? 'Inativar' : 'Reativar'}
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Registrar Emprestimo */}
        {ferramentaParaEmprestimo && (
          <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
              <div className="flex justify-between items-center mb-4">
                <h2 className="ob-heading text-xl font-bold text-on-surface m-0">
                  Registrar Emprestimo de Ferramenta
                </h2>
                <button
                  type="button"
                  onClick={() => setFerramentaParaEmprestimo(null)}
                  className="text-on-surface-variant hover:text-on-surface text-lg cursor-pointer p-1"
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </div>

              <div className="bg-surface-container-low border border-surface-container rounded-xl p-4 mb-4 text-sm text-on-surface space-y-1">
                <div>
                  <strong>Ferramenta:</strong> {ferramentaParaEmprestimo.codigo} -{' '}
                  {ferramentaParaEmprestimo.nome}
                </div>
                <div className="text-xs text-on-surface-variant">
                  Selecione o colaborador responsavel, local de uso e confirme o teste de bancada antes da entrega.
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!usuarioEmprestimoId) {
                    setMensagemErro('Selecione o usuario solicitante para registrar o emprestimo.')
                    return
                  }
                  if (!testadoNaSaida) {
                    setMensagemErro('Confirme que a ferramenta foi testada na bancada antes de entregar.')
                    return
                  }
                  emprestarFerramentaMutation.mutate({
                    id: ferramentaParaEmprestimo.id,
                    usuarioId: usuarioEmprestimoId,
                    areaId: areaEmprestimoId || null,
                    testadoNaSaida,
                    previsaoDevolucao: previsaoDevolucao || null,
                    observacaoSaida: observacaoSaida.trim() || null,
                  })
                }}
                className="flex flex-col gap-4"
              >
                <div>
                  <label
                    htmlFor="emprestimo-usuario"
                    className="block text-sm font-semibold text-on-surface mb-1.5"
                  >
                    Usuario Solicitante (Responsavel na Obra) *
                  </label>
                  <select
                    id="emprestimo-usuario"
                    required
                    value={usuarioEmprestimoId}
                    onChange={(e) => setUsuarioEmprestimoId(e.target.value)}
                    className="ob-input w-full text-sm font-body"
                  >
                    <option value="">Selecione o colaborador...</option>
                    {usuariosAtivos.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} (@{u.login} - {u.cargo?.nome || u.perfil})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="emprestimo-area"
                      className="block text-sm font-semibold text-on-surface mb-1.5"
                    >
                      Area / Pavimento de Uso
                    </label>
                    <select
                      id="emprestimo-area"
                      value={areaEmprestimoId}
                      onChange={(e) => setAreaEmprestimoId(e.target.value)}
                      className="ob-input w-full text-sm font-body"
                    >
                      <option value="">Selecione a area (opcional)...</option>
                      {areasObra.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="emprestimo-previsao"
                      className="block text-sm font-semibold text-on-surface mb-1.5"
                    >
                      Previsao de Devolucao
                    </label>
                    <input
                      id="emprestimo-previsao"
                      type="date"
                      value={previsaoDevolucao}
                      onChange={(e) => setPrevisaoDevolucao(e.target.value)}
                      className="ob-input w-full text-sm font-body"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="emprestimo-observacao"
                    className="block text-sm font-semibold text-on-surface mb-1.5"
                  >
                    Observacao na Saida (opcional)
                  </label>
                  <input
                    id="emprestimo-observacao"
                    type="text"
                    value={observacaoSaida}
                    onChange={(e) => setObservacaoSaida(e.target.value)}
                    placeholder="Ex: Entregue com maleta e 2 brocas SDS"
                    className="ob-input w-full text-sm"
                  />
                </div>

                <label
                  htmlFor="emprestimo-testado-saida"
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    testadoNaSaida
                      ? 'border-secondary bg-secondary-container/30 text-on-surface'
                      : 'border-surface-container bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <input
                    id="emprestimo-testado-saida"
                    type="checkbox"
                    required
                    checked={testadoNaSaida}
                    onChange={(e) => setTestadoNaSaida(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-secondary"
                  />
                  <span className="text-sm leading-snug">
                    <strong>Ferramenta testada na entrega *</strong>
                    <span className="block text-xs text-on-surface-variant mt-0.5">
                      Confirmo que o equipamento foi ligado/inspecionado no balcao antes de sair para o canteiro.
                    </span>
                  </span>
                </label>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFerramentaParaEmprestimo(null)}
                    className="ob-btn ob-btn--outline w-full sm:w-auto justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={emprestarFerramentaMutation.isPending || !testadoNaSaida}
                    className="ob-btn ob-btn--solid w-full sm:w-auto justify-center disabled:opacity-50"
                  >
                    {emprestarFerramentaMutation.isPending
                      ? 'Registrando...'
                      : 'Confirmar Emprestimo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Registrar Devolucao */}
        {ferramentaParaDevolucao && (
          <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
              <div className="flex justify-between items-center mb-4">
                <h2 className="ob-heading text-xl font-bold text-on-surface m-0">
                  Registrar Devolucao de Ferramenta
                </h2>
                <button
                  type="button"
                  onClick={() => setFerramentaParaDevolucao(null)}
                  className="text-on-surface-variant hover:text-on-surface text-lg cursor-pointer p-1"
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </div>

              <div className="bg-surface-container-low border border-surface-container rounded-xl p-4 mb-4 text-sm text-on-surface space-y-1">
                <div>
                  <strong>Ferramenta:</strong> {ferramentaParaDevolucao.codigo} -{' '}
                  {ferramentaParaDevolucao.nome}
                </div>
                {ferramentaParaDevolucao.emprestadoPara && (
                  <div className="text-xs text-on-surface-variant">
                    <strong>Devolvida por:</strong> {ferramentaParaDevolucao.emprestadoPara.nome} (@
                    {ferramentaParaDevolucao.emprestadoPara.login})
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!testadoNoRetorno) {
                    setMensagemErro('Confirme que a ferramenta foi testada no retorno ao almoxarifado.')
                    return
                  }
                  devolverFerramentaMutation.mutate({
                    id: ferramentaParaDevolucao.id,
                    testadoNoRetorno,
                    comDefeito: devolucaoComDefeito,
                    observacaoDevolucao: observacaoDevolucao.trim() || null,
                  })
                }}
                className="flex flex-col gap-4"
              >
                <label
                  htmlFor="devolucao-testado-retorno"
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    testadoNoRetorno
                      ? 'border-secondary bg-secondary-container/30 text-on-surface'
                      : 'border-surface-container bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <input
                    id="devolucao-testado-retorno"
                    type="checkbox"
                    required
                    checked={testadoNoRetorno}
                    onChange={(e) => setTestadoNoRetorno(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-secondary"
                  />
                  <span className="text-sm leading-snug">
                    <strong>Ferramenta testada no retorno *</strong>
                    <span className="block text-xs text-on-surface-variant mt-0.5">
                      Confirmo que realizei o teste de funcionamento no recebimento da ferramenta no balcao.
                    </span>
                  </span>
                </label>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-on-surface">
                    Condicao de retorno apos o teste:
                  </span>

                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      !devolucaoComDefeito
                        ? 'border-secondary bg-secondary-container/30 text-on-surface'
                        : 'border-surface-container bg-surface text-on-surface-variant'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condicao-devolucao"
                      checked={!devolucaoComDefeito}
                      onChange={() => setDevolucaoComDefeito(false)}
                      className="w-4 h-4 text-secondary"
                    />
                    <span className="text-sm">
                      <strong>Devolvida em perfeito estado</strong> (Retorna para Disponivel)
                    </span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                      devolucaoComDefeito
                        ? 'border-error bg-error-container/30 text-on-surface'
                        : 'border-surface-container bg-surface text-on-surface-variant'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condicao-devolucao"
                      checked={devolucaoComDefeito}
                      onChange={() => setDevolucaoComDefeito(true)}
                      className="w-4 h-4 text-error"
                    />
                    <span className="text-sm">
                      <strong>Devolvida com defeito / avaria</strong> (Bloqueia para Manutencao)
                    </span>
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="devolucao-observacao"
                    className="block text-sm font-semibold text-on-surface mb-1.5"
                  >
                    Observacao na Devolucao {devolucaoComDefeito ? '(descreva o defeito)' : '(opcional)'}
                  </label>
                  <input
                    id="devolucao-observacao"
                    type="text"
                    value={observacaoDevolucao}
                    onChange={(e) => setObservacaoDevolucao(e.target.value)}
                    placeholder={
                      devolucaoComDefeito
                        ? 'Ex: Cabo eletrico rompido ou gatilho travando'
                        : 'Ex: Devolvida limpa e completa'
                    }
                    className="ob-input w-full text-sm"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFerramentaParaDevolucao(null)}
                    className="ob-btn ob-btn--outline w-full sm:w-auto justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={devolverFerramentaMutation.isPending || !testadoNoRetorno}
                    className={`ob-btn w-full sm:w-auto justify-center disabled:opacity-50 ${
                      devolucaoComDefeito ? 'ob-btn--solid text-error' : 'ob-btn--primary'
                    }`}
                  >
                    {devolverFerramentaMutation.isPending
                      ? 'Confirmando...'
                      : 'Confirmar Devolucao'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Historico de Cautelas */}
        {ferramentaHistorico && (
          <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
            <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="ob-heading text-xl font-bold text-on-surface m-0">
                    Historico de Cautelas ({ferramentaHistorico.codigo})
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {ferramentaHistorico.nome}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFerramentaHistorico(null)}
                  className="text-on-surface-variant hover:text-on-surface text-lg cursor-pointer p-1"
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </div>

              {carregandoHistorico ? (
                <div className="py-8 text-center text-sm text-on-surface-variant">
                  Carregando historico de cautelas...
                </div>
              ) : (historicoCautelas as CautelaFerramenta[]).length === 0 ? (
                <div className="py-8 text-center text-sm text-on-surface-variant bg-surface-container-low rounded-xl border border-surface-container">
                  Nenhum registro de cautela encontrado para esta ferramenta.
                </div>
              ) : (
                <div className="space-y-3">
                  {(historicoCautelas as CautelaFerramenta[]).map((cautela) => (
                    <div
                      key={cautela.id}
                      className="p-4 rounded-xl border border-surface-container bg-surface-container-low text-xs sm:text-sm space-y-2"
                    >
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="font-semibold text-on-surface">
                          Responsavel: {cautela.usuario?.nome || 'Usuario'}
                          {cautela.area ? ` — Local: ${cautela.area.nome}` : ''}
                        </div>
                        <span
                          className={`ob-badge ${
                            !cautela.devolvidaEm
                              ? 'ob-badge--info'
                              : cautela.comDefeito
                              ? 'ob-badge--crit'
                              : 'ob-badge--ok'
                          }`}
                        >
                          {!cautela.devolvidaEm
                            ? 'Em Campo'
                            : cautela.comDefeito
                            ? 'Devolvida com Defeito'
                            : 'Devolvida OK'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface-variant">
                        <div>
                          <strong>Saida:</strong>{' '}
                          {new Date(cautela.retiradaEm).toLocaleString('pt-BR')}
                          {cautela.entreguePor ? ` (por ${cautela.entreguePor.nome})` : ''}
                          {cautela.testadoNaSaida ? ' [Testada na saida]' : ''}
                          {cautela.observacaoSaida ? ` — Obs: ${cautela.observacaoSaida}` : ''}
                        </div>
                        <div>
                          <strong>Retorno:</strong>{' '}
                          {cautela.devolvidaEm
                            ? `${new Date(cautela.devolvidaEm).toLocaleString('pt-BR')}${
                                cautela.recebidoPor ? ` (por ${cautela.recebidoPor.nome})` : ''
                              }${cautela.testadoNoRetorno ? ' [Testada no retorno]' : ''}${
                                cautela.observacaoDevolucao
                                  ? ` — Obs: ${cautela.observacaoDevolucao}`
                                  : ''
                              }`
                            : 'Aguardando devolucao'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setFerramentaHistorico(null)}
                  className="ob-btn ob-btn--outline"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Criar/Editar Ferramenta */}
        {modalFerramentaAberto && (
          <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
            <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
              <div className="flex justify-between items-center mb-4">
                <h2 className="ob-heading text-xl font-bold text-on-surface m-0">
                  {ferramentaEmEdicao
                    ? `Editar Ferramenta (${ferramentaEmEdicao.codigo})`
                    : 'Nova Ferramenta'}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalFerramentaAberto(false)}
                  className="text-on-surface-variant hover:text-on-surface text-lg cursor-pointer p-1"
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  salvarFerramentaMutation.mutate()
                }}
                className="flex flex-col gap-4"
              >
                <div>
                  <label
                    htmlFor="ferramenta-codigo"
                    className="block text-sm font-semibold text-on-surface mb-1.5"
                  >
                    Código / Identificação da Obra *
                  </label>
                  <input
                    id="ferramenta-codigo"
                    type="text"
                    required
                    disabled={!!ferramentaEmEdicao}
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value.toUpperCase())}
                    placeholder="Ex: MART-01 ou TAG-549"
                    className="ob-input w-full font-mono uppercase text-sm disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ferramenta-nome"
                    className="block text-sm font-semibold text-on-surface mb-1.5"
                  >
                    Nome da Ferramenta *
                  </label>
                  <input
                    id="ferramenta-nome"
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Martelete Perfurador Rompedor 800W"
                    className="ob-input w-full text-sm"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalFerramentaAberto(false)}
                    className="ob-btn ob-btn--outline w-full sm:w-auto justify-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvarFerramentaMutation.isPending}
                    className="ob-btn ob-btn--primary w-full sm:w-auto justify-center"
                  >
                    {salvarFerramentaMutation.isPending ? 'Salvando...' : 'Salvar Ferramenta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
export default FerramentasPage
