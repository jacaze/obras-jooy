import type { FastifyReply, FastifyRequest } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js'
import { prisma } from '../database/prisma.js'

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    throw new UnauthorizedError('Token ausente, invalido ou expirado')
  }

  // Defesa Ativa: Valida se o usuario ainda existe e esta ativo no banco
  const usuario = await prisma.usuario.findUnique({
    where: { id: request.user.sub },
    select: { ativo: true },
  })

  if (!usuario || !usuario.ativo) {
    throw new UnauthorizedError('Usuario inativo ou nao localizado')
  }
}

export function requireRole(allowedRoles: PerfilUsuario[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    // Garante que o usuario foi autenticado
    if (!request.user || !request.user.perfil) {
      throw new UnauthorizedError('Requisicao nao autenticada')
    }

    if (!allowedRoles.includes(request.user.perfil)) {
      throw new ForbiddenError('Acesso negado para este perfil de usuario')
    }
  }
}
