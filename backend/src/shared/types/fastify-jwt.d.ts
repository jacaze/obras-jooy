import '@fastify/jwt'
import { PerfilUsuario } from '@prisma/client'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      login: string
      nome: string
      perfil: PerfilUsuario
      obraId?: string | null
    }
    user: {
      sub: string
      login: string
      nome: string
      perfil: PerfilUsuario
      obraId?: string | null
    }
  }
}
