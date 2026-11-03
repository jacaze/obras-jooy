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
        padding: '1.25rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#1e293b',
          borderRadius: '10px',
          padding: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.35)',
          border: '1px solid #334155',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              marginBottom: '0.5rem',
            }}
          >
            JOOY Construtora • MVP Almoxarifado
          </span>
          <h1 style={{ color: '#f8fafc', margin: 0, fontSize: '1.6rem', fontWeight: 700 }}>
            Obras Jooy
          </h1>
          <p style={{ color: '#94a3b8', margin: '0.4rem 0 0', fontSize: '0.9rem' }}>
            Acesso ao Sistema de Almoxarifado e Controle de Obras
          </p>
        </div>

        {erro && (
          <div
            style={{
              backgroundColor: '#7f1d1d',
              color: '#fecaca',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              border: '1px solid #991b1b',
            }}
          >
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              htmlFor="login"
              style={{
                display: 'block',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '0.4rem',
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
                padding: '0.65rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
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
                fontSize: '0.85rem',
                fontWeight: 500,
                marginBottom: '0.4rem',
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
                padding: '0.65rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submetendo}
            style={{
              marginTop: '0.35rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.92rem',
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
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #334155',
          }}
        >
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.65rem',
            }}
          >
            Acesso Rapido de Demonstracao (1 Clique por Perfil)
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.5rem',
            }}
          >
            {CONTAS_DEMO_MVP.map((conta) => (
              <button
                key={conta.login}
                type="button"
                disabled={submetendo}
                onClick={() => handleAcessoRapidoDemo(conta)}
                style={{
                  textAlign: 'left',
                  padding: '0.55rem 0.7rem',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  cursor: submetendo ? 'not-allowed' : 'pointer',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8' }}>
                  {conta.rotulo}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
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
