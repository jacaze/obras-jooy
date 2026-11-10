import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCargo,
  createUsuario,
  deleteUsuario,
  getCargos,
  getObras,
  getUsuarios,
  resetarSenhaUsuario,
  toggleCargoSituacao,
  toggleUsuarioSituacao,
  updateUsuario,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'
import type { PerfilUsuario, UsuarioListagem } from '../types/auth'

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
  const [modalEditarUsuarioAberto, setModalEditarUsuarioAberto] = useState(false)
  const [modalExcluirUsuarioAberto, setModalExcluirUsuarioAberto] = useState(false)
  const [modalResetSenhaAberto, setModalResetSenhaAberto] = useState(false)
  const [modalNovoCargoAberto, setModalNovoCargoAberto] = useState(false)

  // Estados do formulario de criacao de usuario
  const [novoNome, setNovoNome] = useState('')
  const [novoLogin, setNovoLogin] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoPerfil, setNovoPerfil] = useState<PerfilUsuario>('ALMOXARIFE')
  const [novoCargoId, setNovoCargoId] = useState('')
  const [novoObraId, setNovoObraId] = useState('')
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Estados do formulario de edicao de usuario
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioListagem | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editLogin, setEditLogin] = useState('')
  const [editPerfil, setEditPerfil] = useState<PerfilUsuario>('ALMOXARIFE')
  const [editCargoId, setEditCargoId] = useState('')
  const [editObraId, setEditObraId] = useState('')
  const [erroEditForm, setErroEditForm] = useState<string | null>(null)

  // Estados de exclusao de usuario
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<UsuarioListagem | null>(null)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

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

  const { data: obras = [] } = useQuery({
    queryKey: ['obras-ativas'],
    queryFn: () => getObras(true),
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
      setEditCargoId(cargoCriado.id)
      setModalNovoCargoAberto(false)
      setNomeNovoCargo('')
    },
    onError: (err: any) => {
      setErroCargo(extrairErro(err, 'Erro ao criar cargo'))
    },
  })

  const editarUsuarioMutation = useMutation({
    mutationFn: ({
      id,
      dados,
    }: {
      id: string
      dados: { nome: string; login: string; perfil: PerfilUsuario; cargoId: string; obraId?: string | null }
    }) => updateUsuario(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setModalEditarUsuarioAberto(false)
      setUsuarioEditando(null)
      setErroEditForm(null)
    },
    onError: (err: any) => {
      setErroEditForm(extrairErro(err, 'Erro ao atualizar usuario'))
    },
  })

  const excluirUsuarioMutation = useMutation({
    mutationFn: (id: string) => deleteUsuario(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setModalExcluirUsuarioAberto(false)
      setUsuarioExcluindo(null)
      setErroExcluir(null)
    },
    onError: (err: any) => {
      setErroExcluir(extrairErro(err, 'Erro ao excluir usuario'))
    },
  })

  function abrirModalEdicao(u: UsuarioListagem) {
    setUsuarioEditando(u)
    setEditNome(u.nome)
    setEditLogin(u.login)
    setEditPerfil(u.perfil)
    setEditCargoId(u.cargo.id)
    setEditObraId(u.obraId || '')
    setErroEditForm(null)
    setModalEditarUsuarioAberto(true)
  }

  function handleAtualizarUsuario(e: FormEvent) {
    e.preventDefault()
    setErroEditForm(null)

    if (!usuarioEditando) return
    if (!editCargoId) {
      setErroEditForm('Selecione um cargo para o usuario')
      return
    }

    editarUsuarioMutation.mutate({
      id: usuarioEditando.id,
      dados: {
        nome: editNome.trim(),
        login: editLogin.trim(),
        perfil: editPerfil,
        cargoId: editCargoId,
        obraId: editObraId || null,
      },
    })
  }

  function abrirModalExclusao(u: UsuarioListagem) {
    setUsuarioExcluindo(u)
    setErroExcluir(null)
    setModalExcluirUsuarioAberto(true)
  }

  function handleConfirmarExclusao() {
    if (!usuarioExcluindo) return
    excluirUsuarioMutation.mutate(usuarioExcluindo.id)
  }

  function limparFormUsuario() {
    setNovoNome('')
    setNovoLogin('')
    setNovaSenha('')
    setNovoPerfil('ALMOXARIFE')
    setNovoCargoId('')
    setNovoObraId('')
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
      obraId: novoObraId || null,
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
    <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 pb-24 font-body text-on-surface">
      {/* Cabecalho Principal */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="ob-heading text-2xl sm:text-3xl font-bold text-on-surface tracking-tight m-0">
            Painel Administrativo
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-body mt-1">
            Controle de acessos de usuarios e cadastro de cargos do canteiro de obras
          </p>
        </div>

        <div>
          {abaAtiva === 'usuarios' ? (
            <button
              type="button"
              onClick={() => {
                limparFormUsuario()
                setModalNovoUsuarioAberto(true)
              }}
              className="ob-btn ob-btn--primary ob-btn--sm min-h-[44px]"
            >
              + Novo Usuario
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNomeNovoCargo('')
                setErroCargo(null)
                setModalNovoCargoAberto(true)
              }}
              className="ob-btn ob-btn--primary ob-btn--sm min-h-[44px]"
            >
              + Novo Cargo
            </button>
          )}
        </div>
      </div>

      {/* Navegacao por Abas */}
      <div className="ob-tabs mb-6">
        <button
          type="button"
          aria-selected={abaAtiva === 'usuarios'}
          onClick={() => setAbaAtiva('usuarios')}
          className="ob-tab"
        >
          Gestao de Usuarios ({usuarios.length})
        </button>

        <button
          type="button"
          aria-selected={abaAtiva === 'cargos'}
          onClick={() => setAbaAtiva('cargos')}
          className="ob-tab"
        >
          Gerenciamento de Cargos ({todosOsCargos.length})
        </button>
      </div>

      {/* ABA 1: USUARIOS */}
      {abaAtiva === 'usuarios' && (
        <>
          <div className="ob-search max-w-md mb-6">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Buscar por nome, login, cargo ou perfil..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="ob-input text-xs sm:text-sm"
            />
          </div>

          {carregandoUsuarios ? (
            <p className="text-sm text-on-surface-variant font-body">Carregando usuarios...</p>
          ) : (
            <div className="ob-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="ob-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Login</th>
                      <th>Cargo</th>
                      <th>Perfil</th>
                      <th>Obra de Lotacao</th>
                      <th>Situacao</th>
                      <th style={{ textAlign: 'right' }}>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((u) => {
                      const ehOUsuarioLogado = usuarioLogado?.id === u.id

                      return (
                        <tr key={u.id}>
                          <td className="font-medium text-on-surface">
                            {u.nome} {ehOUsuarioLogado && <span className="text-accent-text text-xs ml-1 font-semibold">(Voce)</span>}
                          </td>
                          <td className="text-on-surface-variant font-mono">{u.login}</td>
                          <td className="text-on-surface font-body">{u.cargo.nome}</td>
                          <td>
                            <span
                              className={`ob-badge ${
                                u.perfil === 'ADMIN' ? 'ob-badge--low' : 'ob-badge--info'
                              }`}
                            >
                              {u.perfil}
                            </span>
                          </td>
                          <td className="text-on-surface-variant text-xs font-body">
                            {u.obra ? (
                              <span>
                                <strong className="text-on-surface">{u.obra.codigo}</strong> - {u.obra.nome}
                              </span>
                            ) : (
                              <span className="text-on-surface-variant/60 italic">Todas / Global</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`ob-badge ${
                                u.ativo ? 'ob-badge--ok' : 'ob-badge--crit'
                              }`}
                            >
                              {u.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="inline-flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => abrirModalEdicao(u)}
                                className="ob-btn ob-btn--outline ob-btn--sm"
                              >
                                Editar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setUsuarioAlvoReset({ id: u.id, nome: u.nome })
                                  setSenhaResetVal('')
                                  setModalResetSenhaAberto(true)
                                }}
                                className="ob-btn ob-btn--outline ob-btn--sm"
                              >
                                Resetar Senha
                              </button>

                              <button
                                type="button"
                                disabled={ehOUsuarioLogado || toggleUsuarioMutation.isPending}
                                onClick={() => toggleUsuarioMutation.mutate({ id: u.id, ativo: !u.ativo })}
                                className="ob-btn ob-btn--outline ob-btn--sm disabled:opacity-40"
                              >
                                {u.ativo ? 'Desativar' : 'Ativar'}
                              </button>

                              <button
                                type="button"
                                disabled={ehOUsuarioLogado || excluirUsuarioMutation.isPending}
                                onClick={() => abrirModalExclusao(u)}
                                className="ob-btn ob-btn--outline ob-btn--sm text-error border-error/30 hover:bg-error-container/20 disabled:opacity-40"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {usuariosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-on-surface-variant font-body">
                          Nenhum usuario encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ABA 2: CARGOS */}
      {abaAtiva === 'cargos' && (
        <>
          <div className="ob-search max-w-md mb-6">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Buscar por nome do cargo..."
              value={buscaCargo}
              onChange={(e) => setBuscaCargo(e.target.value)}
              className="ob-input text-xs sm:text-sm"
            />
          </div>

          {carregandoCargos ? (
            <p className="text-sm text-on-surface-variant font-body">Carregando cargos...</p>
          ) : (
            <div className="ob-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="ob-table">
                  <thead>
                    <tr>
                      <th>Nome da Funcao / Cargo</th>
                      <th>Usuarios Vinculados</th>
                      <th>Situacao</th>
                      <th>Cadastrado Em</th>
                      <th style={{ textAlign: 'right' }}>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargosFiltrados.map((c) => {
                      const qtdUsuarios = c._count?.usuarios ?? 0

                      return (
                        <tr key={c.id}>
                          <td className="font-medium text-on-surface">
                            {c.nome}
                          </td>
                          <td className="text-on-surface-variant font-mono">
                            <span className="ob-badge ob-badge--info">
                              {qtdUsuarios} {qtdUsuarios === 1 ? 'usuario' : 'usuarios'}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`ob-badge ${
                                c.ativo ? 'ob-badge--ok' : 'ob-badge--crit'
                              }`}
                            >
                              {c.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="text-on-surface-variant font-mono tabular-nums text-xs">
                            {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              disabled={toggleCargoMutation.isPending}
                              onClick={() => toggleCargoMutation.mutate({ id: c.id, ativo: !c.ativo })}
                              className="ob-btn ob-btn--outline ob-btn--sm"
                            >
                              {c.ativo ? 'Desativar Cargo' : 'Ativar Cargo'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {cargosFiltrados.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-on-surface-variant font-body">
                          Nenhum cargo encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Novo Usuario */}
      {modalNovoUsuarioAberto && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h2 className="ob-heading text-xl font-bold text-on-surface mb-4">Cadastrar Novo Usuario</h2>

            {erroForm && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-4 text-sm">
                {erroForm}
              </div>
            )}

            <form onSubmit={handleCriarUsuario} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="ex: Carlos Alberto de Souza"
                  className="ob-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Login
                </label>
                <input
                  type="text"
                  required
                  value={novoLogin}
                  onChange={(e) => setNovoLogin(e.target.value)}
                  placeholder="ex: carlos.souza"
                  className="ob-input w-full font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Senha Inicial (min. 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Defina a senha inicial"
                  className="ob-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Perfil de Acesso
                </label>
                <select
                  value={novoPerfil}
                  onChange={(e) => setNovoPerfil(e.target.value as PerfilUsuario)}
                  className="ob-input w-full text-sm font-body"
                >
                  <option value="ALMOXARIFE">ALMOXARIFE (Recebe, separa e baixa material)</option>
                  <option value="ENCARREGADO">ENCARREGADO (Pede material pelo celular)</option>
                  <option value="ENGENHARIA">ENGENHARIA (Define limites de consumo)</option>
                  <option value="ADMINISTRACAO">ADMINISTRACAO (Relatorios gerenciais)</option>
                  <option value="ADMIN">ADMIN (Controle total de usuarios e cadastros)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-on-surface font-body">Cargo Exercido</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNomeNovoCargo('')
                      setErroCargo(null)
                      setModalNovoCargoAberto(true)
                    }}
                    className="text-xs sm:text-sm font-semibold text-accent-text hover:underline cursor-pointer"
                  >
                    + Novo Cargo
                  </button>
                </div>
                <select
                  value={novoCargoId}
                  onChange={(e) => setNovoCargoId(e.target.value)}
                  required
                  className="ob-input w-full text-sm font-body"
                >
                  <option value="">Selecione o cargo...</option>
                  {cargosAtivos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Obra de Lotacao (Canteiro Fixo)
                </label>
                <select
                  value={novoObraId}
                  onChange={(e) => setNovoObraId(e.target.value)}
                  className="ob-input w-full text-sm font-body"
                >
                  <option value="">Sem obra fixa (Acesso Global / Engenharia / Admin)</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.codigo} - {o.nome} ({o.cidade})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-on-surface-variant font-body">
                  Para Encarregados e Almoxarifes, vincule a obra para travar o canteiro e evitar selecao manual.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalNovoUsuarioAberto(false)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarUsuarioMutation.isPending}
                  className="ob-btn ob-btn--primary"
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
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h3 className="ob-heading text-lg font-bold text-on-surface mb-4">Cadastrar Novo Cargo</h3>

            {erroCargo && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-3 rounded-xl mb-4 text-xs sm:text-sm">
                {erroCargo}
              </div>
            )}

            <form onSubmit={handleCriarCargoRapido} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Nome da Funcao / Cargo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Mestre de Obras"
                  value={nomeNovoCargo}
                  onChange={(e) => setNomeNovoCargo(e.target.value)}
                  className="ob-input w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNovoCargoAberto(false)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={criarCargoMutation.isPending}
                  className="ob-btn ob-btn--primary"
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
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h3 className="ob-heading text-lg font-bold text-on-surface mb-1">Resetar Senha de Acesso</h3>
            <p className="text-xs text-on-surface-variant mb-4 font-body">
              Defina a nova senha para o usuario: <strong className="text-on-surface">{usuarioAlvoReset.nome}</strong>
            </p>

            {mensagemSucessoReset && (
              <div className="bg-secondary-container text-on-secondary-container border border-secondary/20 p-3 rounded-xl mb-4 text-xs sm:text-sm">
                {mensagemSucessoReset}
              </div>
            )}

            <form onSubmit={handleResetarSenha} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Nova Senha (min. 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nova senha temporaria"
                  value={senhaResetVal}
                  onChange={(e) => setSenhaResetVal(e.target.value)}
                  className="ob-input w-full text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalResetSenhaAberto(false)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetarSenhaMutation.isPending}
                  className="ob-btn ob-btn--primary"
                >
                  {resetarSenhaMutation.isPending ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuario */}
      {modalEditarUsuarioAberto && usuarioEditando && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h2 className="ob-heading text-xl font-bold text-on-surface mb-4">Editar Dados do Usuario</h2>

            {erroEditForm && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-4 text-sm">
                {erroEditForm}
              </div>
            )}

            <form onSubmit={handleAtualizarUsuario} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="ex: Carlos Alberto de Souza"
                  className="ob-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Login
                </label>
                <input
                  type="text"
                  required
                  value={editLogin}
                  onChange={(e) => setEditLogin(e.target.value)}
                  placeholder="ex: carlos.souza"
                  className="ob-input w-full font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Perfil de Acesso
                </label>
                <select
                  value={editPerfil}
                  onChange={(e) => setEditPerfil(e.target.value as PerfilUsuario)}
                  disabled={usuarioLogado?.id === usuarioEditando.id}
                  className="ob-input w-full text-sm disabled:opacity-50 font-body"
                >
                  <option value="ALMOXARIFE">ALMOXARIFE (Recebe, separa e baixa material)</option>
                  <option value="ENCARREGADO">ENCARREGADO (Pede material pelo celular)</option>
                  <option value="ENGENHARIA">ENGENHARIA (Define limites de consumo)</option>
                  <option value="ADMINISTRACAO">ADMINISTRACAO (Relatorios gerenciais)</option>
                  <option value="ADMIN">ADMIN (Controle total de usuarios e cadastros)</option>
                </select>
                {usuarioLogado?.id === usuarioEditando.id && (
                  <p className="mt-1.5 text-xs text-on-surface-variant font-body">
                    O perfil do proprio administrador logado nao pode ser alterado.
                  </p>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm font-medium text-on-surface font-body">Cargo Exercido</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNomeNovoCargo('')
                      setErroCargo(null)
                      setModalNovoCargoAberto(true)
                    }}
                    className="text-xs sm:text-sm font-semibold text-accent-text hover:underline cursor-pointer"
                  >
                    + Novo Cargo
                  </button>
                </div>
                <select
                  value={editCargoId}
                  onChange={(e) => setEditCargoId(e.target.value)}
                  required
                  className="ob-input w-full text-sm font-body"
                >
                  <option value="">Selecione o cargo...</option>
                  {cargosAtivos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5 font-body">
                  Obra de Lotacao (Canteiro Fixo)
                </label>
                <select
                  value={editObraId}
                  onChange={(e) => setEditObraId(e.target.value)}
                  className="ob-input w-full text-sm font-body"
                >
                  <option value="">Sem obra fixa (Acesso Global / Engenharia / Admin)</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.codigo} - {o.nome} ({o.cidade})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-on-surface-variant font-body">
                  Para Encarregados e Almoxarifes, vincule a obra para travar o canteiro e evitar selecao manual.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalEditarUsuarioAberto(false)}
                  className="ob-btn ob-btn--outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editarUsuarioMutation.isPending}
                  className="ob-btn ob-btn--primary"
                >
                  {editarUsuarioMutation.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmacao de Exclusao de Usuario */}
      {modalExcluirUsuarioAberto && usuarioExcluindo && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-up">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container-high max-h-[90vh] overflow-y-auto font-body text-on-surface">
            <h3 className="ob-heading text-lg font-bold text-error mb-2">
              Confirmar Exclusao de Usuario
            </h3>
            <p className="text-sm text-on-surface mb-4 leading-normal">
              Deseja realmente excluir permanentemente o usuario{' '}
              <strong>{usuarioExcluindo.nome}</strong> (login: <em>{usuarioExcluindo.login}</em>)?
            </p>

            <div className="bg-tertiary-fixed text-on-tertiary-fixed border border-tertiary/20 p-4 rounded-xl text-xs sm:text-sm mb-4 leading-normal">
              <strong>Regra de integridade:</strong> Usuarios que ja tenham realizado qualquer emprestimo de ferramenta ou solicitacao de material nao podem ser excluidos para preservar o historico da obra. Nesses casos, a exclusao e bloqueada e o usuario deve apenas ser desativado.
            </div>

            {erroExcluir && (
              <div className="bg-error-container text-on-error-container border border-error/20 p-4 rounded-xl mb-4 text-sm">
                {erroExcluir}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalExcluirUsuarioAberto(false)
                  setUsuarioExcluindo(null)
                  setErroExcluir(null)
                }}
                className="ob-btn ob-btn--outline"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={excluirUsuarioMutation.isPending}
                onClick={handleConfirmarExclusao}
                className="ob-btn ob-btn--outline text-error border-error/30 hover:bg-error-container/20"
              >
                {excluirUsuarioMutation.isPending ? 'Excluindo...' : 'Confirmar Exclusao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
