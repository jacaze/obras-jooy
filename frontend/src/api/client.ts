import axios from 'axios'
import type { Cargo, PerfilUsuario, UsuarioAuth, UsuarioListagem } from '../types/auth'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para injetar token JWT em todas as requisicoes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('almox.token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratar expiracao de sessao (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      localStorage.removeItem('almox.token')
      localStorage.removeItem('almox.usuario')
      window.dispatchEvent(new Event('auth:expirada'))
    }
    return Promise.reject(error)
  }
)

export interface HealthResponse {
  status: string
  timestamp: string
  servico: string
  versao: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/health')
  return response.data
}

export async function login(loginStr: string, senhaStr: string): Promise<{ token: string; usuario: UsuarioAuth }> {
  const response = await api.post<{ token: string; usuario: UsuarioAuth }>('/auth/login', {
    login: loginStr,
    senha: senhaStr,
  })
  return response.data
}

export async function getMe(): Promise<UsuarioAuth> {
  const response = await api.get<UsuarioAuth>('/auth/me')
  return response.data
}

export async function getCargos(somenteAtivos = true): Promise<Cargo[]> {
  const response = await api.get<Cargo[]>(`/cargos?somenteAtivos=${somenteAtivos}`)
  return response.data
}

export async function createCargo(nome: string): Promise<Cargo> {
  const response = await api.post<Cargo>('/cargos', { nome })
  return response.data
}

export async function toggleCargoSituacao(id: string, ativo: boolean): Promise<Cargo> {
  const response = await api.patch<Cargo>(`/cargos/${id}/situacao`, { ativo })
  return response.data
}

export async function getUsuarios(): Promise<UsuarioListagem[]> {
  const response = await api.get<UsuarioListagem[]>('/usuarios')
  return response.data
}

export async function createUsuario(dados: {
  nome: string
  login: string
  senha: string
  perfil: PerfilUsuario
  cargoId: string
}): Promise<UsuarioListagem> {
  const response = await api.post<UsuarioListagem>('/usuarios', dados)
  return response.data
}

export async function toggleUsuarioSituacao(id: string, ativo: boolean): Promise<{ id: string; ativo: boolean }> {
  const response = await api.patch<{ id: string; ativo: boolean }>(`/usuarios/${id}/situacao`, { ativo })
  return response.data
}

export async function resetarSenhaUsuario(id: string, novaSenha: string): Promise<{ mensagem: string }> {
  const response = await api.patch<{ mensagem: string }>(`/usuarios/${id}/senha`, { novaSenha })
  return response.data
}
