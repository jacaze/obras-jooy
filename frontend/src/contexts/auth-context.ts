import { createContext } from 'react'
import type { UsuarioAuth } from '../types/auth'

export interface AuthContextType {
  usuario: UsuarioAuth | null
  token: string | null
  carregando: boolean
  login: (loginStr: string, senhaStr: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
