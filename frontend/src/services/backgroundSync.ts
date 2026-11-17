import type { RequisicaoOffline } from './offlineStorage'

export const DB_NAME = 'obras_jooy_offline_db'
export const DB_VERSION = 1
export const STORE_FILA = 'fila_requisicoes'
export const STORE_CONFIG = 'config_sync'

export const SYNC_TAG_REQUISICOES = 'obras-sync-requisicoes'
export const PERIODIC_SYNC_TAG_CATALOGO = 'obras-periodic-catalog-sync'

/** Intervalo de 5 minutos para sincronizacao periodica de catalogo e fila com o app em uso */
export const INTERVALO_SYNC_CATALOGO_MS = 5 * 60 * 1000

/** Intervalo minimo de 12 horas para Periodic Background Sync nativo com o app fechado */
export const INTERVALO_PERIODIC_BG_SYNC_MS = 12 * 60 * 60 * 1000

interface SyncManagerLike {
  register(tag: string): Promise<void>
  getTags?(): Promise<string[]>
}

interface PeriodicSyncManagerLike {
  register(tag: string, options?: { minInterval: number }): Promise<void>
  unregister?(tag: string): Promise<void>
  getTags?(): Promise<string[]>
}

export interface ServiceWorkerRegistrationComSync extends ServiceWorkerRegistration {
  sync?: SyncManagerLike
  periodicSync?: PeriodicSyncManagerLike
}

function getIndexedDB(): IDBFactory | null {
  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      return window.indexedDB
    }
    if (typeof indexedDB !== 'undefined') {
      return indexedDB
    }
  } catch {
    // Ambiente sem suporte a IndexedDB
  }
  return null
}

function abrirBanco(): Promise<IDBDatabase | null> {
  const idb = getIndexedDB()
  if (!idb) return Promise.resolve(null)

  return new Promise((resolve) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_FILA)) {
          db.createObjectStore(STORE_FILA, { keyPath: 'idLocal' })
        }
        if (!db.objectStoreNames.contains(STORE_CONFIG)) {
          db.createObjectStore(STORE_CONFIG, { keyPath: 'chave' })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function obterTokenAtual(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('@ObrasJooy:token')
    }
  } catch {
    // Ignorar erro de storage
  }
  return null
}

function obterApiBaseUrlAtual(): string {
  return import.meta.env.VITE_API_URL || '/api'
}

/**
 * Salva o token JWT e a URL base da API no IndexedDB para que o Service Worker
 * possa autenticar requisicoes em segundo plano mesmo com a aba fechada.
 */
export async function salvarConfigSyncNoIndexedDB(
  token?: string | null,
  apiBaseUrl?: string
): Promise<boolean> {
  const db = await abrirBanco()
  if (!db) return false

  const tokenFinal = token !== undefined ? token : obterTokenAtual()
  const urlFinal = apiBaseUrl || obterApiBaseUrlAtual()

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_CONFIG, 'readwrite')
      const store = tx.objectStore(STORE_CONFIG)
      const req = store.put({
        chave: 'auth',
        token: tokenFinal,
        apiBaseUrl: urlFinal,
        atualizadoEm: new Date().toISOString(),
      })

      req.onsuccess = () => {
        db.close()
        resolve(true)
      }
      req.onerror = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}

/**
 * Grava uma requisicao offline no IndexedDB para leitura direta pelo Service Worker.
 */
export async function salvarRequisicaoNoIndexedDB(
  requisicao: RequisicaoOffline
): Promise<boolean> {
  await salvarConfigSyncNoIndexedDB()
  const db = await abrirBanco()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_FILA, 'readwrite')
      const store = tx.objectStore(STORE_FILA)
      const req = store.put(requisicao)

      req.onsuccess = () => {
        db.close()
        resolve(true)
      }
      req.onerror = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}

/**
 * Remove uma requisicao sincronizada do IndexedDB.
 */
export async function removerRequisicaoDoIndexedDB(idLocal: string): Promise<boolean> {
  const db = await abrirBanco()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_FILA, 'readwrite')
      const store = tx.objectStore(STORE_FILA)
      const req = store.delete(idLocal)

      req.onsuccess = () => {
        db.close()
        resolve(true)
      }
      req.onerror = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}

/**
 * Limpa todas as requisicoes pendentes do IndexedDB.
 */
export async function limparFilaNoIndexedDB(): Promise<boolean> {
  const db = await abrirBanco()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_FILA, 'readwrite')
      const store = tx.objectStore(STORE_FILA)
      const req = store.clear()

      req.onsuccess = () => {
        db.close()
        resolve(true)
      }
      req.onerror = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}

/**
 * Retorna todas as requisicoes atualmente armazenadas no IndexedDB.
 */
export async function obterRequisicoesDoIndexedDB(): Promise<RequisicaoOffline[]> {
  const db = await abrirBanco()
  if (!db) return []

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_FILA, 'readonly')
      const store = tx.objectStore(STORE_FILA)
      const req = store.getAll()

      req.onsuccess = () => {
        db.close()
        resolve(Array.isArray(req.result) ? req.result : [])
      }
      req.onerror = () => {
        db.close()
        resolve([])
      }
    } catch {
      db.close()
      resolve([])
    }
  })
}

/**
 * Le e limpa a lista de IDs de requisicoes que foram enviadas com sucesso pelo
 * Service Worker enquanto o aplicativo estava em segundo plano ou fechado.
 */
export async function consumirIdsSincronizadosPeloSW(): Promise<string[]> {
  const db = await abrirBanco()
  if (!db) return []

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_CONFIG, 'readwrite')
      const store = tx.objectStore(STORE_CONFIG)
      const getReq = store.get('sincronizados_sw')

      getReq.onsuccess = () => {
        const registro = getReq.result
        const ids: string[] = Array.isArray(registro?.ids) ? registro.ids : []
        if (ids.length > 0) {
          store.delete('sincronizados_sw')
        }
        tx.oncomplete = () => {
          db.close()
          resolve(ids)
        }
      }
      getReq.onerror = () => {
        db.close()
        resolve([])
      }
    } catch {
      db.close()
      resolve([])
    }
  })
}

/**
 * Verifica se o navegador atual suporta Service Worker e Background Sync API nativa.
 */
export async function verificarSuporteBackgroundSync(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return false
    }
    if (typeof window !== 'undefined' && 'SyncManager' in window) {
      return true
    }
    const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationComSync
    return Boolean(reg && reg.sync && typeof reg.sync.register === 'function')
  } catch {
    return false
  }
}

/**
 * Agenda uma tarefa de sincronizacao nativa em segundo plano no Service Worker
 * usando a Background Sync API (SyncManager) do Chromium/Web App.
 */
export async function registrarBackgroundSync(
  tag: string = SYNC_TAG_REQUISICOES
): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return false
    }

    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationComSync

    if (registration?.sync && typeof registration.sync.register === 'function') {
      await registration.sync.register(tag)
      return true
    }

    // Fallback: se o navegador nao possui SyncManager mas o SW esta ativo e online, envia mensagem direta
    if (registration?.active && navigator.onLine) {
      registration.active.postMessage({ type: 'OBRAS_TRIGGER_SW_SYNC' })
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Registra sincronizacao periodica em segundo plano (Periodic Background Sync API)
 * para manter o catalogo atualizado mesmo com o aplicativo fechado em navegadores compativeis.
 */
export async function registrarPeriodicBackgroundSync(
  minInterval: number = INTERVALO_PERIODIC_BG_SYNC_MS
): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return false
    }

    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistrationComSync
    if (!registration?.periodicSync || typeof registration.periodicSync.register !== 'function') {
      return false
    }

    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        })
        if (status.state === 'denied') {
          return false
        }
      } catch {
        // Alguns navegadores nao expoem a query de permissao, prossegue para tentativa de registro
      }
    }

    await registration.periodicSync.register(PERIODIC_SYNC_TAG_CATALOGO, {
      minInterval,
    })
    return true
  } catch {
    return false
  }
}
