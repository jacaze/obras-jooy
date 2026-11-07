import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import * as apiClient from '../api/client'
import {
  obterRequisicoesOffline,
  removerRequisicaoOffline,
  atualizarTentativaOffline,
  type RequisicaoOffline,
} from '../services/offlineStorage'

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

  const atualizarPendentes = useCallback(() => {
    setPendentes(obterRequisicoesOffline())
  }, [])

  // Sincroniza todas as requisicoes salvas localmente
  const sincronizar = useCallback(async (): Promise<ResultadoSincronizacao> => {
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
        falhas += 1
        const msg = err?.response?.data?.erro || err?.message || 'Falha na comunicacao com o servidor'
        erros.push(`${item.dadosExibicao?.obraNome || 'Requisicao'}: ${msg}`)
        atualizarTentativaOffline(item.idLocal, msg)
      }
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
  }, [queryClient, atualizarPendentes])

  // Monitora conexao e escuta eventos de alteracao na fila offline
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      // Dispara sincronizacao automatica ao retornar conexao
      sincronizar()
    }

    function handleOffline() {
      setIsOnline(false)
    }

    function handleFilaChange() {
      atualizarPendentes()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('obras-offline-change', handleFilaChange)
    window.addEventListener('storage', handleFilaChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('obras-offline-change', handleFilaChange)
      window.removeEventListener('storage', handleFilaChange)
    }
  }, [sincronizar, atualizarPendentes])

  return {
    isOnline,
    pendentes,
    isSincronizando,
    resultado,
    sincronizar,
    atualizarPendentes,
  }
}
