import { Link } from 'react-router-dom'

export function SemPermissaoPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: '#e11d48',
          marginBottom: '0.5rem',
        }}
      >
        403
      </div>
      <h1 style={{ color: '#1e293b', margin: '0 0 1rem' }}>Acesso Nao Autorizado</h1>
      <p style={{ color: '#64748b', maxWidth: '400px', marginBottom: '2rem' }}>
        Seu perfil de usuario nao possui permissao para acessar esta area do sistema.
      </p>
      <Link
        to="/"
        style={{
          backgroundColor: '#0284c7',
          color: '#ffffff',
          textDecoration: 'none',
          padding: '0.6rem 1.2rem',
          borderRadius: '4px',
          fontWeight: 500,
        }}
      >
        Voltar para a Pagina Inicial
      </Link>
    </div>
  )
}
