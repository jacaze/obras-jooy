import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as apiClient from '../api/client'
import {
  obterRequisicoesOffline,
  removerRequisicaoOffline,
  atualizarTentativaOffline,
  salvarCacheObras,
  salvarCacheMateriais,
  salvarCacheFerramentas,
  registrarTimestampSyncCatalogo,
  obterTimestampSyncCatalogo,
  reconciliarFilaComServiceWorker,
  type RequisicaoOffline,
} from '../services/offlineStorage'
import {
  INTERVALO_SYNC_CATALOGO_MS,
  registrarBackgroundSync,
  registrarPeriodicBackgroundSync,
  salvarConfigSyncNoIndexedDB,
  verificarSuporteBackgroundSync,
} from '../services/backgroundSync'

export interface ResultadoSincronizacao {
  total: number
  sincronizadas: number
  falhas: number
  erros: string[]
}

export function useOfflineSync() {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [pendentes, setPendentes] = useState<RequisicaoOffline[]>(() =>
    obterRequisicoesOffline()
  )
  const [isSincronizando, setIsSincronizando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoSincronizacao | null>(null)
  const [ultimaSyncCatalogo, setUltimaSyncCatalogo] = useState<string | null>(() =>
    obterTimestampSyncCatalogo()
  )
  const [bgSyncSuportado, setBgSyncSuportado] = useState<boolean>(false)

  const atualizarPendentes = useCallback(() => {
    setPendentes(obterRequisicoesOffline())
  }, [])

  // Reconcilia itens que o Service Worker enviou enquanto o app estava fechado
  const reconciliarBackgroundSync = useCallback(async () => {
    const removidos = await reconciliarFilaComServiceWorker()
    if (removidos > 0) {
      atualizarPendentes()
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      queryClient.invalidateQueries({ queryKey: ['estoque'] })
    }
  }, [atualizarPendentes, queryClient])

  // Sincroniza silenciosamente o catalogo (Obras, Materiais e Ferramentas) para uso offline
  const sincronizarCatalogo = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false
    }

    try {
      const [obrasRes, materiaisRes, ferramentasRes] = await Promise.allSettled([
        typeof apiClient.getObras === 'function' ? apiClient.getObras(true) : Promise.resolve([]),
        typeof apiClient.getMateriais === 'function' ? apiClient.getMateriais() : Promise.resolve([]),
        typeof apiClient.getFerramentas === 'function'
          ? apiClient.getFerramentas({ status: 'DISPONIVEL', somenteAtivas: true })
          : Promise.resolve([]),
      ])

      let atualizouAlgum = false

      if (obrasRes.status === 'fulfilled' && Array.isArray(obrasRes.value) && obrasRes.value.length > 0) {
        salvarCacheObras(obrasRes.value)
        atualizouAlgum = true
      }

      if (
        materiaisRes.status === 'fulfilled' &&
        Array.isArray(materiaisRes.value) &&
        materiaisRes.value.length > 0
      ) {
        salvarCacheMateriais(materiaisRes.value)
        atualizouAlgum = true
      }

      if (
        ferramentasRes.status === 'fulfilled' &&
        Array.isArray(ferramentasRes.value) &&
        ferramentasRes.value.length > 0
      ) {
        salvarCacheFerramentas(ferramentasRes.value)
        atualizouAlgum = true
      }

      if (atualizouAlgum) {
        const agora = new Date().toISOString()
        registrarTimestampSyncCatalogo(agora)
        setUltimaSyncCatalogo(agora)
      }

      return atualizouAlgum
    } catch {
      return false
    }
  }, [])

  // Sincroniza todas as requisicoes salvas localmente (Upload: Celular -> Servidor)
  const sincronizar = useCallback(async (): Promise<ResultadoSincronizacao> => {
    await reconciliarBackgroundSync()

    const itens = obterRequisicoesOffline()
    if (itens.length === 0) {
      const vazio: ResultadoSincronizacao = { total: 0, sincronizadas: 0, falhas: 0, erros: [] }
      setResultado(vazio)
      return vazio
    }

    setIsSincronizando(true)
    let sincronizadas = 0
    let falhas = 0
    const erros: string[] = []

    for (const item of itens) {
      try {
        await apiClient.createRequisicao(item.dados)
        removerRequisicaoOffline(item.idLocal)
        sincronizadas += 1
      } catch (err: any) {
        // Caso o servidor retorne 409 por chave de idempotencia ja processada pelo Service Worker
        if (err?.response?.status === 409) {
          removerRequisicaoOffline(item.idLocal)
          sincronizadas += 1
          continue
        }
        falhas += 1
        const msg = err?.response?.data?.erro || err?.message || 'Falha na comunicacao com o servidor'
        erros.push(`${item.dadosExibicao?.obraNome || 'Requisicao'}: ${msg}`)
        atualizarTentativaOffline(item.idLocal, msg)
      }
    }

    // Se restarem falhas de rede, agenda o Background Sync nativo do Service Worker
    if (falhas > 0) {
      void registrarBackgroundSync()
    }

    const relatorio: ResultadoSincronizacao = {
      total: itens.length,
      sincronizadas,
      falhas,
      erros,
    }

    setResultado(relatorio)
    setIsSincronizando(false)
    atualizarPendentes()

    if (sincronizadas > 0) {
      queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
      queryClient.invalidateQueries({ queryKey: ['estoque'] })
    }

    return relatorio
  }, [queryClient, atualizarPendentes, reconciliarBackgroundSync])

  // Inicializacao do Background Sync e Periodic Background Sync no Service Worker
  useEffect(() => {
    void salvarConfigSyncNoIndexedDB()
    void verificarSuporteBackgroundSync().then(setBgSyncSuportado)
    void registrarPeriodicBackgroundSync()
    void reconciliarBackgroundSync()

    if (obterRequisicoesOffline().length > 0) {
      void registrarBackgroundSync()
    }
  }, [reconciliarBackgroundSync])

  // Monitora conexao, foco da tela, mensagens do Service Worker e timer periodico de 5 minutos
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      // Dispara sincronizacao imediata no retorno de sinal
      void sincronizar()
      void sincronizarCatalogo()
    }

    function handleOffline() {
      setIsOnline(false)
    }

    function handleFilaChange() {
      atualizarPendentes()
    }

    function handleVisibilityChange() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void reconciliarBackgroundSync()
        if (typeof navigator === 'undefined' || navigator.onLine) {
          if (obterRequisicoesOffline().length > 0) {
            void sincronizar()
          }
          const ultima = obterTimestampSyncCatalogo()
          const expirado =
            !ultima || Date.now() - new Date(ultima).getTime() >= INTERVALO_SYNC_CATALOGO_MS
          if (expirado) {
            void sincronizarCatalogo()
          }
        }
      }
    }

    function handleServiceWorkerMessage(event: MessageEvent) {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'OBRAS_BG_SYNC_ITEM_ENVIADO' && typeof data.idLocal === 'string') {
        removerRequisicaoOffline(data.idLocal)
        atualizarPendentes()
        queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
        queryClient.invalidateQueries({ queryKey: ['estoque'] })
      } else if (data.type === 'OBRAS_BG_SYNC_COMPLETED') {
        void reconciliarBackgroundSync()
        atualizarPendentes()
        queryClient.invalidateQueries({ queryKey: ['requisicoes'] })
        queryClient.invalidateQueries({ queryKey: ['estoque'] })
      } else if (data.type === 'OBRAS_PERIODIC_SYNC_COMPLETED') {
        void sincronizarCatalogo()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('obras-offline-change', handleFilaChange)
    window.addEventListener('storage', handleFilaChange)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker) {
      try {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
      } catch {
        // Ignorar em ambientes de teste sem listener no mock de serviceWorker
      }
    }

    // Timer periodico a cada 5 minutos enquanto o aplicativo estiver aberto
    const intervalId = window.setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        if (obterRequisicoesOffline().length > 0) {
          void sincronizar()
        }
        void sincronizarCatalogo()
      }
    }, INTERVALO_SYNC_CATALOGO_MS)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('obras-offline-change', handleFilaChange)
      window.removeEventListener('storage', handleFilaChange)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      if (
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        navigator.serviceWorker
      ) {
        try {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
        } catch {
          // Ignorar em ambientes sem removeEventListener
        }
      }
      window.clearInterval(intervalId)
    }
  }, [sincronizar, sincronizarCatalogo, atualizarPendentes, reconciliarBackgroundSync, queryClient])

  return {
    isOnline,
    pendentes,
    isSincronizando,
    resultado,
    ultimaSyncCatalogo,
    bgSyncSuportado,
    sincronizar,
    sincronizarCatalogo,
    atualizarPendentes,
  }
}
