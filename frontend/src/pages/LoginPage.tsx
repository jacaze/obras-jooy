import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LoginPage() {
  const [loginVal, setLoginVal] = useState('')
  const [senhaVal, setSenhaVal] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [submetendo, setSubmetendo] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSubmetendo(true)

    try {
      await login(loginVal, senhaVal)
      navigate('/')
    } catch (err: any) {
      const msg = err.response?.data?.erro || 'Falha na autenticacao. Verifique login e senha.'
      setErro(msg)
    } finally {
      setSubmetendo(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
          border: '1px solid #334155',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ color: '#38bdf8', margin: 0, fontSize: '1.5rem' }}>Obras Jooy</h1>
          <p style={{ color: '#94a3b8', margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
            Acesso ao Sistema de Almoxarifado
          </p>
        </div>

        {erro && (
          <div
            style={{
              backgroundColor: '#7f1d1d',
              color: '#fecaca',
              padding: '0.75rem',
              borderRadius: '4px',
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
              style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem' }}
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
                padding: '0.6rem 0.75rem',
                borderRadius: '4px',
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
              style={{ display: 'block', color: '#cbd5e1', fontSize: '0.85rem', marginBottom: '0.4rem' }}
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
                padding: '0.6rem 0.75rem',
                borderRadius: '4px',
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
              marginTop: '0.5rem',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '4px',
              border: 'none',
              fontWeight: 600,
              cursor: submetendo ? 'not-allowed' : 'pointer',
              opacity: submetendo ? 0.7 : 1,
            }}
          >
            {submetendo ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  )
}
