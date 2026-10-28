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
  cargo: {
    id: string
    nome: string
  }
}
