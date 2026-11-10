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

const includeFerramentaPadrao = {
  emprestadoPara: {
    select: {
      id: true,
      nome: true,
      login: true,
      perfil: true,
    },
  },
  cautelas: {
    orderBy: { retiradaEm: 'desc' as const },
    take: 20,
    include: {
      usuario: {
        select: { id: true, nome: true, login: true, perfil: true },
      },
      area: {
        select: { id: true, nome: true },
      },
      entreguePor: {
        select: { id: true, nome: true, login: true },
      },
      recebidoPor: {
        select: { id: true, nome: true, login: true },
      },
    },
  },
}

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
        include: includeFerramentaPadrao,
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
        include: includeFerramentaPadrao,
      })

      if (!ferramenta) {
        throw new NotFoundError('Ferramenta nao encontrada')
      }

      return reply.status(200).send(ferramenta)
    }
  )

  // Historico completo de cautelas de uma ferramenta
  app.get(
    '/ferramentas/:id/cautelas',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Historico de cautelas (emprestimos e devolucoes) da ferramenta',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const ferramenta = await prisma.ferramenta.findUnique({ where: { id } })
      if (!ferramenta) {
        throw new NotFoundError('Ferramenta nao encontrada')
      }

      const cautelas = await prisma.cautelaFerramenta.findMany({
        where: { ferramentaId: id },
        include: {
          usuario: {
            select: { id: true, nome: true, login: true, perfil: true },
          },
          area: {
            select: { id: true, nome: true },
          },
          entreguePor: {
            select: { id: true, nome: true, login: true },
          },
          recebidoPor: {
            select: { id: true, nome: true, login: true },
          },
        },
        orderBy: { retiradaEm: 'desc' },
      })

      return reply.status(200).send(cautelas)
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
        include: includeFerramentaPadrao,
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
        include: includeFerramentaPadrao,
      })

      return reply.status(200).send(atualizada)
    }
  )

  // Registrar emprestimo (cautela) da ferramenta - exclusivo ALMOXARIFE e ADMIN
  app.post(
    '/ferramentas/:id/emprestimo',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Registrar cautela/emprestimo da ferramenta com flag de teste na saida',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const {
        usuarioId,
        areaId,
        testadoNaSaida,
        previsaoDevolucao,
        observacaoSaida,
      } = registrarEmprestimoSchema.parse(request.body)
      const operadorId = (request.user as { sub: string }).sub

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

      if (areaId) {
        const area = await prisma.areaObra.findUnique({ where: { id: areaId } })
        if (!area) {
          throw new NotFoundError('Area da obra nao localizada')
        }
      }

      await prisma.cautelaFerramenta.create({
        data: {
          ferramentaId: id,
          usuarioId,
          areaId: areaId || null,
          entreguePorId: operadorId,
          testadoNaSaida,
          previsaoDevolucao: previsaoDevolucao ? new Date(previsaoDevolucao) : null,
          observacaoSaida: observacaoSaida || null,
        },
      })

      const atualizada = await prisma.ferramenta.update({
        where: { id },
        data: {
          status: 'EMPRESTADO',
          emprestadoParaId: usuarioId,
        },
        include: includeFerramentaPadrao,
      })

      return reply.status(200).send(atualizada)
    }
  )

  // Registrar devolucao da ferramenta - exclusivo ALMOXARIFE e ADMIN
  app.post(
    '/ferramentas/:id/devolucao',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Ferramentas'],
        summary: 'Registrar devolucao da ferramenta com teste no retorno (exclusivo ALMOXARIFE/ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const {
        testadoNoRetorno,
        comDefeito,
        observacaoDevolucao,
      } = registrarDevolucaoSchema.parse(request.body)
      const operadorId = (request.user as { sub: string }).sub

      const ferramenta = await prisma.ferramenta.findUnique({ where: { id } })
      if (!ferramenta) {
        throw new NotFoundError('Ferramenta nao encontrada')
      }

      const cautelaAtiva = await prisma.cautelaFerramenta.findFirst({
        where: {
          ferramentaId: id,
          devolvidaEm: null,
        },
        orderBy: { retiradaEm: 'desc' },
      })

      if (cautelaAtiva) {
        await prisma.cautelaFerramenta.update({
          where: { id: cautelaAtiva.id },
          data: {
            devolvidaEm: new Date(),
            recebidoPorId: operadorId,
            testadoNoRetorno,
            comDefeito,
            observacaoDevolucao: observacaoDevolucao || null,
          },
        })
      }

      const atualizada = await prisma.ferramenta.update({
        where: { id },
        data: {
          status: comDefeito ? 'COM_DEFEITO' : 'DISPONIVEL',
          emprestadoParaId: null,
        },
        include: includeFerramentaPadrao,
      })

      return reply.status(200).send(atualizada)
    }
  )
}
