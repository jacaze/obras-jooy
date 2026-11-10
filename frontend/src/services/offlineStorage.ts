import type { CriarRequisicaoInput } from '../types/requisicao'
import type { Obra, EtapaArea } from '../types/obra'
import type { Material } from '../types/material'

export const CHAVE_REQUISICOES_OFFLINE = 'obras_offline_requisicoes_pendentes'
export const CHAVE_CACHE_OBRAS = 'obras_offline_cache_obras'
export const CHAVE_CACHE_MATERIAIS = 'obras_offline_cache_materiais'
export const CHAVE_CACHE_ETAPAS_PREFIX = 'obras_offline_cache_etapas_'
export const CHAVE_CREDENCIAIS_OFFLINE = 'obras_offline_credenciais_usuarios'

export interface CredencialUsuarioOffline {
  login: string
  salt: string
  hashSenha: string
  token: string
  usuario: any
  atualizadoEm: string
}

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

/**
 * Funcao auxiliar para calcular SHA-256 com salt utilizando Web Crypto API
 * com fallback seguro para ambientes de teste (Node / JSDOM).
 */
export async function calcularHashCredencial(senha: string, salt: string): Promise<string> {
  const texto = `${salt}:${senha}:jooy-offline`
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(texto)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch {
      // continua para fallback
    }
  }

  // Fallback portavel sem dependencias externas
  let hash = 0
  for (let i = 0; i < texto.length; i++) {
    const char = texto.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return `h_${Math.abs(hash).toString(16)}`
}

/**
 * Salva credenciais seguras para autenticacao offline no dispositivo.
 */
export async function salvarCredencialOffline(
  login: string,
  senhaStr: string,
  token: string,
  usuario: any
): Promise<void> {
  const storage = getStorage()
  if (!storage) return

  try {
    const loginFormatado = login.trim().toLowerCase()
    const salt = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    const hashSenha = await calcularHashCredencial(senhaStr, salt)

    const raw = storage.getItem(CHAVE_CREDENCIAIS_OFFLINE)
    const mapa: Record<string, CredencialUsuarioOffline> = raw ? JSON.parse(raw) : {}

    mapa[loginFormatado] = {
      login: loginFormatado,
      salt,
      hashSenha,
      token,
      usuario,
      atualizadoEm: new Date().toISOString(),
    }

    storage.setItem(CHAVE_CREDENCIAIS_OFFLINE, JSON.stringify(mapa))
  } catch (err) {
    console.error('Erro ao salvar credenciais offline', err)
  }
}

/**
 * Valida credenciais do usuario localmente no dispositivo para login sem internet.
 */
export async function autenticarOffline(
  loginStr: string,
  senhaStr: string
): Promise<{ token: string; usuario: any } | null> {
  const storage = getStorage()
  if (!storage) return null

  try {
    const loginFormatado = loginStr.trim().toLowerCase()
    const raw = storage.getItem(CHAVE_CREDENCIAIS_OFFLINE)
    if (!raw) return null

    const mapa: Record<string, CredencialUsuarioOffline> = JSON.parse(raw)
    const credencial = mapa[loginFormatado]
    if (!credencial) return null

    const hashCalculado = await calcularHashCredencial(senhaStr, credencial.salt)
    if (hashCalculado === credencial.hashSenha) {
      return {
        token: credencial.token,
        usuario: credencial.usuario,
      }
    }
    return null
  } catch (err) {
    console.error('Erro ao autenticar offline', err)
    return null
  }
}

/**
 * Retorna os logins com credenciais disponiveis neste dispositivo.
 */
export function obterLoginsDisponiveisOffline(): string[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(CHAVE_CREDENCIAIS_OFFLINE)
    if (!raw) return []
    const mapa: Record<string, CredencialUsuarioOffline> = JSON.parse(raw)
    return Object.keys(mapa)
  } catch {
    return []
  }
}
