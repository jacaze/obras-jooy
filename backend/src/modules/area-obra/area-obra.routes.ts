import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarAreaObraSchema,
  atualizarSituacaoAreaObraSchema,
  criarAreaObraSchema,
  listarAreasQuerySchema,
} from './area-obra.schemas.js'
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js'

export async function areaObraRoutes(app: FastifyInstance) {
  // Listar areas de uma obra (qualquer usuario autenticado)
  app.get(
    '/obras/:obraId/areas',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Areas da Obra'],
        summary: 'Listagem de areas/pavimentos de uma obra',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { obraId } = request.params as { obraId: string }
      const { somenteAtivas } = listarAreasQuerySchema.parse(request.query)

      const obra = await prisma.obra.findUnique({
        where: { id: obraId },
      })

      if (!obra) {
        throw new NotFoundError('Obra nao localizada')
      }

      const areas = await prisma.areaObra.findMany({
        where: {
          obraId,
          ...(somenteAtivas ? { ativa: true } : {}),
        },
        orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      })

      return reply.status(200).send(areas)
    }
  )

  // Criar nova area para uma obra (exclusivo ADMIN e ENGENHARIA)
  app.post(
    '/obras/:obraId/areas',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA])],
      schema: {
        tags: ['Areas da Obra'],
        summary: 'Criar nova area ou pavimento na obra (exclusivo ADMIN ou ENGENHARIA)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { obraId } = request.params as { obraId: string }
      const { nome, ordem } = criarAreaObraSchema.parse(request.body)

      const obra = await prisma.obra.findUnique({
        where: { id: obraId },
      })

      if (!obra) {
        throw new NotFoundError('Obra nao localizada')
      }

      if (!obra.ativa) {
        throw new BusinessRuleError('Nao e possivel cadastrar areas em uma obra inativa')
      }

      const areaExistente = await prisma.areaObra.findFirst({
        where: {
          obraId,
          nome: {
            equals: nome,
            mode: 'insensitive',
          },
        },
      })

      if (areaExistente) {
        throw new ConflictError('Ja existe uma area com este nome nesta obra')
      }

      const novaArea = await prisma.areaObra.create({
        data: {
          obraId,
          nome,
          ordem,
          ativa: true,
        },
      })

      return reply.status(201).send(novaArea)
    }
  )

  // Atualizar dados de uma area (nome e ordem - exclusivo ADMIN e ENGENHARIA)
  app.patch(
    '/areas/:id',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA])],
      schema: {
        tags: ['Areas da Obra'],
        summary: 'Atualizar dados de uma area/pavimento (exclusivo ADMIN ou ENGENHARIA)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const dados = atualizarAreaObraSchema.parse(request.body)

      const area = await prisma.areaObra.findUnique({
        where: { id },
      })

      if (!area) {
        throw new NotFoundError('Area nao localizada')
      }

      if (dados.nome && dados.nome.toLowerCase() !== area.nome.toLowerCase()) {
        const nomeConflito = await prisma.areaObra.findFirst({
          where: {
            obraId: area.obraId,
            nome: {
              equals: dados.nome,
              mode: 'insensitive',
            },
            id: { not: id },
          },
        })

        if (nomeConflito) {
          throw new ConflictError('Ja existe uma area com este nome nesta obra')
        }
      }

      const areaAtualizada = await prisma.areaObra.update({
        where: { id },
        data: dados,
      })

      return reply.status(200).send(areaAtualizada)
    }
  )

  // Ativar ou desativar area (exclusivo ADMIN e ENGENHARIA)
  app.patch(
    '/areas/:id/situacao',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA])],
      schema: {
        tags: ['Areas da Obra'],
        summary: 'Ativar ou inativar area/pavimento (exclusivo ADMIN ou ENGENHARIA)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { ativa } = atualizarSituacaoAreaObraSchema.parse(request.body)

      const area = await prisma.areaObra.findUnique({
        where: { id },
      })

      if (!area) {
        throw new NotFoundError('Area nao localizada')
      }

      const areaAtualizada = await prisma.areaObra.update({
        where: { id },
        data: { ativa },
      })

      return reply.status(200).send(areaAtualizada)
    }
  )
}
