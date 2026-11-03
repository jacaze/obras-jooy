import { Link, NavLink, useNavigate } from 'react-router-dom'
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

  function estiloLink({ isActive }: { isActive: boolean }) {
    return {
      color: isActive ? '#38bdf8' : '#cbd5e1',
      backgroundColor: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
      borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
      textDecoration: 'none',
      fontSize: '0.9rem',
      fontWeight: isActive ? 600 : 500,
      padding: '0.4rem 0.65rem',
      borderRadius: '4px 4px 0 0',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap' as const,
    }
  }

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem 1.5rem',
        padding: '0.65rem 1.5rem',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        borderBottom: '1px solid #1e293b',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/"
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            color: '#38bdf8',
            textDecoration: 'none',
            letterSpacing: '-0.02em',
          }}
        >
          Obras Jooy
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            flexWrap: 'wrap',
          }}
        >
          <NavLink to="/" end style={estiloLink}>
            Inicio
          </NavLink>

          <NavLink to="/requisicoes" style={estiloLink}>
            Requisicoes
          </NavLink>

          {usuario.perfil !== 'ENCARREGADO' && (
            <>
              <NavLink to="/estoque" style={estiloLink}>
                Estoque e Kardex
              </NavLink>
              <NavLink to="/obras" style={estiloLink}>
                Obras e Pavimentos
              </NavLink>
              <NavLink to="/materiais" style={estiloLink}>
                Catalogo de Materiais
              </NavLink>
              <NavLink to="/ferramentas" style={estiloLink}>
                Ferramentas
              </NavLink>
            </>
          )}

          {(usuario.perfil === 'ADMIN' ||
            usuario.perfil === 'ENGENHARIA' ||
            usuario.perfil === 'ADMINISTRACAO') && (
            <NavLink to="/orcamento" style={estiloLink}>
              Orcamento da Obra
            </NavLink>
          )}

          {usuario.perfil === 'ADMIN' && (
            <NavLink to="/usuarios" style={estiloLink}>
              Usuarios
            </NavLink>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
        <div style={{ textAlign: 'right', fontSize: '0.82rem', lineHeight: 1.3 }}>
          <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{usuario.nome}</div>
          <div style={{ color: '#94a3b8' }}>
            <span>{usuario.cargo}</span> •{' '}
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{usuario.perfil}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #334155',
            padding: '0.4rem 0.85rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}
        >
          Sair
        </button>
      </div>
    </nav>
  )
}
export default Navbar
