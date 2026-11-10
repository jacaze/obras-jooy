import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { OfflineBanner } from './OfflineBanner'
import { salvarRequisicaoOffline, limparRequisicoesOffline } from '../services/offlineStorage'
import * as apiClient from '../api/client'
import { AuthContext } from '../contexts/auth-context'

function renderBanner(isOfflineLogin = false) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          usuario: null,
          token: null,
          carregando: false,
          isOfflineLogin,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <OfflineBanner />
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('OfflineBanner Component (F05 - PWA e Modo Offline)', () => {
  beforeEach(() => {
    limparRequisicoesOffline()
    vi.restoreAllMocks()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('nao deve renderizar nada quando online e sem requisicoes pendentes', () => {
    const { container } = renderBanner()
    expect(container.firstChild).toBeNull()
  })

  it('deve exibir banner avisando sobre modo offline quando desconectado', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    renderBanner()

    expect(screen.getByText(/Modo Offline \(Canteiro sem internet\)/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Seus pedidos serão salvos localmente e sincronizados de forma automática/i)
    ).toBeInTheDocument()
  })

  it('deve exibir banner de sincronizacao quando online com itens pendentes e permitir sincronizar', async () => {
    const syncSpy = vi.spyOn(apiClient, 'createRequisicao').mockResolvedValue({
      id: 'req-1',
      numeroSequencial: 101,
    } as any)

    salvarRequisicaoOffline({
      dados: { areaId: 'area-1', etapaId: 'etapa-1', itens: [{ materialId: 'mat-1', quantidade: 1 }] },
      dadosExibicao: { obraNome: 'Obra 1', itens: [] },
    })

    renderBanner()

    expect(screen.getByText(/Conexão Restabelecida:/i)).toBeInTheDocument()
    expect(screen.getByText(/pedido salvo offline pronto/i)).toBeInTheDocument()

    const btnSincronizar = screen.getByRole('button', { name: /Sincronizar Agora/i })
    expect(btnSincronizar).toBeInTheDocument()

    fireEvent.click(btnSincronizar)

    await waitFor(() => {
      expect(syncSpy).toHaveBeenCalledTimes(1)
    })
  })
})
