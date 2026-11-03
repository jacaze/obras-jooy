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
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: '44px',
      color: isActive ? '#38bdf8' : '#cbd5e1',
      backgroundColor: isActive ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
      borderBottom: isActive ? '2px solid #38bdf8' : '2px solid transparent',
      textDecoration: 'none',
      fontSize: '0.875rem',
      fontWeight: isActive ? 600 : 400,
      padding: '8px 16px',
      borderRadius: '8px 8px 0 0',
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
        gap: '16px 24px',
        padding: '8px 24px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        borderBottom: '1px solid #1e293b',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: '44px',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#38bdf8',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Obras Jooy
        </Link>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
        <div style={{ textAlign: 'right', fontSize: '0.875rem', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{usuario.nome}</div>
          <div style={{ color: '#cbd5e1', fontWeight: 400 }}>
            <span>{usuario.cargo}</span> •{' '}
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{usuario.perfil}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            minHeight: '44px',
            backgroundColor: '#1e293b',
            color: '#f8fafc',
            border: '1px solid #475569',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem',
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
