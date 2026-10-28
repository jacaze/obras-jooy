import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { SemPermissaoPage } from './pages/SemPermissaoPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            {/* Rotas Publicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/sem-permissao" element={<SemPermissaoPage />} />

            {/* Rotas Autenticadas Gerais */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
            </Route>

            {/* Rotas Restritas Exclusivas para ADMIN */}
            <Route element={<ProtectedRoute perfisPermitidos={['ADMIN']} />}>
              <Route path="/usuarios" element={<UsuariosPage />} />
            </Route>

            {/* Redirecionamento padrao */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
