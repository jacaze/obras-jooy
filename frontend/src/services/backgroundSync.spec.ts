import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SYNC_TAG_REQUISICOES,
  PERIODIC_SYNC_TAG_CATALOGO,
  INTERVALO_SYNC_CATALOGO_MS,
  registrarBackgroundSync,
  registrarPeriodicBackgroundSync,
  verificarSuporteBackgroundSync,
} from './backgroundSync'

describe('backgroundSync Service (F07 - Background Sync e Periodic Sync Nativo)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('deve definir intervalo de 5 minutos para sincronizacao de catalogo com app aberto', () => {
    expect(INTERVALO_SYNC_CATALOGO_MS).toBe(5 * 60 * 1000)
  })

  it('deve registrar tarefa no SyncManager nativo quando suportado pelo Service Worker', async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          sync: {
            register: registerMock,
          },
        }),
      },
    })

    const sucesso = await registrarBackgroundSync()
    expect(sucesso).toBe(true)
    expect(registerMock).toHaveBeenCalledWith(SYNC_TAG_REQUISICOES)
  })

  it('deve acionar fallback via postMessage no Service Worker ativo quando SyncManager nao existir', async () => {
    const postMessageMock = vi.fn()
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          active: {
            postMessage: postMessageMock,
          },
        }),
      },
    })

    const sucesso = await registrarBackgroundSync()
    expect(sucesso).toBe(true)
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'OBRAS_TRIGGER_SW_SYNC' })
  })

  it('deve registrar Periodic Background Sync quando suportado e autorizado', async () => {
    const periodicRegisterMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          periodicSync: {
            register: periodicRegisterMock,
          },
        }),
      },
    })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
    })

    const sucesso = await registrarPeriodicBackgroundSync(3600000)
    expect(sucesso).toBe(true)
    expect(periodicRegisterMock).toHaveBeenCalledWith(PERIODIC_SYNC_TAG_CATALOGO, {
      minInterval: 3600000,
    })
  })

  it('nao deve registrar Periodic Background Sync se permissao for negada', async () => {
    const periodicRegisterMock = vi.fn()
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          periodicSync: {
            register: periodicRegisterMock,
          },
        }),
      },
    })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: 'denied' }),
      },
    })

    const sucesso = await registrarPeriodicBackgroundSync()
    expect(sucesso).toBe(false)
    expect(periodicRegisterMock).not.toHaveBeenCalled()
  })

  it('deve verificar suporte ao Background Sync corretamente', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          sync: {
            register: vi.fn(),
          },
        }),
      },
    })

    const suportado = await verificarSuporteBackgroundSync()
    expect(suportado).toBe(true)
  })
})
