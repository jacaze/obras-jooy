import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarObraSchema,
  atualizarSituacaoObraSchema,
  criarObraSchema,
  listarObrasQuerySchema,
} from './obra.schemas.js'
import {
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js'

export async function obraRoutes(app: FastifyInstance) {
  // Listar obras (qualquer usuario autenticado)
  app.get(
    '/obras',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Obras'],
        summary: 'Listagem de obras cadastradas',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { somenteAtivas } = listarObrasQuerySchema.parse(request.query)

      const obras = await prisma.obra.findMany({
        where: somenteAtivas ? { ativa: true } : undefined,
        include: {
          _count: {
            select: { areas: true },
          },
        },
        orderBy: { nome: 'asc' },
      })

      return reply.status(200).send(obras)
    }
  )

  // Obter detalhes de uma obra especifica
  app.get(
    '/obras/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Obras'],
        summary: 'Obter dados de uma obra e suas areas',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const obra = await prisma.obra.findUnique({
        where: { id },
        include: {
          areas: {
            orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
          },
        },
      })

      if (!obra) {
        throw new NotFoundError('Obra nao localizada')
      }

      return reply.status(200).send(obra)
    }
  )

  // Cadastrar nova obra (exclusivo ADMIN e ADMINISTRACAO)
  app.post(
    '/obras',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ADMINISTRACAO])],
      schema: {
        tags: ['Obras'],
        summary: 'Cadastrar nova obra (ADMIN ou ADMINISTRACAO)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { codigo, nome, cidade } = criarObraSchema.parse(request.body)

      const codigoExistente = await prisma.obra.findFirst({
        where: {
          codigo: {
            equals: codigo,
            mode: 'insensitive',
          },
        },
      })

      if (codigoExistente) {
        throw new ConflictError('Codigo de obra ja cadastrado')
      }

      const novaObra = await prisma.obra.create({
        data: {
          codigo,
          nome,
          cidade,
          ativa: true,
        },
      })

      return reply.status(201).send(novaObra)
    }
  )

  // Atualizar dados de uma obra (nome e cidade - codigo e imutavel)
  app.patch(
    '/obras/:id',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ADMINISTRACAO])],
      schema: {
        tags: ['Obras'],
        summary: 'Atualizar dados cadastrais da obra (exclusivo ADMIN ou ADMINISTRACAO)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const dados = atualizarObraSchema.parse(request.body)

      const obra = await prisma.obra.findUnique({
        where: { id },
      })

      if (!obra) {
        throw new NotFoundError('Obra nao localizada')
      }

      const obraAtualizada = await prisma.obra.update({
        where: { id },
        data: dados,
      })

      return reply.status(200).send(obraAtualizada)
    }
  )

  // Ativar ou desativar obra
  app.patch(
    '/obras/:id/situacao',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ADMINISTRACAO])],
      schema: {
        tags: ['Obras'],
        summary: 'Ativar ou inativar obra (exclusivo ADMIN ou ADMINISTRACAO)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { ativa } = atualizarSituacaoObraSchema.parse(request.body)

      const obra = await prisma.obra.findUnique({
        where: { id },
      })

      if (!obra) {
        throw new NotFoundError('Obra nao localizada')
      }

      const obraAtualizada = await prisma.obra.update({
        where: { id },
        data: { ativa },
      })

      return reply.status(200).send(obraAtualizada)
    }
  )
}
