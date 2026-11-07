import type { CriarRequisicaoInput } from '../types/requisicao'
import type { Obra, EtapaArea } from '../types/obra'
import type { Material } from '../types/material'

export const CHAVE_REQUISICOES_OFFLINE = 'obras_offline_requisicoes_pendentes'
export const CHAVE_CACHE_OBRAS = 'obras_offline_cache_obras'
export const CHAVE_CACHE_MATERIAIS = 'obras_offline_cache_materiais'
export const CHAVE_CACHE_ETAPAS_PREFIX = 'obras_offline_cache_etapas_'

export interface ItemExibicaoOffline {
  descricao: string
  codigo: string
  quantidade: number
  unidadeMedida?: string
}

export interface RequisicaoOffline {
  idLocal: string
  dados: CriarRequisicaoInput
  criadaEm: string
  tentativas: number
  ultimoErro?: string
  dadosExibicao: {
    obraNome?: string
    areaNome?: string
    etapaNome?: string
    solicitanteNome?: string
    itens: ItemExibicaoOffline[]
  }
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage
    }
  } catch {
    // ignorar em ambientes sem storage
  }
  return null
}

/**
 * Salva uma nova requisicao criada offline na fila local.
 */
export function salvarRequisicaoOffline(
  nova: Omit<RequisicaoOffline, 'idLocal' | 'criadaEm' | 'tentativas'>
): RequisicaoOffline {
  const lista = obterRequisicoesOffline()
  const requisicao: RequisicaoOffline = {
    ...nova,
    idLocal: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    criadaEm: new Date().toISOString(),
    tentativas: 0,
  }

  lista.push(requisicao)
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(CHAVE_REQUISICOES_OFFLINE, JSON.stringify(lista))
    } catch (err) {
      console.error('Erro ao salvar requisicao offline no localStorage', err)
    }
  }

  return requisicao
}

/**
 * Retorna todas as requisicoes offline pendentes de sincronizacao.
 */
export function obterRequisicoesOffline(): RequisicaoOffline[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(CHAVE_REQUISICOES_OFFLINE)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (err) {
    console.error('Erro ao ler requisicoes offline do localStorage', err)
    return []
  }
}

/**
 * Remove uma requisicao da fila local apos sincronizacao bem-sucedida.
 */
export function removerRequisicaoOffline(idLocal: string): void {
  const lista = obterRequisicoesOffline()
  const filtrada = lista.filter((item) => item.idLocal !== idLocal)
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(CHAVE_REQUISICOES_OFFLINE, JSON.stringify(filtrada))
    } catch (err) {
      console.error('Erro ao remover requisicao offline', err)
    }
  }
}

/**
 * Registra falha de tentativa para uma requisicao offline.
 */
export function atualizarTentativaOffline(idLocal: string, erro: string): void {
  const lista = obterRequisicoesOffline()
  const item = lista.find((i) => i.idLocal === idLocal)
  if (item) {
    item.tentativas += 1
    item.ultimoErro = erro
    const storage = getStorage()
    if (storage) {
      try {
        storage.setItem(CHAVE_REQUISICOES_OFFLINE, JSON.stringify(lista))
      } catch (err) {
        console.error('Erro ao atualizar tentativa offline', err)
      }
    }
  }
}

/**
 * Limpa a fila de requisicoes offline.
 */
export function limparRequisicoesOffline(): void {
  const storage = getStorage()
  if (storage) {
    try {
      storage.removeItem(CHAVE_REQUISICOES_OFFLINE)
    } catch (err) {
      console.error('Erro ao limpar requisicoes offline', err)
    }
  }
}

/**
 * Salva cache de obras para utilizacao offline no canteiro.
 */
export function salvarCacheObras(obras: Obra[]): void {
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(CHAVE_CACHE_OBRAS, JSON.stringify(obras))
    } catch (err) {
      console.error('Erro ao salvar cache de obras', err)
    }
  }
}

/**
 * Retorna cache de obras local.
 */
export function obterCacheObras(): Obra[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(CHAVE_CACHE_OBRAS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Erro ao ler cache de obras', err)
    return []
  }
}

/**
 * Salva cache de materiais para utilizacao offline no canteiro.
 */
export function salvarCacheMateriais(materiais: Material[]): void {
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(CHAVE_CACHE_MATERIAIS, JSON.stringify(materiais))
    } catch (err) {
      console.error('Erro ao salvar cache de materiais', err)
    }
  }
}

/**
 * Retorna cache de materiais local.
 */
export function obterCacheMateriais(): Material[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(CHAVE_CACHE_MATERIAIS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Erro ao ler cache de materiais', err)
    return []
  }
}

/**
 * Salva cache de etapas por area.
 */
export function salvarCacheEtapas(areaId: string, etapas: EtapaArea[]): void {
  const storage = getStorage()
  if (storage) {
    try {
      storage.setItem(`${CHAVE_CACHE_ETAPAS_PREFIX}${areaId}`, JSON.stringify(etapas))
    } catch (err) {
      console.error('Erro ao salvar cache de etapas', err)
    }
  }
}

/**
 * Retorna cache de etapas da area.
 */
export function obterCacheEtapas(areaId: string): EtapaArea[] {
  const storage = getStorage()
  if (!storage) return []
  try {
    const raw = storage.getItem(`${CHAVE_CACHE_ETAPAS_PREFIX}${areaId}`)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Erro ao ler cache de etapas', err)
    return []
  }
}
