import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFerramentas,
  createFerramenta,
  updateFerramenta,
  registrarEmprestimoFerramenta,
  registrarDevolucaoFerramenta,
  getUsuariosOpcoes,
  getUsuarios,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { Ferramenta, StatusFerramenta } from '../types/material'

export function FerramentasPage() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()

  // Permissoes: Admin, Engenharia e Almoxarife gerenciam
  const podeGerenciar =
    usuario?.perfil === 'ADMIN' ||
    usuario?.perfil === 'ENGENHARIA' ||
    usuario?.perfil === 'ALMOXARIFE'

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

  // Modal de Emprestimo
  const [ferramentaParaEmprestimo, setFerramentaParaEmprestimo] = useState<Ferramenta | null>(null)
  const [usuarioEmprestimoId, setUsuarioEmprestimoId] = useState('')

  // Modal de Devolucao
  const [ferramentaParaDevolucao, setFerramentaParaDevolucao] = useState<Ferramenta | null>(null)
  const [devolucaoComDefeito, setDevolucaoComDefeito] = useState(false)

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
    mutationFn: async ({ id, usuarioId }: { id: string; usuarioId: string }) =>
      registrarEmprestimoFerramenta(id, usuarioId),
    onSuccess: (ferAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setFerramentaParaEmprestimo(null)
      setUsuarioEmprestimoId('')
      setMensagemErro(null)
      setMensagemSucesso(
        `Emprestimo registrado: ${ferAtualizada.codigo} (${ferAtualizada.nome}) entregue para ${ferAtualizada.emprestadoPara?.nome || 'usuario selecionado'}.`
      )
    },
    onError: (err: any) => {
      setMensagemErro(
        err.response?.data?.erro || err.response?.data?.message || 'Erro ao registrar emprestimo.'
      )
    },
  })

  const devolverFerramentaMutation = useMutation({
    mutationFn: async ({ id, comDefeito }: { id: string; comDefeito: boolean }) =>
      registrarDevolucaoFerramenta(id, comDefeito),
    onSuccess: (ferAtualizada) => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setFerramentaParaDevolucao(null)
      setDevolucaoComDefeito(false)
      setMensagemErro(null)
      setMensagemSucesso(
        ferAtualizada.status === 'COM_DEFEITO'
          ? `Devolucao registrada com avaria: ${ferAtualizada.codigo} encaminhada para manutencao.`
          : `Devolucao registrada com sucesso: ${ferAtualizada.codigo} disponivel novamente no almoxarifado.`
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs sm:text-sm shadow-sm active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>+ Nova Ferramenta</span>
            </button>
          )}
        </div>

        {/* Industrial Metrics Dashboard: 4 Cards (Stitch Design) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Card */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Total Cadastradas
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-on-surface mt-1">
                {totalFerramentas}
              </span>
              <span className="text-[11px] text-on-surface-variant mt-0.5">Ativos catalogados</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[22px]">handyman</span>
            </div>
          </div>

          {/* Disponíveis Card */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Disponíveis
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-secondary mt-1">
                {totalDisponiveis}
              </span>
              <span className="text-[11px] text-secondary mt-0.5">Prontas para uso</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed/50 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">check_circle</span>
            </div>
          </div>

          {/* Em Campo Card */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                Emprestadas
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-tertiary mt-1">
                {totalEmprestadas}
              </span>
              <span className="text-[11px] text-tertiary mt-0.5">Em campo</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-tertiary-fixed/60 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[22px]">engineering</span>
            </div>
          </div>

          {/* Manutenção Card */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-sm border border-surface-container flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wider text-error">
                Com Defeito
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-error mt-1">
                {totalComDefeito}
              </span>
              <span className="text-[11px] text-error mt-0.5">Em manutenção</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center text-error">
              <span className="material-symbols-outlined text-[22px]">build_circle</span>
            </div>
          </div>
        </div>

        {/* Alertas */}
        {mensagemSucesso && (
          <div
            role="status"
            className="bg-secondary-container text-on-secondary-container border border-secondary/20 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm"
          >
            <span className="font-medium">{mensagemSucesso}</span>
            <button
              type="button"
              onClick={() => setMensagemSucesso(null)}
              className="text-on-secondary-container font-bold text-lg hover:opacity-70 px-1"
            >
              &times;
            </button>
          </div>
        )}

        {mensagemErro && (
          <div
            role="alert"
            className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm shadow-sm"
          >
            <span className="font-medium">{mensagemErro}</span>
            <button
              type="button"
              onClick={() => setMensagemErro(null)}
              className="text-on-error-container font-bold text-lg hover:opacity-70 px-1"
            >
              &times;
            </button>
          </div>
        )}

        {/* Filtros: iOS Search Bar + Segmented Control */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex items-center flex-1 max-w-md bg-surface-container-high rounded-xl px-3.5 h-11 focus-within:bg-surface-container-lowest focus-within:shadow-sm border border-surface-container transition-all">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px] mr-2">
              search
            </span>
            <input
              id="filtro-ferramenta-busca"
              type="text"
              placeholder="Buscar por código ou nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-surface-container rounded-xl p-1 flex items-center gap-1 select-none shadow-inner overflow-x-auto">
              {[
                { id: '', label: 'Todas' },
                { id: 'DISPONIVEL', label: 'Disponíveis' },
                { id: 'EMPRESTADO', label: 'Em Campo' },
                { id: 'COM_DEFEITO', label: 'Com Defeito' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFiltro(st.id)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold text-center transition-all ${
                    statusFiltro === st.id
                      ? 'bg-surface-container-lowest text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <label
              htmlFor="filtro-ferramenta-ativas"
              className="inline-flex items-center gap-2 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-2 rounded-xl border border-surface-container cursor-pointer select-none"
            >
              <input
                id="filtro-ferramenta-ativas"
                type="checkbox"
                checked={somenteAtivas}
                onChange={(e) => setSomenteAtivas(e.target.checked)}
                className="w-4 h-4 rounded text-primary"
              />
              <span>Exibir somente ativas</span>
            </label>
          </div>
        </div>

        {/* Tabela de Ferramentas (Inset Grouped) */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container overflow-hidden">
          <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th
                  style={{
                    padding: '16px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Código / Identificação
                </th>
                <th
                  style={{
                    padding: '16px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Nome da Ferramenta
                </th>
                <th
                  style={{
                    padding: '16px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '16px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  Emprestado Para
                </th>
                {podeGerenciar && (
                  <th
                    style={{
                      padding: '16px 16px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#475569',
                      textTransform: 'uppercase',
                      textAlign: 'right',
                    }}
                  >
                    Ações Operacionais
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {carregandoFerramentas ? (
                <tr>
                  <td
                    colSpan={podeGerenciar ? 5 : 4}
                    style={{ padding: '32px', textAlign: 'center', color: '#475569' }}
                  >
                    Carregando ferramentas cadastradas...
                  </td>
                </tr>
              ) : ferramentas.length === 0 ? (
                <tr>
                  <td
                    colSpan={podeGerenciar ? 5 : 4}
                    style={{ padding: '32px', textAlign: 'center', color: '#475569' }}
                  >
                    Nenhuma ferramenta encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                ferramentas.map((fer) => {
                  return (
                    <tr
                      key={fer.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        opacity: fer.ativo ? 1 : 0.6,
                      }}
                    >
                      <td
                        style={{
                          padding: '16px 16px',
                          fontWeight: 600,
                          color: '#0f172a',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {fer.codigo}
                        {!fer.ativo && (
                          <span
                            style={{
                              marginLeft: '8px',
                              padding: '8px 8px',
                              backgroundColor: '#e2e8f0',
                              color: '#475569',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontFamily: 'system-ui, sans-serif',
                            }}
                          >
                            Inativa
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '16px 16px',
                          fontWeight: 600,
                          color: '#1e293b',
                          fontSize: '0.875rem',
                        }}
                      >
                        {fer.nome}
                      </td>
                      <td style={{ padding: '16px 16px' }}>
                        {fer.status === 'DISPONIVEL' && (
                          <span
                            style={{
                              padding: '8px 8px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            Disponível
                          </span>
                        )}
                        {fer.status === 'EMPRESTADO' && (
                          <span
                            style={{
                              padding: '8px 8px',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            Emprestado
                          </span>
                        )}
                        {fer.status === 'COM_DEFEITO' && (
                          <span
                            style={{
                              padding: '8px 8px',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              borderRadius: '4px',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            Com Defeito
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 16px', fontSize: '0.875rem' }}>
                        {fer.status === 'EMPRESTADO' && fer.emprestadoPara ? (
                          <div>
                            <span style={{ fontWeight: 600, color: '#0369a1' }}>
                              {fer.emprestadoPara.nome}
                            </span>
                            <span
                              style={{ color: '#475569', fontSize: '0.875rem', marginLeft: '8px' }}
                            >
                              (@{fer.emprestadoPara.login})
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#475569' }}>-</span>
                        )}
                      </td>
                      {podeGerenciar && (
                        <td style={{ padding: '16px 16px', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              gap: '8px',
                              flexWrap: 'wrap',
                              justifyContent: 'flex-end',
                            }}
                          >
                            {fer.status === 'DISPONIVEL' && fer.ativo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFerramentaParaEmprestimo(fer)
                                  setUsuarioEmprestimoId('')
                                  setMensagemErro(null)
                                }}
                                style={{
                                  padding: '8px 8px',
                                  backgroundColor: '#0369a1',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Emprestar
                              </button>
                            )}

                            {fer.status === 'EMPRESTADO' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFerramentaParaDevolucao(fer)
                                  setDevolucaoComDefeito(false)
                                  setMensagemErro(null)
                                }}
                                style={{
                                  padding: '8px 8px',
                                  backgroundColor: '#15803d',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Devolver
                              </button>
                            )}

                            {fer.status === 'COM_DEFEITO' && (
                              <button
                                type="button"
                                disabled={atualizarStatusFerramentaMutation.isPending}
                                onClick={() =>
                                  atualizarStatusFerramentaMutation.mutate({
                                    id: fer.id,
                                    dados: { status: 'DISPONIVEL' },
                                    mensagemOk: `Manutencao concluida: ${fer.codigo} (${fer.nome}) liberada para uso.`,
                                  })
                                }
                                style={{
                                  padding: '8px 8px',
                                  backgroundColor: '#0f766e',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Liberar Conserto
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setFerramentaEmEdicao(fer)
                                setFormCodigo(fer.codigo)
                                setFormNome(fer.nome)
                                setModalFerramentaAberto(true)
                              }}
                              style={{
                                padding: '8px 8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                color: '#1e293b',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
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
                                style={{
                                  padding: '8px 8px',
                                  backgroundColor: fer.ativo ? '#fff1f2' : '#f0fdf4',
                                  border: `1px solid ${fer.ativo ? '#fecdd3' : '#bbf7d0'}`,
                                  borderRadius: '4px',
                                  color: fer.ativo ? '#be123c' : '#15803d',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                Registrar Emprestimo de Ferramenta
              </h2>
              <button
                type="button"
                onClick={() => setFerramentaParaEmprestimo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

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
                <strong>Ferramenta:</strong> {ferramentaParaEmprestimo.codigo} -{' '}
                {ferramentaParaEmprestimo.nome}
              </div>
              <div style={{ marginTop: '8px', color: '#475569' }}>
                Selecione o colaborador responsavel pela retirada e guarda do equipamento.
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!usuarioEmprestimoId) {
                  setMensagemErro('Selecione o usuario solicitante para registrar o emprestimo.')
                  return
                }
                emprestarFerramentaMutation.mutate({
                  id: ferramentaParaEmprestimo.id,
                  usuarioId: usuarioEmprestimoId,
                })
              }}
              style={{ display: 'grid', gap: '16px' }}
            >
              <div>
                <label
                  htmlFor="emprestimo-usuario"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '8px',
                  }}
                >
                  Usuario Solicitante (Responsavel na Obra) *
                </label>
                <select
                  id="emprestimo-usuario"
                  required
                  value={usuarioEmprestimoId}
                  onChange={(e) => setUsuarioEmprestimoId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Selecione o colaborador...</option>
                  {usuariosAtivos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} (@{u.login} - {u.cargo?.nome || u.perfil})
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '16px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFerramentaParaEmprestimo(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={emprestarFerramentaMutation.isPending}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: '#0369a1',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                Registrar Devolucao de Ferramenta
              </h2>
              <button
                type="button"
                onClick={() => setFerramentaParaDevolucao(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

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
                <strong>Ferramenta:</strong> {ferramentaParaDevolucao.codigo} -{' '}
                {ferramentaParaDevolucao.nome}
              </div>
              {ferramentaParaDevolucao.emprestadoPara && (
                <div style={{ marginTop: '8px' }}>
                  <strong>Devolvida por:</strong> {ferramentaParaDevolucao.emprestadoPara.nome} (@
                  {ferramentaParaDevolucao.emprestadoPara.login})
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                devolverFerramentaMutation.mutate({
                  id: ferramentaParaDevolucao.id,
                  comDefeito: devolucaoComDefeito,
                })
              }}
              style={{ display: 'grid', gap: '16px' }}
            >
              <div style={{ display: 'grid', gap: '8px' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  Condicao de retorno ao almoxarifado:
                </span>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${!devolucaoComDefeito ? '#15803d' : '#cbd5e1'}`,
                    backgroundColor: !devolucaoComDefeito ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                  }}
                >
                  <input
                    type="radio"
                    name="condicao-devolucao"
                    checked={!devolucaoComDefeito}
                    onChange={() => setDevolucaoComDefeito(false)}
                  />
                  <span>
                    <strong>Devolvida em perfeito estado</strong> (Retorna para Disponivel)
                  </span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: `1px solid ${devolucaoComDefeito ? '#b91c1c' : '#cbd5e1'}`,
                    backgroundColor: devolucaoComDefeito ? '#fef2f2' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#0f172a',
                  }}
                >
                  <input
                    type="radio"
                    name="condicao-devolucao"
                    checked={devolucaoComDefeito}
                    onChange={() => setDevolucaoComDefeito(true)}
                  />
                  <span>
                    <strong>Devolvida com defeito / avaria</strong> (Bloqueia para Manutencao)
                  </span>
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '16px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setFerramentaParaDevolucao(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={devolverFerramentaMutation.isPending}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: devolucaoComDefeito ? '#b91c1c' : '#15803d',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
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

      {/* Modal Criar/Editar Ferramenta */}
      {modalFerramentaAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>
                {ferramentaEmEdicao
                  ? `Editar Ferramenta (${ferramentaEmEdicao.codigo})`
                  : 'Nova Ferramenta'}
              </h2>
              <button
                type="button"
                onClick={() => setModalFerramentaAberto(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1rem',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                X
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                salvarFerramentaMutation.mutate()
              }}
              style={{ display: 'grid', gap: '16px' }}
            >
              <div>
                <label
                  htmlFor="ferramenta-codigo"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '8px',
                  }}
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
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    backgroundColor: ferramentaEmEdicao ? '#f1f5f9' : '#ffffff',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="ferramenta-nome"
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '8px',
                  }}
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
                  style={{
                    width: '100%',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '16px',
                  marginTop: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalFerramentaAberto(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvarFerramentaMutation.isPending}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: '#0369a1',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
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
