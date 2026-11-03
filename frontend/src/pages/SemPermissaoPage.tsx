import { Link } from 'react-router-dom'

export function SemPermissaoPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '2rem',
          fontWeight: 600,
          color: '#b91c1c',
          marginBottom: '8px',
        }}
      >
        403
      </div>
      <h1 style={{ color: '#0f172a', fontSize: '2rem', fontWeight: 600, margin: '0 0 16px' }}>
        Acesso Nao Autorizado
      </h1>
      <p
        style={{
          color: '#475569',
          fontSize: '1rem',
          fontWeight: 400,
          maxWidth: '400px',
          margin: '0 0 32px',
        }}
      >
        Seu perfil de usuario nao possui permissao para acessar esta area do sistema.
      </p>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '48px',
          backgroundColor: '#0369a1',
          color: '#ffffff',
          textDecoration: 'none',
          padding: '8px 24px',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
        }}
      >
        Voltar para a Pagina Inicial
      </Link>
    </div>
  )
}
export default SemPermissaoPage
