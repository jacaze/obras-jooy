import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

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

export function LoginPage() {
  const [loginVal, setLoginVal] = useState('')
  const [senhaVal, setSenhaVal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [submetendo, setSubmetendo] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function autenticar(usuarioLogin: string, usuarioSenha: string) {
    setErro(null)
    setSubmetendo(true)

    try {
      await login(usuarioLogin, usuarioSenha)
      navigate('/')
    } catch (err: any) {
      const msg = err.response?.data?.erro || 'Falha na autenticacao. Verifique login e senha.'
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          padding: '32px',
          border: '1px solid #334155',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              padding: '8px 16px',
              borderRadius: '999px',
              marginBottom: '8px',
            }}
          >
            JOOY Construtora • MVP Almoxarifado
          </span>
          <h1 style={{ color: '#f8fafc', margin: 0, fontSize: '2rem', fontWeight: 600 }}>
            Obras Jooy
          </h1>
          <p style={{ color: '#cbd5e1', margin: '8px 0 0', fontSize: '1rem', fontWeight: 400 }}>
            Acesso ao Sistema de Almoxarifado e Controle de Obras
          </p>
        </div>

        {erro && (
          <div
            style={{
              backgroundColor: '#7f1d1d',
              color: '#fee2e2',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.875rem',
              fontWeight: 400,
              border: '1px solid #991b1b',
            }}
          >
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="login"
              style={{
                display: 'block',
                color: '#cbd5e1',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}
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
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '1rem',
                fontWeight: 400,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="senha"
              style={{
                display: 'block',
                color: '#cbd5e1',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '8px',
              }}
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
              style={{
                width: '100%',
                minHeight: '48px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '1rem',
                fontWeight: 400,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submetendo}
            style={{
              marginTop: '8px',
              minHeight: '48px',
              backgroundColor: '#0369a1',
              color: '#ffffff',
              padding: '8px 24px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: submetendo ? 'not-allowed' : 'pointer',
              opacity: submetendo ? 0.7 : 1,
            }}
          >
            {submetendo ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Painel de Acesso Rapido para Apresentacao do MVP */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #334155',
          }}
        >
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#cbd5e1',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '16px',
            }}
          >
            Acesso Rapido de Demonstracao (1 Clique por Perfil)
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '8px',
            }}
          >
            {CONTAS_DEMO_MVP.map((conta) => (
              <button
                key={conta.login}
                type="button"
                disabled={submetendo}
                onClick={() => handleAcessoRapidoDemo(conta)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  minHeight: '48px',
                  textAlign: 'left',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  cursor: submetendo ? 'not-allowed' : 'pointer',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38bdf8' }}>
                  {conta.rotulo}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 400, color: '#cbd5e1' }}>
                  {conta.papel}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
export default LoginPage
