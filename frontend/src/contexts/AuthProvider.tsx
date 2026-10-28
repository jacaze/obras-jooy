import { useEffect, useState, type ReactNode } from 'react'
import { AuthContext } from './auth-context'
import type { UsuarioAuth } from '../types/auth'
import { getMe, login as apiLogin } from '../api/client'

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
  const [carregando, setCarregando] = useState<boolean>(true)

  useEffect(() => {
    async function inicializar() {
      const tokenSalvo = localStorage.getItem('almox.token')
      if (tokenSalvo) {
        try {
          const dadosUsuario = await getMe()
          setUsuario(dadosUsuario)
          localStorage.setItem('almox.usuario', JSON.stringify(dadosUsuario))
        } catch {
          logout()
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
    const resultado = await apiLogin(loginStr, senhaStr)
    setToken(resultado.token)
    setUsuario(resultado.usuario)
    localStorage.setItem('almox.token', resultado.token)
    localStorage.setItem('almox.usuario', JSON.stringify(resultado.usuario))
  }

  function logout() {
    setToken(null)
    setUsuario(null)
    localStorage.removeItem('almox.token')
    localStorage.removeItem('almox.usuario')
  }

  return (
    <AuthContext.Provider value={{ usuario, token, carregando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
