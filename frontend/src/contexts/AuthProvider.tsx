import { useEffect, useState, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import type { UsuarioAuth } from '../types/auth'
import { getMe, login as apiLogin } from '../api/client'
import {
  salvarCredencialOffline,
  autenticarOffline,
} from '../services/offlineStorage'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('almox.token'))
  const [usuario, setUsuario] = useState<UsuarioAuth | null>(() => {
    const salvo = localStorage.getItem('almox.usuario')
    if (salvo) {
      try {
        return JSON.parse(salvo)
      } catch {
        return null
      }
    }
    return null
  })
  const [isOfflineLogin, setIsOfflineLogin] = useState<boolean>(() => {
    return localStorage.getItem('almox.offline_session') === 'true'
  })
  const [carregando, setCarregando] = useState<boolean>(true)

  useEffect(() => {
    async function inicializar() {
      const tokenSalvo = localStorage.getItem('almox.token')
      if (tokenSalvo) {
        // Se estiver explicitamente offline pelo navegador, mantem a sessao salva sem forcar logout
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setCarregando(false)
          return
        }

        try {
          const dadosUsuario = await getMe()
          setUsuario(dadosUsuario)
          localStorage.setItem('almox.usuario', JSON.stringify(dadosUsuario))
          setIsOfflineLogin(false)
          localStorage.removeItem('almox.offline_session')
        } catch (err: any) {
          // Desloga apenas se o servidor rejeitar a autenticacao (HTTP 401 ou 403)
          // Se for erro de rede / timeout (canteiro sem internet), preserva a sessao local
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            logout()
          } else {
            setIsOfflineLogin(true)
            localStorage.setItem('almox.offline_session', 'true')
          }
        }
      }
      setCarregando(false)
    }

    inicializar()

    function lidarExpiracao() {
      logout()
    }

    window.addEventListener('auth:expirada', lidarExpiracao)
    return () => window.removeEventListener('auth:expirada', lidarExpiracao)
  }, [])

  async function login(loginStr: string, senhaStr: string) {
    const estaOffline = typeof navigator !== 'undefined' && !navigator.onLine

    if (estaOffline) {
      const offlineAuth = await autenticarOffline(loginStr, senhaStr)
      if (offlineAuth) {
        setToken(offlineAuth.token)
        setUsuario(offlineAuth.usuario)
        setIsOfflineLogin(true)
        localStorage.setItem('almox.token', offlineAuth.token)
        localStorage.setItem('almox.usuario', JSON.stringify(offlineAuth.usuario))
        localStorage.setItem('almox.offline_session', 'true')
        return
      }
      throw new Error(
        'Modo Offline: Credencial nao localizada neste dispositivo. Para acessar sem internet, e necessario ter realizado login com sucesso ao menos uma vez online.'
      )
    }

    try {
      const resultado = await apiLogin(loginStr, senhaStr)
      setToken(resultado.token)
      setUsuario(resultado.usuario)
      setIsOfflineLogin(false)
      localStorage.setItem('almox.token', resultado.token)
      localStorage.setItem('almox.usuario', JSON.stringify(resultado.usuario))
      localStorage.removeItem('almox.offline_session')

      // Salva hash e credencial para permitir logins offline futuros neste aparelho
      await salvarCredencialOffline(loginStr, senhaStr, resultado.token, resultado.usuario)
    } catch (err: any) {
      // Se a tentativa online falhar por queda de conexao no momento exato
      if (!err?.response || err?.code === 'ERR_NETWORK') {
        const offlineAuth = await autenticarOffline(loginStr, senhaStr)
        if (offlineAuth) {
          setToken(offlineAuth.token)
          setUsuario(offlineAuth.usuario)
          setIsOfflineLogin(true)
          localStorage.setItem('almox.token', offlineAuth.token)
          localStorage.setItem('almox.usuario', JSON.stringify(offlineAuth.usuario))
          localStorage.setItem('almox.offline_session', 'true')
          return
        }
      }
      throw err
    }
  }

  function logout() {
    setToken(null)
    setUsuario(null)
    setIsOfflineLogin(false)
    localStorage.removeItem('almox.token')
    localStorage.removeItem('almox.usuario')
    localStorage.removeItem('almox.offline_session')
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        token,
        carregando,
        isOfflineLogin,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
