import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Navbar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (!usuario) {
    return null
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 2rem',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link
          to="/"
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#38bdf8',
            textDecoration: 'none',
          }}
        >
          Obras Jooy
        </Link>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link
            to="/"
            style={{
              color: '#cbd5e1',
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}
          >
            Inicio
          </Link>
          <Link
            to="/obras"
            style={{
              color: '#cbd5e1',
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}
          >
            Obras e Pavimentos
          </Link>
          {usuario.perfil === 'ADMIN' && (
            <Link
              to="/usuarios"
              style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                fontSize: '0.95rem',
              }}
            >
              Usuarios
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{usuario.nome}</div>
          <div style={{ color: '#94a3b8' }}>
            <span>{usuario.cargo}</span> • <span style={{ color: '#38bdf8' }}>{usuario.perfil}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            backgroundColor: '#334155',
            color: '#f8fafc',
            border: 'none',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  )
}
