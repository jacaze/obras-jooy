import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HomePage } from './HomePage'
import * as apiClient from '../api/client'

describe('HomePage Component', () => {
  it('deve renderizar informacoes de status quando a API responder com sucesso', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValueOnce({
      status: 'UP',
      servico: 'obras-jooy-backend',
      versao: '1.0.0',
      timestamp: '2026-10-27T21:00:00.000Z',
    })

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <HomePage />
      </QueryClientProvider>
    )

    expect(screen.getByText('Obras Jooy - Almoxarifado')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Status do Back-end:')).toBeInTheDocument()
      expect(screen.getByText('obras-jooy-backend')).toBeInTheDocument()
    })
  })

  it('deve exibir mensagem de erro quando a chamada da API falhar', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockRejectedValueOnce(new Error('Conexao recusada'))

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <HomePage />
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Falha na conexao com a API/)).toBeInTheDocument()
    })
  })
})
