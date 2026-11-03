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
    <div style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
      {/* Cabecalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Controle de Ferramentas e Ativos
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '1rem' }}>
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
            + Nova Ferramenta
          </button>
        )}
      </div>

      {/* Faixa de Indicadores Operacionais (KPIs) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '16px 24px',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Total Cadastradas
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#0f172a',
              marginTop: '8px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalFerramentas}
          </strong>
          <span style={{ fontSize: '0.875rem', color: '#475569' }}>
            Ativos catalogados no almoxarifado
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            padding: '16px 24px',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#166534',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Disponiveis para Uso
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#15803d',
              marginTop: '8px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalDisponiveis}
          </strong>
          <span style={{ fontSize: '0.875rem', color: '#166534' }}>
            Prontas para retirada imediata
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: '8px',
            border: '1px solid #fde68a',
            padding: '16px 24px',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#b45309',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Emprestadas em Campo
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#b45309',
              marginTop: '8px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalEmprestadas}
          </strong>
          <span style={{ fontSize: '0.875rem', color: '#92400e' }}>
            Sob responsabilidade de colaboradores
          </span>
        </div>

        <div
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            padding: '16px 24px',
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#b91c1c',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Em Manutencao / Defeito
          </span>
          <strong
            style={{
              display: 'block',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#b91c1c',
              marginTop: '8px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {totalComDefeito}
          </strong>
          <span style={{ fontSize: '0.875rem', color: '#991b1b' }}>
            Bloqueadas ate conclusao de conserto
          </span>
        </div>
      </div>

      {/* Alertas */}
      {mensagemSucesso && (
        <div
          role="status"
          style={{
            padding: '16px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#166534',
            marginBottom: '16px',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{mensagemSucesso}</span>
          <button
            type="button"
            onClick={() => setMensagemSucesso(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#166534',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            X
          </button>
        </div>
      )}

      {mensagemErro && (
        <div
          role="alert"
          style={{
            padding: '16px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            marginBottom: '16px',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{mensagemErro}</span>
          <button
            type="button"
            onClick={() => setMensagemErro(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#991b1b',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            X
          </button>
        </div>
      )}

      {/* Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          backgroundColor: '#f8fafc',
          padding: '24px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '24px',
          alignItems: 'end',
        }}
      >
        <div>
          <label
            htmlFor="filtro-ferramenta-busca"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px',
            }}
          >
            Buscar Ferramenta
          </label>
          <input
            id="filtro-ferramenta-busca"
            type="text"
            placeholder="Nome ou código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
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

        <div>
          <label
            htmlFor="filtro-ferramenta-status"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#475569',
              marginBottom: '8px',
            }}
          >
            Status Operacional
          </label>
          <select
            id="filtro-ferramenta-status"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          >
            <option value="">Todos os status</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="EMPRESTADO">Emprestado</option>
            <option value="COM_DEFEITO">Com Defeito</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px' }}>
          <input
            id="filtro-ferramenta-ativas"
            type="checkbox"
            checked={somenteAtivas}
            onChange={(e) => setSomenteAtivas(e.target.checked)}
            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
          />
          <label
            htmlFor="filtro-ferramenta-ativas"
            style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 400, cursor: 'pointer' }}
          >
            Exibir somente ativas
          </label>
        </div>
      </div>

      {/* Tabela de Ferramentas */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
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
  )
}
export default FerramentasPage
