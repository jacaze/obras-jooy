import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useOfflineSync } from './useOfflineSync'
import { salvarRequisicaoOffline, limparRequisicoesOffline } from '../services/offlineStorage'
import * as apiClient from '../api/client'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useOfflineSync Hook (F05 - PWA e Modo Offline)', () => {
  beforeEach(() => {
    limparRequisicoesOffline()
    vi.restoreAllMocks()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('deve retornar estado inicial online com zero pendencias', () => {
    const { result } = renderHook(() => useOfflineSync(), { wrapper: createWrapper() })

    expect(result.current.isOnline).toBe(true)
    expect(result.current.pendentes).toHaveLength(0)
    expect(result.current.isSincronizando).toBe(false)
  })

  it('deve detectar alteracao para offline e atualizar estado', () => {
    const { result } = renderHook(() => useOfflineSync(), { wrapper: createWrapper() })

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.isOnline).toBe(true)
  })

  it('deve sincronizar requisicoes pendentes chamando createRequisicao e esvaziando a fila', async () => {
    const createSpy = vi.spyOn(apiClient, 'createRequisicao').mockResolvedValue({
      id: 'req-servidor-1',
      numeroSequencial: 105,
    } as any)

    salvarRequisicaoOffline({
      dados: {
        areaId: 'area-1',
        etapaId: 'etapa-1',
        itens: [{ materialId: 'mat-1', quantidade: 3 }],
      },
      dadosExibicao: {
        obraNome: 'Jooy Reserva',
        itens: [{ codigo: 'CIM-01', descricao: 'Cimento', quantidade: 3 }],
      },
    })

    const { result } = renderHook(() => useOfflineSync(), { wrapper: createWrapper() })

    expect(result.current.pendentes).toHaveLength(1)

    let relatorio: any
    await act(async () => {
      relatorio = await result.current.sincronizar()
    })

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        areaId: 'area-1',
        etapaId: 'etapa-1',
      })
    )
    expect(relatorio.sincronizadas).toBe(1)
    expect(relatorio.falhas).toBe(0)

    await waitFor(() => {
      expect(result.current.pendentes).toHaveLength(0)
    })
  })

  it('deve manter requisicao na fila e contabilizar falha caso a API retorne erro', async () => {
    vi.spyOn(apiClient, 'createRequisicao').mockRejectedValueOnce({
      response: { data: { erro: 'Saldo indisponivel' } },
    })

    salvarRequisicaoOffline({
      dados: {
        areaId: 'area-1',
        etapaId: 'etapa-1',
        itens: [{ materialId: 'mat-1', quantidade: 999 }],
      },
      dadosExibicao: {
        obraNome: 'Jooy Reserva',
        itens: [],
      },
    })

    const { result } = renderHook(() => useOfflineSync(), { wrapper: createWrapper() })

    let relatorio: any
    await act(async () => {
      relatorio = await result.current.sincronizar()
    })

    expect(relatorio.sincronizadas).toBe(0)
    expect(relatorio.falhas).toBe(1)
    expect(relatorio.erros[0]).toContain('Saldo indisponivel')
    expect(result.current.pendentes).toHaveLength(1)
  })
})
