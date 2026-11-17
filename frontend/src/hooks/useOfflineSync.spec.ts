import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useOfflineSync } from './useOfflineSync'
import {
  salvarRequisicaoOffline,
  limparRequisicoesOffline,
  obterCacheObras,
  obterCacheMateriais,
  obterCacheFerramentas,
} from '../services/offlineStorage'
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

  it('deve sincronizar o catalogo offline silenciosamente (obras, materiais e ferramentas)', async () => {
    vi.spyOn(apiClient, 'getObras').mockResolvedValue([
      { id: 'obra-1', codigo: 'JY-01', nome: 'Jooy Reserva', cidade: 'Campo Grande', ativa: true },
    ] as any)
    vi.spyOn(apiClient, 'getMateriais').mockResolvedValue([
      { id: 'mat-1', codigo: 'MAT-001', descricao: 'Cimento CP-II' },
    ] as any)
    vi.spyOn(apiClient, 'getFerramentas').mockResolvedValue([
      { id: 'fer-1', codigo: 'FER-001', nome: 'Martelete 800W', status: 'DISPONIVEL', ativo: true },
    ] as any)

    const { result } = renderHook(() => useOfflineSync(), { wrapper: createWrapper() })

    let ok = false
    await act(async () => {
      ok = await result.current.sincronizarCatalogo()
    })

    expect(ok).toBe(true)
    expect(obterCacheObras()).toHaveLength(1)
    expect(obterCacheMateriais()).toHaveLength(1)
    expect(obterCacheFerramentas()).toHaveLength(1)
    expect(result.current.ultimaSyncCatalogo).not.toBeNull()
  })

  it('deve disparar sincronizacao automatica quando a aba recuperar foco (visibilitychange)', async () => {
    const createSpy = vi.spyOn(apiClient, 'createRequisicao').mockResolvedValue({
      id: 'req-servidor-vis',
      numeroSequencial: 110,
    } as any)
    vi.spyOn(apiClient, 'getObras').mockResolvedValue([] as any)
    vi.spyOn(apiClient, 'getMateriais').mockResolvedValue([] as any)
    vi.spyOn(apiClient, 'getFerramentas').mockResolvedValue([] as any)

    salvarRequisicaoOffline({
      dados: {
        areaId: 'area-1',
        etapaId: 'etapa-1',
        itens: [{ materialId: 'mat-1', quantidade: 1 }],
      },
      dadosExibicao: {
        obraNome: 'Jooy Reserva',
        itens: [],
      },
    })

    const { result } = renderHook(() => useOfflineSync(), { wrapper: createWrapper() })
    expect(result.current.pendentes).toHaveLength(1)

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(1)
      expect(result.current.pendentes).toHaveLength(0)
    })
  })
})
