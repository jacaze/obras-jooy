import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'
import * as apiClient from '../api/client'
import { AuthContext } from '../contexts/auth-context'
import type { UsuarioAuth } from '../types/auth'

function renderHomePage(usuarioLogado: UsuarioAuth | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          usuario: usuarioLogado,
          token: usuarioLogado ? 'fake-token' : null,
          carregando: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('HomePage Component', () => {
  it('deve renderizar informacoes de status quando a API responder com sucesso', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValueOnce({
      status: 'UP',
      servico: 'obras-jooy-backend',
      versao: '1.0.0',
      timestamp: '2026-10-27T21:00:00.000Z',
    })

    renderHomePage()

    expect(screen.getByText('Obras Jooy - Almoxarifado')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Status do Back-end:')).toBeInTheDocument()
      expect(screen.getByText('obras-jooy-backend')).toBeInTheDocument()
    })
  })

  it('deve exibir mensagem de erro quando a chamada da API falhar', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockRejectedValueOnce(new Error('Conexao recusada'))

    renderHomePage()

    await waitFor(() => {
      expect(screen.getByText(/Falha na conexao com a API/)).toBeInTheDocument()
    })
  })

  it('deve exibir boas-vindas e botao de gestao quando usuario for ADMIN', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValueOnce({
      status: 'UP',
      servico: 'obras-jooy-backend',
      versao: '1.0.0',
      timestamp: '2026-10-27T21:00:00.000Z',
    })

    renderHomePage({
      id: 'admin-1',
      nome: 'Administrador Geral',
      login: 'admin',
      perfil: 'ADMIN',
      cargo: 'Engenheiro Chefe',
      ativo: true,
    })

    expect(screen.getByText(/Bem-vindo\(a\), Administrador Geral!/)).toBeInTheDocument()
    expect(screen.getByText(/Cargo:/)).toBeInTheDocument()
    expect(screen.getByText('Engenheiro Chefe')).toBeInTheDocument()
    expect(screen.getByText('Gerenciar Usuarios e Cargos')).toBeInTheDocument()
  })

  it('nao deve exibir botao de gestao de usuarios para perfil ALMOXARIFE', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValueOnce({
      status: 'UP',
      servico: 'obras-jooy-backend',
      versao: '1.0.0',
      timestamp: '2026-10-27T21:00:00.000Z',
    })

    renderHomePage({
      id: 'almox-1',
      nome: 'Joao Almoxarife',
      login: 'almox',
      perfil: 'ALMOXARIFE',
      cargo: 'Almoxarife',
      ativo: true,
    })

    expect(screen.getByText(/Bem-vindo\(a\), Joao Almoxarife!/)).toBeInTheDocument()
    expect(screen.queryByText('Gerenciar Usuarios e Cargos')).not.toBeInTheDocument()
  })
})
