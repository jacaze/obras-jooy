import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { PerfilUsuario } from '../types/auth'

export function ProtectedRoute({
  perfisPermitidos,
}: {
  perfisPermitidos?: PerfilUsuario[]
}) {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex justify-center p-12 text-on-surface-variant font-body">
        Carregando credenciais...
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (perfisPermitidos && !perfisPermitidos.includes(usuario.perfil)) {
    return <Navigate to="/sem-permissao" replace />
  }

  return <Outlet />
}
