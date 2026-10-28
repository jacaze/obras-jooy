import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarSituacaoCargoSchema,
  criarCargoSchema,
  listarCargosQuerySchema,
} from './cargo.schemas.js'
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js'

export async function cargoRoutes(app: FastifyInstance) {
  // Listar cargos (autenticado)
  app.get(
    '/cargos',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Cargos'],
        summary: 'Listagem de cargos',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { somenteAtivos } = listarCargosQuerySchema.parse(request.query)

      const cargos = await prisma.cargo.findMany({
        where: somenteAtivos ? { ativo: true } : undefined,
        include: {
          _count: {
            select: { usuarios: true },
          },
        },
        orderBy: { nome: 'asc' },
      })

      return reply.status(200).send(cargos)
    }
  )

  // Criar cargo (somente ADMIN)
  app.post(
    '/cargos',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN])],
      schema: {
        tags: ['Cargos'],
        summary: 'Criar novo cargo (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { nome } = criarCargoSchema.parse(request.body)

      const cargoExistente = await prisma.cargo.findFirst({
        where: {
          nome: {
            equals: nome,
            mode: 'insensitive',
          },
        },
      })

      if (cargoExistente) {
        throw new ConflictError('Cargo com este nome ja cadastrado')
      }

      const novoCargo = await prisma.cargo.create({
        data: { nome },
      })

      return reply.status(201).send(novoCargo)
    }
  )

  // Atualizar situacao de cargo (somente ADMIN)
  app.patch(
    '/cargos/:id/situacao',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN])],
      schema: {
        tags: ['Cargos'],
        summary: 'Ativar ou inativar cargo (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { ativo } = atualizarSituacaoCargoSchema.parse(request.body)

      const cargo = await prisma.cargo.findUnique({
        where: { id },
      })

      if (!cargo) {
        throw new NotFoundError('Cargo nao localizado')
      }

      const cargoAtualizado = await prisma.cargo.update({
        where: { id },
        data: { ativo },
      })

      return reply.status(200).send(cargoAtualizado)
    }
  )
}
