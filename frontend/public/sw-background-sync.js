/* eslint-disable no-restricted-globals */
/**
 * Script de Service Worker para Sincronizacao em Segundo Plano (F07)
 * Integrado via Workbox importScripts.
 * Executa envio de requisicoes pendentes via Background Sync API (SyncManager)
 * mesmo com o aplicativo fechado, lendo diretamente do IndexedDB.
 */

const DB_NAME = 'obras_jooy_offline_db'
const DB_VERSION = 1
const STORE_FILA = 'fila_requisicoes'
const STORE_CONFIG = 'config_sync'

const SYNC_TAG_REQUISICOES = 'obras-sync-requisicoes'
const PERIODIC_SYNC_TAG_CATALOGO = 'obras-periodic-catalog-sync'

function abrirBancoSW() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponivel no Service Worker'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_FILA)) {
        db.createObjectStore(STORE_FILA, { keyPath: 'idLocal' })
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'chave' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Falha ao abrir IndexedDB no SW'))
  })
}

async function lerTodosDaStore(storeName) {
  const db = await abrirBancoSW()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => {
      db.close()
      resolve(req.result || [])
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

async function lerRegistroConfig(chave) {
  const db = await abrirBancoSW()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONFIG, 'readonly')
    const store = tx.objectStore(STORE_CONFIG)
    const req = store.get(chave)
    req.onsuccess = () => {
      db.close()
      resolve(req.result || null)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

async function salvarRegistroConfig(registro) {
  const db = await abrirBancoSW()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONFIG, 'readwrite')
    const store = tx.objectStore(STORE_CONFIG)
    const req = store.put(registro)
    req.onsuccess = () => {
      db.close()
      resolve(true)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

async function removerItemFilaSW(idLocal) {
  const db = await abrirBancoSW()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILA, 'readwrite')
    const store = tx.objectStore(STORE_FILA)
    const req = store.delete(idLocal)
    req.onsuccess = () => {
      db.close()
      resolve(true)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

async function registrarIdSincronizadoPeloSW(idLocal) {
  try {
    const atual = await lerRegistroConfig('sincronizados_sw')
    const ids = Array.isArray(atual?.ids) ? atual.ids : []
    if (!ids.includes(idLocal)) {
      ids.push(idLocal)
    }
    await salvarRegistroConfig({
      chave: 'sincronizados_sw',
      ids,
      atualizadoEm: new Date().toISOString(),
    })
  } catch {
    // Falha silenciosa caso nao consiga gravar log auxiliar
  }
}

async function notificarClientes(mensagem) {
  try {
    if (!self.clients || typeof self.clients.matchAll !== 'function') return
    const clientes = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    })
    for (const cliente of clientes) {
      cliente.postMessage(mensagem)
    }
  } catch {
    // Ignorar se nenhum cliente estiver ativo
  }
}

async function processarFilaBackgroundSync() {
  let itens = []
  let authConfig = null

  try {
    itens = await lerTodosDaStore(STORE_FILA)
    authConfig = await lerRegistroConfig('auth')
  } catch {
    return
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    return
  }

  const token = authConfig?.token
  const apiBaseUrl = (authConfig?.apiBaseUrl || '/api').replace(/\/+$/, '')

  if (!token) {
    return
  }

  let sincronizadas = 0
  let deveReagendarRetry = false

  for (const item of itens) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }
      if (item?.dados?.chaveIdempotencia) {
        headers['Idempotency-Key'] = item.dados.chaveIdempotencia
      }

      const response = await fetch(`${apiBaseUrl}/requisicoes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(item.dados),
      })

      if (response.ok || response.status === 409) {
        await removerItemFilaSW(item.idLocal)
        await registrarIdSincronizadoPeloSW(item.idLocal)
        sincronizadas += 1
        await notificarClientes({
          type: 'OBRAS_BG_SYNC_ITEM_ENVIADO',
          idLocal: item.idLocal,
        })
      } else if (response.status >= 500) {
        deveReagendarRetry = true
      }
    } catch {
      deveReagendarRetry = true
    }
  }

  if (sincronizadas > 0) {
    await notificarClientes({
      type: 'OBRAS_BG_SYNC_COMPLETED',
      sincronizadas,
      timestamp: new Date().toISOString(),
    })
  }

  if (deveReagendarRetry) {
    throw new Error('Falha temporaria de rede no Background Sync; reagendando tentativa.')
  }
}

async function atualizarCatalogoBackgroundSync() {
  await processarFilaBackgroundSync().catch(() => {})

  let authConfig = null
  try {
    authConfig = await lerRegistroConfig('auth')
  } catch {
    return
  }

  const token = authConfig?.token
  const apiBaseUrl = (authConfig?.apiBaseUrl || '/api').replace(/\/+$/, '')
  if (!token) return

  const endpoints = [
    `${apiBaseUrl}/obras?ativa=true`,
    `${apiBaseUrl}/materiais`,
    `${apiBaseUrl}/ferramentas?somenteAtivas=true`,
  ]

  await Promise.allSettled(
    endpoints.map((url) =>
      fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      })
    )
  )

  await notificarClientes({
    type: 'OBRAS_PERIODIC_SYNC_COMPLETED',
    timestamp: new Date().toISOString(),
  })
}

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG_REQUISICOES) {
    event.waitUntil(processarFilaBackgroundSync())
  }
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag === PERIODIC_SYNC_TAG_CATALOGO) {
    event.waitUntil(atualizarCatalogoBackgroundSync())
  }
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'OBRAS_TRIGGER_SW_SYNC') {
    event.waitUntil(processarFilaBackgroundSync())
  }
})
