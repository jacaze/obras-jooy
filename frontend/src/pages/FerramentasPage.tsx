import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFerramentas,
  createFerramenta,
  updateFerramenta,
  registrarEmprestimoFerramenta,
  registrarDevolucaoFerramenta,
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

  // Modais
  const [modalFerramentaAberto, setModalFerramentaAberto] = useState(false)
  const [ferramentaEmEdicao, setFerramentaEmEdicao] = useState<Ferramenta | null>(null)
  const [formCodigo, setFormCodigo] = useState('')
  const [formNome, setFormNome] = useState('')

  const [modalEmprestimoAberto, setModalEmprestimoAberto] = useState(false)
  const [ferramentaParaEmprestimo, setFerramentaParaEmprestimo] = useState<Ferramenta | null>(null)
  const [usuarioSolicitanteId, setUsuarioSolicitanteId] = useState('')

  const [modalDevolucaoAberto, setModalDevolucaoAberto] = useState(false)
  const [ferramentaParaDevolucao, setFerramentaParaDevolucao] = useState<Ferramenta | null>(null)
  const [comDefeitoDevolucao, setComDefeitoDevolucao] = useState(false)

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

  const { data: usuarios = [] } = useQuery({
    queryKey: ['usuarios-listagem'],
    queryFn: () => getUsuarios(),
  })

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
      setMensagemSucesso('Ferramenta salva com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao salvar ferramenta.')
    },
  })

  const emprestimoMutation = useMutation({
    mutationFn: async () => {
      if (!ferramentaParaEmprestimo || !usuarioSolicitanteId) return
      return registrarEmprestimoFerramenta(ferramentaParaEmprestimo.id, usuarioSolicitanteId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setModalEmprestimoAberto(false)
      setFerramentaParaEmprestimo(null)
      setUsuarioSolicitanteId('')
      setMensagemSucesso('Emprestimo da ferramenta registrado com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao registrar emprestimo.')
    },
  })

  const devolucaoMutation = useMutation({
    mutationFn: async () => {
      if (!ferramentaParaDevolucao) return
      return registrarDevolucaoFerramenta(ferramentaParaDevolucao.id, comDefeitoDevolucao)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferramentas'] })
      setModalDevolucaoAberto(false)
      setFerramentaParaDevolucao(null)
      setComDefeitoDevolucao(false)
      setMensagemSucesso('Devolucao da ferramenta registrada com sucesso.')
    },
    onError: (err: any) => {
      setMensagemErro(err.response?.data?.erro || err.response?.data?.message || 'Erro ao registrar devolucao.')
    },
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
      {/* Cabecalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Controle de Ferramentas e Ativos
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            Itens devolutivos individuais com rastreamento de status e usuario solicitante.
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
              padding: '0.6rem 1.25rem',
              backgroundColor: '#0284c7',
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

      {/* Alertas */}
      {mensagemSucesso && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            color: '#166534',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {mensagemSucesso}
        </div>
      )}

      {mensagemErro && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {mensagemErro}
        </div>
      )}

      {/* Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          backgroundColor: '#f8fafc',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '1.5rem',
          alignItems: 'end',
        }}
      >
        <div>
          <label
            htmlFor="filtro-ferramenta-busca"
            style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
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
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="filtro-ferramenta-status"
            style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}
          >
            Status Operacional
          </label>
          <select
            id="filtro-ferramenta-status"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem' }}>
          <input
            id="filtro-ferramenta-ativas"
            type="checkbox"
            checked={somenteAtivas}
            onChange={(e) => setSomenteAtivas(e.target.checked)}
            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
          />
          <label
            htmlFor="filtro-ferramenta-ativas"
            style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500, cursor: 'pointer' }}
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
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Código / Identificação
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Nome da Ferramenta
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Status
                </th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Emprestado Para
                </th>
                {podeGerenciar && (
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {carregandoFerramentas ? (
                <tr>
                  <td colSpan={podeGerenciar ? 5 : 4} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    Carregando ferramentas cadastradas...
                  </td>
                </tr>
              ) : ferramentas.length === 0 ? (
                <tr>
                  <td colSpan={podeGerenciar ? 5 : 4} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                    Nenhuma ferramenta encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                ferramentas.map((fer) => {
                  return (
                    <tr key={fer.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>
                        {fer.codigo}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                        {fer.nome}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {fer.status === 'DISPONIVEL' && (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Disponível
                          </span>
                        )}
                        {fer.status === 'EMPRESTADO' && (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Emprestado
                          </span>
                        )}
                        {fer.status === 'COM_DEFEITO' && (
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Com Defeito
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>
                        {fer.status === 'EMPRESTADO' && fer.emprestadoPara ? (
                          <div>
                            <span style={{ fontWeight: 600, color: '#0369a1' }}>
                              {fer.emprestadoPara.nome}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.4rem' }}>
                              (@{fer.emprestadoPara.login})
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      {podeGerenciar && (
                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {fer.status === 'DISPONIVEL' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFerramentaParaEmprestimo(fer)
                                  setUsuarioSolicitanteId(usuarios[0]?.id || '')
                                  setMensagemErro(null)
                                  setModalEmprestimoAberto(true)
                                }}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  backgroundColor: '#0284c7',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
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
                                  setComDefeitoDevolucao(false)
                                  setMensagemErro(null)
                                  setModalDevolucaoAberto(true)
                                }}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  backgroundColor: '#16a34a',
                                  border: 'none',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Devolver
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
                                padding: '0.35rem 0.7rem',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                color: '#1e293b',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Editar
                            </button>
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
            padding: '1rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                {ferramentaEmEdicao ? `Editar Ferramenta (${ferramentaEmEdicao.codigo})` : 'Nova Ferramenta'}
              </h2>
              <button
                type="button"
                onClick={() => setModalFerramentaAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer' }}
              >
                X
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                salvarFerramentaMutation.mutate()
              }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <div>
                <label
                  htmlFor="ferramenta-codigo"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
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
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    backgroundColor: ferramentaEmEdicao ? '#f1f5f9' : '#ffffff',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="ferramenta-nome"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
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
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalFerramentaAberto(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.85rem',
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
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#0284c7',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
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

      {/* Modal Emprestar Ferramenta */}
      {modalEmprestimoAberto && ferramentaParaEmprestimo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Registrar Empréstimo
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.25rem 0' }}>
              Ferramenta: <strong>{ferramentaParaEmprestimo.codigo}</strong> - {ferramentaParaEmprestimo.nome}
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                emprestimoMutation.mutate()
              }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <div>
                <label
                  htmlFor="usuario-solicitante"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.25rem' }}
                >
                  Usuário Solicitante (quem está retirando) *
                </label>
                <select
                  id="usuario-solicitante"
                  required
                  value={usuarioSolicitanteId}
                  onChange={(e) => setUsuarioSolicitanteId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Selecione o usuário...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.cargo?.nome || u.perfil})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalEmprestimoAberto(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={emprestimoMutation.isPending}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#0284c7',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {emprestimoMutation.isPending ? 'Registrando...' : 'Confirmar Empréstimo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Devolver Ferramenta */}
      {modalDevolucaoAberto && ferramentaParaDevolucao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Registrar Devolução da Ferramenta
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
              Confirmar o retorno de <strong>{ferramentaParaDevolucao.codigo}</strong> ao almoxarifado.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                devolucaoMutation.mutate()
              }}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={comDefeitoDevolucao}
                  onChange={(e) => setComDefeitoDevolucao(e.target.checked)}
                  style={{ width: '1rem', height: '1rem' }}
                />
                <span style={{ color: comDefeitoDevolucao ? '#b91c1c' : '#334155', fontWeight: 600 }}>
                  A ferramenta retornou com defeito/avaria? (marcará como "Com Defeito")
                </span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalDevolucaoAberto(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={devolucaoMutation.isPending}
                  style={{
                    padding: '0.5rem 1.25rem',
                    backgroundColor: '#16a34a',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {devolucaoMutation.isPending ? 'Devolvendo...' : 'Confirmar Devolução'}
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
