export type PerfilUsuario =
  | 'ADMIN'
  | 'ALMOXARIFE'
  | 'ENGENHARIA'
  | 'ADMINISTRACAO'
  | 'ENCARREGADO'

export interface UsuarioAuth {
  id: string
  nome: string
  login: string
  perfil: PerfilUsuario
  cargo: string
  obraId?: string | null
  obra?: {
    id: string
    codigo: string
    nome: string
  } | null
}

export interface Cargo {
  id: string
  nome: string
  ativo: boolean
  criadoEm: string
  _count?: {
    usuarios: number
  }
}

export interface UsuarioListagem {
  id: string
  nome: string
  login: string
  perfil: PerfilUsuario
  ativo: boolean
  criadoEm: string
  obraId?: string | null
  obra?: {
    id: string
    codigo: string
    nome: string
  } | null
  cargo: {
    id: string
    nome: string
  }
}
