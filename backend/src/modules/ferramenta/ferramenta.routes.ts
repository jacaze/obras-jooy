import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarFerramentaSchema,
  criarFerramentaSchema,
  listarFerramentasQuerySchema,
  registrarDevolucaoSchema,
  registrarEmprestimoSchema,
} from './ferramenta.schemas.js'
import {
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js'

export async function ferramentaRoutes(app: FastifyInstance) {
  // Listar todas as ferramentas (qualquer usuario autenticado)
  app.get(
    '/ferramentas',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Listagem de ferramentas rastreaveis com status e emprestimo',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { busca, status, somenteAtivas } = listarFerramentasQuerySchema.parse(
        request.query
      )

      const where: any = {}

      if (somenteAtivas !== undefined) {
        where.ativo = somenteAtivas
      }

      if (status) {
        where.status = status
      }

      if (busca) {
        const termo = busca.trim()
        where.OR = [
          { codigo: { contains: termo, mode: 'insensitive' } },
          { nome: { contains: termo, mode: 'insensitive' } },
        ]
      }

      const ferramentas = await prisma.ferramenta.findMany({
        where,
        include: {
          emprestadoPara: {
            select: {
              id: true,
              nome: true,
              login: true,
              perfil: true,
            },
          },
        },
        orderBy: { nome: 'asc' },
      })

      return reply.status(200).send(ferramentas)
    }
  )

  // Detalhes de uma ferramenta por ID
  app.get(
    '/ferramentas/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Detalhes de uma ferramenta especifica',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const ferramenta = await prisma.ferramenta.findUnique({
        where: { id },
        include: {
          emprestadoPara: {
            select: {
              id: true,
              nome: true,
              login: true,
              perfil: true,
            },
          },
        },
      })

      if (!ferramenta) {
        throw new NotFoundError('Ferramenta nao encontrada')
      }

      return reply.status(200).send(ferramenta)
    }
  )

  // Criar nova ferramenta (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.post(
    '/ferramentas',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Cadastrar nova ferramenta de devolucao',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = criarFerramentaSchema.parse(request.body)

      const existente = await prisma.ferramenta.findUnique({
        where: { codigo: dados.codigo },
      })
      if (existente) {
        throw new ConflictError(`Ferramenta com codigo "${dados.codigo}" ja existe`)
      }

      if (dados.emprestadoParaId) {
        const usuario = await prisma.usuario.findUnique({
          where: { id: dados.emprestadoParaId },
        })
        if (!usuario) {
          throw new NotFoundError('Usuario solicitado nao existe')
        }
      }

      const ferramenta = await prisma.ferramenta.create({
        data: {
          codigo: dados.codigo,
          nome: dados.nome,
          status: dados.status,
          emprestadoParaId: dados.status === 'EMPRESTADO' ? dados.emprestadoParaId : null,
          ativo: dados.ativo,
        },
        include: {
          emprestadoPara: {
            select: {
              id: true,
              nome: true,
              login: true,
              perfil: true,
            },
          },
        },
      })

      return reply.status(201).send(ferramenta)
    }
  )

  // Atualizar ferramenta (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.patch(
    '/ferramentas/:id',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Atualizar dados de uma ferramenta',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const dados = atualizarFerramentaSchema.parse(request.body)

      const ferramentaExistente = await prisma.ferramenta.findUnique({ where: { id } })
      if (!ferramentaExistente) {
        throw new NotFoundError('Ferramenta nao encontrada')
      }

      if (dados.emprestadoParaId) {
        const usuario = await prisma.usuario.findUnique({
          where: { id: dados.emprestadoParaId },
        })
        if (!usuario) {
          throw new NotFoundError('Usuario solicitado nao existe')
        }
      }

      const atualizada = await prisma.ferramenta.update({
        where: { id },
        data: {
          ...(dados.nome && { nome: dados.nome }),
          ...(dados.status && { status: dados.status }),
          ...(dados.emprestadoParaId !== undefined && { emprestadoParaId: dados.emprestadoParaId }),
          ...(dados.ativo !== undefined && { ativo: dados.ativo }),
        },
        include: {
          emprestadoPara: {
            select: {
              id: true,
              nome: true,
              login: true,
              perfil: true,
            },
          },
        },
      })

      return reply.status(200).send(atualizada)
    }
  )

  // Registrar emprestimo da ferramenta para um usuario solicitante
  app.post(
    '/ferramentas/:id/emprestimo',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Registrar emprestimo da ferramenta para um usuario',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { usuarioId } = registrarEmprestimoSchema.parse(request.body)

      const ferramenta = await prisma.ferramenta.findUnique({ where: { id } })
      if (!ferramenta) {
        throw new NotFoundError('Ferramenta nao encontrada')
      }

      if (ferramenta.status === 'EMPRESTADO') {
        throw new ConflictError('A ferramenta ja esta emprestada')
      }
      if (ferramenta.status === 'COM_DEFEITO') {
        throw new ConflictError('A ferramenta esta com defeito e nao pode ser emprestada')
      }

      const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } })
      if (!usuario || !usuario.ativo) {
        throw new NotFoundError('Usuario solicitante nao encontrado ou inativo')
      }

      const atualizada = await prisma.ferramenta.update({
        where: { id },
        data: {
          status: 'EMPRESTADO',
          emprestadoParaId: usuarioId,
        },
        include: {
          emprestadoPara: {
            select: {
              id: true,
              nome: true,
              login: true,
              perfil: true,
            },
          },
        },
      })

      return reply.status(200).send(atualizada)
    }
  )

  // Registrar devolucao da ferramenta
  app.post(
    '/ferramentas/:id/devolucao',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Registrar devolucao da ferramenta ao almoxarifado',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { comDefeito } = registrarDevolucaoSchema.parse(request.body)

      const ferramenta = await prisma.ferramenta.findUnique({ where: { id } })
      if (!ferramenta) {
        throw new NotFoundError('Ferramenta nao encontrada')
      }

      const atualizada = await prisma.ferramenta.update({
        where: { id },
        data: {
          status: comDefeito ? 'COM_DEFEITO' : 'DISPONIVEL',
          emprestadoParaId: null,
        },
        include: {
          emprestadoPara: {
            select: {
              id: true,
              nome: true,
              login: true,
              perfil: true,
            },
          },
        },
      })

      return reply.status(200).send(atualizada)
    }
  )
}
