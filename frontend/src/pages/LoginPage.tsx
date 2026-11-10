import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { obterLoginsDisponiveisOffline } from '../services/offlineStorage'
import { EXIBIR_ACESSO_RAPIDO_TESTE } from '../config/features'

const CONTAS_DEMO_MVP = [
  {
    rotulo: 'Admin Geral',
    login: 'admin',
    senha: 'admin123456',
    papel: 'Acesso total + Usuarios',
  },
  {
    rotulo: 'Almoxarife',
    login: 'almoxarife',
    senha: 'admin123456',
    papel: 'Estoque, Ferramentas e SIENGE',
  },
  {
    rotulo: 'Engenharia',
    login: 'engenharia',
    senha: 'admin123456',
    papel: 'Limites de Orcamento e Obras',
  },
  {
    rotulo: 'Administracao',
    login: 'administracao',
    senha: 'admin123456',
    papel: 'Auditoria e Custos da Obra',
  },
  {
    rotulo: 'Encarregado',
    login: 'encarregado',
    senha: 'admin123456',
    papel: 'Pedidos de Material no Canteiro',
  },
]

interface LoginPageProps {
  exibirAcessoRapido?: boolean
}

export function LoginPage({ exibirAcessoRapido = EXIBIR_ACESSO_RAPIDO_TESTE }: LoginPageProps = {}) {
  const [loginVal, setLoginVal] = useState('')
  const [senhaVal, setSenhaVal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [submetendo, setSubmetendo] = useState(false)
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  )
  const [loginsSalvos, setLoginsSalvos] = useState<string[]>([])

  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    function atualizarStatusRede() {
      setIsOffline(!navigator.onLine)
    }

    setLoginsSalvos(obterLoginsDisponiveisOffline())

    window.addEventListener('online', atualizarStatusRede)
    window.addEventListener('offline', atualizarStatusRede)
    return () => {
      window.removeEventListener('online', atualizarStatusRede)
      window.removeEventListener('offline', atualizarStatusRede)
    }
  }, [])

  async function autenticar(usuarioLogin: string, usuarioSenha: string) {
    setErro(null)
    setSubmetendo(true)

    try {
      await login(usuarioLogin, usuarioSenha)
      navigate('/')
    } catch (err: any) {
      const msg =
        err.message ||
        err.response?.data?.erro ||
        'Falha na autenticacao. Verifique login e senha.'
      setErro(msg)
    } finally {
      setSubmetendo(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await autenticar(loginVal, senhaVal)
  }

  async function handleAcessoRapidoDemo(conta: (typeof CONTAS_DEMO_MVP)[number]) {
    setLoginVal(conta.login)
    setSenhaVal(conta.senha)
    await autenticar(conta.login, conta.senha)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 sm:p-6 font-body text-on-surface">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-surface-container">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container shadow-sm mb-3">
            <span
              className={`w-2 h-2 rounded-full ${
                isOffline ? 'bg-amber-500' : 'bg-secondary animate-pulse'
              }`}
            />
            <span className="text-caption-1 font-semibold text-on-surface tracking-tight">
              {isOffline
                ? 'Modo Offline • Autenticacao Local'
                : 'JOOY Construtora • MVP Almoxarifado'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-on-surface">
            Obras Jooy
          </h1>
          <p className="text-caption-1 text-on-surface-variant mt-1.5">
            Acesso ao Sistema de Almoxarifado e Controle de Obras
          </p>
        </div>

        {isOffline && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 p-3.5 rounded-xl mb-4 text-xs font-medium space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <span className="material-symbols-outlined text-[18px]">wifi_off</span>
              <span>Dispositivo sem conexao com a internet</span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              Voce pode entrar normalmente usando sua senha se ja tiver acessado este aparelho anteriormente.
            </p>
            {loginsSalvos.length > 0 && (
              <div className="pt-1 text-[11px]">
                <strong>Usuarios disponiveis offline:</strong> {loginsSalvos.join(', ')}
              </div>
            )}
          </div>
        )}

        {erro && (
          <div className="bg-error-container/20 border border-error/30 text-error p-3.5 rounded-xl mb-4 text-caption-1 font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="login"
              className="block text-caption-1 font-semibold text-on-surface mb-1.5"
            >
              Login de Usuario
            </label>
            <input
              id="login"
              type="text"
              required
              value={loginVal}
              onChange={(e) => setLoginVal(e.target.value)}
              placeholder="ex: admin"
              className="w-full min-h-[48px] px-3.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body outline-none focus:border-primary transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-caption-1 font-semibold text-on-surface mb-1.5"
            >
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senhaVal}
              onChange={(e) => setSenhaVal(e.target.value)}
              placeholder="Sua senha de acesso"
              className="w-full min-h-[48px] px-3.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body outline-none focus:border-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submetendo}
            className="w-full min-h-[48px] bg-primary text-on-primary rounded-xl font-headline text-headline flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-60 mt-1"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">login</span>
            <span>{submetendo ? 'Entrando...' : 'Entrar no Sistema'}</span>
          </button>
        </form>

        {/* Painel de Acesso Rapido para Apresentacao do MVP (Isolado/Desativado em Producao) */}
        {exibirAcessoRapido && (
          <div className="mt-6 pt-5 border-t border-surface-container">
            <div className="text-caption-2 uppercase font-semibold tracking-wider text-on-surface-variant mb-3 text-center sm:text-left">
              Acesso Rapido de Demonstracao (1 Clique por Perfil)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONTAS_DEMO_MVP.map((conta) => (
                <button
                  key={conta.login}
                  type="button"
                  disabled={submetendo}
                  onClick={() => handleAcessoRapidoDemo(conta)}
                  className="flex flex-col items-start justify-center min-h-[48px] p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-surface-container text-left transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="text-caption-1 font-semibold text-primary">
                    {conta.rotulo}
                  </div>
                  <div className="text-caption-2 text-on-surface-variant line-clamp-1">
                    {conta.papel}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default LoginPage
