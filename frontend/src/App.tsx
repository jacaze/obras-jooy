import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { OfflineBanner } from './components/OfflineBanner'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { ObrasPage } from './pages/ObrasPage'
import { MateriaisPage } from './pages/MateriaisPage'
import { FerramentasPage } from './pages/FerramentasPage'
import { RequisicoesPage } from './pages/RequisicoesPage'
import { EstoquePage } from './pages/EstoquePage'
import { OrcamentoObraPage } from './pages/OrcamentoObraPage'
import { SemPermissaoPage } from './pages/SemPermissaoPage'
import { FEATURE_ORCAMENTO_ATIVO } from './config/features'

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
          <OfflineBanner />
          <Routes>
            {/* Rotas Publicas */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/sem-permissao" element={<SemPermissaoPage />} />

            {/* Rotas Autenticadas Gerais (inclusive ENCARREGADO) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/requisicoes" element={<RequisicoesPage />} />
            </Route>

            {/* Rotas de Gestao e Cadastro (bloqueadas para ENCARREGADO) */}
            <Route
              element={
                <ProtectedRoute
                  perfisPermitidos={['ADMIN', 'ALMOXARIFE', 'ENGENHARIA', 'ADMINISTRACAO']}
                />
              }
            >
              <Route path="/estoque" element={<EstoquePage />} />
              <Route path="/obras" element={<ObrasPage />} />
              <Route path="/materiais" element={<MateriaisPage />} />
              <Route path="/ferramentas" element={<FerramentasPage />} />
            </Route>

            {/* Rotas Exclusivas para Engenharia, Administracao e Admin (Isoladas via Feature Flag) */}
            {FEATURE_ORCAMENTO_ATIVO && (
              <Route
                element={
                  <ProtectedRoute
                    perfisPermitidos={['ADMIN', 'ENGENHARIA', 'ADMINISTRACAO']}
                  />
                }
              >
                <Route path="/orcamento" element={<OrcamentoObraPage />} />
                <Route path="/orcamento-obra" element={<OrcamentoObraPage />} />
              </Route>
            )}

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
