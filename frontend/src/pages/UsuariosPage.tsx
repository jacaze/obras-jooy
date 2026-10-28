import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCargo,
  createUsuario,
  getCargos,
  getUsuarios,
  resetarSenhaUsuario,
  toggleCargoSituacao,
  toggleUsuarioSituacao,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { PerfilUsuario } from '../types/auth'

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

export function UsuariosPage() {
  const { usuario: usuarioLogado } = useAuth()
  const queryClient = useQueryClient()

  // Controle de abas: 'usuarios' ou 'cargos'
  const [abaAtiva, setAbaAtiva] = useState<'usuarios' | 'cargos'>('usuarios')

  // Filtros de busca
  const [busca, setBusca] = useState('')
  const [buscaCargo, setBuscaCargo] = useState('')

  // Modais
  const [modalNovoUsuarioAberto, setModalNovoUsuarioAberto] = useState(false)
  const [modalResetSenhaAberto, setModalResetSenhaAberto] = useState(false)
  const [modalNovoCargoAberto, setModalNovoCargoAberto] = useState(false)

  // Estados do formulario de criacao de usuario
  const [novoNome, setNovoNome] = useState('')
  const [novoLogin, setNovoLogin] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoPerfil, setNovoPerfil] = useState<PerfilUsuario>('ALMOXARIFE')
  const [novoCargoId, setNovoCargoId] = useState('')
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Estados do formulario de criacao de cargo
  const [nomeNovoCargo, setNomeNovoCargo] = useState('')
  const [erroCargo, setErroCargo] = useState<string | null>(null)

  // Estados do modal de reset de senha
  const [usuarioAlvoReset, setUsuarioAlvoReset] = useState<{ id: string; nome: string } | null>(null)
  const [senhaResetVal, setSenhaResetVal] = useState('')
  const [mensagemSucessoReset, setMensagemSucessoReset] = useState<string | null>(null)

  // Queries
  const { data: usuarios = [], isLoading: carregandoUsuarios } = useQuery({
    queryKey: ['usuarios'],
    queryFn: getUsuarios,
  })

  // Cargos ativos (para o select do usuario)
  const { data: cargosAtivos = [] } = useQuery({
    queryKey: ['cargos'],
    queryFn: () => getCargos(true),
  })

  // Todos os cargos (para a aba de administracao de cargos)
  const { data: todosOsCargos = [], isLoading: carregandoCargos } = useQuery({
    queryKey: ['cargos-todos'],
    queryFn: () => getCargos(false),
  })

  // Mutations
  const criarUsuarioMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      queryClient.invalidateQueries({ queryKey: ['cargos-todos'] })
      setModalNovoUsuarioAberto(false)
      limparFormUsuario()
    },
    onError: (err: any) => {
      setErroForm(extrairErro(err, 'Erro ao cadastrar usuario'))
    },
  })

  const toggleUsuarioMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      toggleUsuarioSituacao(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
    },
  })

  const toggleCargoMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      toggleCargoSituacao(id, ativo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] })
      queryClient.invalidateQueries({ queryKey: ['cargos-todos'] })
    },
  })

  const resetarSenhaMutation = useMutation({
    mutationFn: ({ id, novaSenha }: { id: string; novaSenha: string }) =>
      resetarSenhaUsuario(id, novaSenha),
    onSuccess: () => {
      setMensagemSucessoReset('Senha resetada com sucesso!')
      setTimeout(() => {
        setModalResetSenhaAberto(false)
        setMensagemSucessoReset(null)
        setSenhaResetVal('')
        setUsuarioAlvoReset(null)
      }, 1500)
    },
    onError: (err: any) => {
      setErroForm(extrairErro(err, 'Erro ao resetar senha'))
    },
  })

  const criarCargoMutation = useMutation({
    mutationFn: createCargo,
    onSuccess: (cargoCriado) => {
      queryClient.invalidateQueries({ queryKey: ['cargos'] })
      queryClient.invalidateQueries({ queryKey: ['cargos-todos'] })
      setNovoCargoId(cargoCriado.id)
      setModalNovoCargoAberto(false)
      setNomeNovoCargo('')
    },
    onError: (err: any) => {
      setErroCargo(extrairErro(err, 'Erro ao criar cargo'))
    },
  })

  function limparFormUsuario() {
    setNovoNome('')
    setNovoLogin('')
    setNovaSenha('')
    setNovoPerfil('ALMOXARIFE')
    setNovoCargoId('')
    setErroForm(null)
  }

  function handleCriarUsuario(e: FormEvent) {
    e.preventDefault()
    setErroForm(null)

    if (!novoCargoId) {
      setErroForm('Selecione ou cadastre um cargo para o usuario')
      return
    }

    criarUsuarioMutation.mutate({
      nome: novoNome,
      login: novoLogin,
      senha: novaSenha,
      perfil: novoPerfil,
      cargoId: novoCargoId,
    })
  }

  function handleCriarCargoRapido(e: FormEvent) {
    e.preventDefault()
    setErroCargo(null)

    if (!nomeNovoCargo.trim()) {
      setErroCargo('Informe o nome do cargo')
      return
    }

    criarCargoMutation.mutate(nomeNovoCargo.trim())
  }

  function handleResetarSenha(e: FormEvent) {
    e.preventDefault()
    if (!usuarioAlvoReset || !senhaResetVal.trim()) return

    resetarSenhaMutation.mutate({
      id: usuarioAlvoReset.id,
      novaSenha: senhaResetVal.trim(),
    })
  }

  // Filtragem de usuarios
  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.toLowerCase()
    return (
      u.nome.toLowerCase().includes(termo) ||
      u.login.toLowerCase().includes(termo) ||
      u.cargo.nome.toLowerCase().includes(termo) ||
      u.perfil.toLowerCase().includes(termo)
    )
  })

  // Filtragem de cargos
  const cargosFiltrados = todosOsCargos.filter((c) => {
    const termo = buscaCargo.toLowerCase()
    return c.nome.toLowerCase().includes(termo)
  })

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Cabecalho Principal */}
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
            Painel Administrativo
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            Controle de acessos de usuarios e cadastro de cargos do canteiro de obras
          </p>
        </div>

        <div>
          {abaAtiva === 'usuarios' ? (
            <button
              onClick={() => {
                limparFormUsuario()
                setModalNovoUsuarioAberto(true)
              }}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Novo Usuario
            </button>
          ) : (
            <button
              onClick={() => {
                setNomeNovoCargo('')
                setErroCargo(null)
                setModalNovoCargoAberto(true)
              }}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.2rem',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Novo Cargo
            </button>
          )}
        </div>
      </div>

      {/* Navegacao por Abas */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setAbaAtiva('usuarios')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: abaAtiva === 'usuarios' ? '3px solid #0284c7' : '3px solid transparent',
            color: abaAtiva === 'usuarios' ? '#0284c7' : '#64748b',
            fontWeight: abaAtiva === 'usuarios' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '-2px',
          }}
        >
          Gestao de Usuarios ({usuarios.length})
        </button>

        <button
          onClick={() => setAbaAtiva('cargos')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: abaAtiva === 'cargos' ? '3px solid #0284c7' : '3px solid transparent',
            color: abaAtiva === 'cargos' ? '#0284c7' : '#64748b',
            fontWeight: abaAtiva === 'cargos' ? 700 : 500,
            cursor: 'pointer',
            fontSize: '1rem',
            marginBottom: '-2px',
          }}
        >
          Gerenciamento de Cargos ({todosOsCargos.length})
        </button>
      </div>

      {/* ABA 1: USUARIOS */}
      {abaAtiva === 'usuarios' && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Buscar por nome, login, cargo ou perfil..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '450px',
                padding: '0.6rem 1rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {carregandoUsuarios ? (
            <p style={{ color: '#64748b' }}>Carregando usuarios...</p>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nome</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Login</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Cargo</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Perfil</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Situacao</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u) => {
                    const ehOUsuarioLogado = usuarioLogado?.id === u.id

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#1e293b' }}>
                          {u.nome} {ehOUsuarioLogado && <span style={{ color: '#0284c7', fontSize: '0.75rem' }}>(Voce)</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{u.login}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#334155' }}>{u.cargo.nome}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              backgroundColor: u.perfil === 'ADMIN' ? '#fef3c7' : '#e0f2fe',
                              color: u.perfil === 'ADMIN' ? '#92400e' : '#0369a1',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {u.perfil}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              backgroundColor: u.ativo ? '#dcfce7' : '#fee2e2',
                              color: u.ativo ? '#166534' : '#991b1b',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => {
                                setUsuarioAlvoReset({ id: u.id, nome: u.nome })
                                setSenhaResetVal('')
                                setModalResetSenhaAberto(true)
                              }}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                            >
                              Resetar Senha
                            </button>

                            <button
                              disabled={ehOUsuarioLogado || toggleUsuarioMutation.isPending}
                              onClick={() => toggleUsuarioMutation.mutate({ id: u.id, ativo: !u.ativo })}
                              style={{
                                backgroundColor: u.ativo ? '#fef2f2' : '#f0fdf4',
                                color: u.ativo ? '#b91c1c' : '#15803d',
                                border: `1px solid ${u.ativo ? '#fecaca' : '#bbf7d0'}`,
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: ehOUsuarioLogado ? 'not-allowed' : 'pointer',
                                fontSize: '0.8rem',
                                opacity: ehOUsuarioLogado ? 0.4 : 1,
                              }}
                            >
                              {u.ativo ? 'Desativar' : 'Ativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {usuariosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        Nenhum usuario encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ABA 2: CARGOS */}
      {abaAtiva === 'cargos' && (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Buscar por nome do cargo..."
              value={buscaCargo}
              onChange={(e) => setBuscaCargo(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '450px',
                padding: '0.6rem 1rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {carregandoCargos ? (
            <p style={{ color: '#64748b' }}>Carregando cargos...</p>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                border: '1px solid #e2e8f0',
                overflowX: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Nome da Funcao / Cargo</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Usuarios Vinculados</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Situacao</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Cadastrado Em</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {cargosFiltrados.map((c) => {
                    const qtdUsuarios = c._count?.usuarios ?? 0

                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: '#1e293b' }}>
                          {c.nome}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                          <span
                            style={{
                              backgroundColor: qtdUsuarios > 0 ? '#e0f2fe' : '#f1f5f9',
                              color: qtdUsuarios > 0 ? '#0369a1' : '#64748b',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {qtdUsuarios} {qtdUsuarios === 1 ? 'usuario' : 'usuarios'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span
                            style={{
                              backgroundColor: c.ativo ? '#dcfce7' : '#fee2e2',
                              color: c.ativo ? '#166534' : '#991b1b',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            {c.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                          {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            disabled={toggleCargoMutation.isPending}
                            onClick={() => toggleCargoMutation.mutate({ id: c.id, ativo: !c.ativo })}
                            style={{
                              backgroundColor: c.ativo ? '#fef2f2' : '#f0fdf4',
                              color: c.ativo ? '#b91c1c' : '#15803d',
                              border: `1px solid ${c.ativo ? '#fecaca' : '#bbf7d0'}`,
                              padding: '0.3rem 0.6rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            {c.ativo ? 'Desativar Cargo' : 'Ativar Cargo'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {cargosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        Nenhum cargo encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal: Novo Usuario */}
      {modalNovoUsuarioAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: '#0f172a' }}>Cadastrar Novo Usuario</h2>

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

            <form onSubmit={handleCriarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="ex: Carlos Alberto de Souza"
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Login
                </label>
                <input
                  type="text"
                  required
                  value={novoLogin}
                  onChange={(e) => setNovoLogin(e.target.value)}
                  placeholder="ex: carlos.souza"
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Senha Inicial (min. 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Defina a senha inicial"
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Perfil de Acesso
                </label>
                <select
                  value={novoPerfil}
                  onChange={(e) => setNovoPerfil(e.target.value as PerfilUsuario)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                >
                  <option value="ALMOXARIFE" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>ALMOXARIFE (Recebe, separa e baixa material)</option>
                  <option value="ENCARREGADO" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>ENCARREGADO (Pede material pelo celular)</option>
                  <option value="ENGENHARIA" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>ENGENHARIA (Define limites de consumo)</option>
                  <option value="ADMINISTRACAO" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>ADMINISTRACAO (Relatorios gerenciais)</option>
                  <option value="ADMIN" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>ADMIN (Controle total de usuarios e cadastros)</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>Cargo Exercido</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNomeNovoCargo('')
                      setErroCargo(null)
                      setModalNovoCargoAberto(true)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: 0,
                    }}
                  >
                    + Novo Cargo
                  </button>
                </div>
                <select
                  value={novoCargoId}
                  onChange={(e) => setNovoCargoId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                  }}
                >
                  <option value="" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Selecione o cargo...</option>
                  {cargosAtivos.map((c) => (
                    <option key={c.id} value={c.id} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNovoUsuarioAberto(false)}
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
                  disabled={criarUsuarioMutation.isPending}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {criarUsuarioMutation.isPending ? 'Salvando...' : 'Salvar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rapido: Criar Novo Cargo */}
      {modalNovoCargoAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#0f172a' }}>Cadastrar Novo Cargo</h3>

            {erroCargo && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  border: '1px solid #fecaca',
                }}
              >
                {erroCargo}
              </div>
            )}

            <form onSubmit={handleCriarCargoRapido}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Nome da Funcao / Cargo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Mestre de Obras"
                  value={nomeNovoCargo}
                  onChange={(e) => setNomeNovoCargo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalNovoCargoAberto(false)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarCargoMutation.isPending}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {criarCargoMutation.isPending ? 'Cadastrando...' : 'Cadastrar Cargo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset de Senha */}
      {modalResetSenhaAberto && usuarioAlvoReset && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
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
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Resetar Senha de Acesso</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 1rem' }}>
              Defina a nova senha para o usuario: <strong>{usuarioAlvoReset.nome}</strong>
            </p>

            {mensagemSucessoReset && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  color: '#15803d',
                  padding: '0.6rem',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  border: '1px solid #bbf7d0',
                }}
              >
                {mensagemSucessoReset}
              </div>
            )}

            <form onSubmit={handleResetarSenha}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem', fontWeight: 500 }}>
                  Nova Senha (min. 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nova senha temporaria"
                  value={senhaResetVal}
                  onChange={(e) => setSenhaResetVal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalResetSenhaAberto(false)}
                  style={{
                    padding: '0.5rem 0.9rem',
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
                  disabled={resetarSenhaMutation.isPending}
                  style={{
                    padding: '0.5rem 0.9rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {resetarSenhaMutation.isPending ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
