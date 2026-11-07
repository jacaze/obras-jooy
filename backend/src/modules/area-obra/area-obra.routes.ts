import type { FastifyInstance } from 'fastify'
import { PerfilUsuario, StatusEtapa } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarAreaObraSchema,
  atualizarSituacaoAreaObraSchema,
  criarAreaObraSchema,
  listarAreasQuerySchema,
  criarEtapaAreaSchema,
  atualizarEtapaAreaSchema,
  alterarStatusEtapaSchema,
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
        include: {
          etapas: {
            orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
          },
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

  // Excluir area da obra (exclusivo ADMIN e ENGENHARIA)
  // Regra futura (T11): Se houver requisicoes vinculadas, bloqueia a exclusao fisica com BusinessRuleError
  app.delete(
    '/areas/:id',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA])],
      schema: {
        tags: ['Areas da Obra'],
        summary: 'Excluir area da obra caso nao possua vinculos operacionais (exclusivo ADMIN ou ENGENHARIA)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const area = await prisma.areaObra.findUnique({
        where: { id },
      })

      if (!area) {
        throw new NotFoundError('Area nao localizada')
      }

      // Trava de integridade: preparada para T11 (Requisicoes) e limites
      // Exemplo futuro: const totalRequisicoes = await prisma.requisicao.count({ where: { areaId: id } })
      // if (totalRequisicoes > 0) throw new BusinessRuleError('Nao e possivel excluir uma area com requisicoes vinculadas. Em vez disso, desative a area.')

      try {
        await prisma.areaObra.delete({
          where: { id },
        })
      } catch (err: any) {
        // Se houver restricao de chave estrangeira (FK)
        if (err.code === 'P2003') {
          throw new BusinessRuleError('Nao e possivel excluir esta area pois existem registros vinculados a ela. Em vez disso, desative a area.')
        }
        throw err
      }

      return reply.status(204).send()
    }
  )

  // ----------------------------------------------------
  // ROTAS DE ETAPAS POR LOCAL / PAVIMENTO (F02)
  // ----------------------------------------------------

  // Listar etapas de uma area (qualquer usuario autenticado)
  app.get(
    '/areas/:areaId/etapas',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Etapas da Area'],
        summary: 'Listar etapas de execucao de uma area/pavimento',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { areaId } = request.params as { areaId: string }

      const area = await prisma.areaObra.findUnique({
        where: { id: areaId },
      })

      if (!area) {
        throw new NotFoundError('Area nao localizada')
      }

      const etapas = await prisma.etapaArea.findMany({
        where: { areaId },
        orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      })

      return reply.status(200).send(etapas)
    }
  )

  // Criar nova etapa para uma area (exclusivo ADMIN e ENGENHARIA)
  app.post(
    '/areas/:areaId/etapas',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA])],
      schema: {
        tags: ['Etapas da Area'],
        summary: 'Criar nova etapa para uma area da obra (exclusivo ADMIN ou ENGENHARIA)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { areaId } = request.params as { areaId: string }
      const { nome, ordem } = criarEtapaAreaSchema.parse(request.body)

      const area = await prisma.areaObra.findUnique({
        where: { id: areaId },
        include: { obra: true },
      })

      if (!area) {
        throw new NotFoundError('Area nao localizada')
      }

      if (!area.ativa || !area.obra.ativa) {
        throw new BusinessRuleError('Nao e possivel cadastrar etapas em uma area ou obra inativa')
      }

      const existente = await prisma.etapaArea.findFirst({
        where: {
          areaId,
          nome: {
            equals: nome,
            mode: 'insensitive',
          },
        },
      })

      if (existente) {
        throw new ConflictError('Ja existe uma etapa com este nome nesta area')
      }

      const novaEtapa = await prisma.etapaArea.create({
        data: {
          areaId,
          nome,
          ordem,
          status: StatusEtapa.EM_ANDAMENTO,
        },
      })

      return reply.status(201).send(novaEtapa)
    }
  )

  // Atualizar dados de uma etapa (nome e ordem - exclusivo ADMIN e ENGENHARIA)
  app.patch(
    '/etapas/:id',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA])],
      schema: {
        tags: ['Etapas da Area'],
        summary: 'Atualizar dados de uma etapa (exclusivo ADMIN ou ENGENHARIA)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const dados = atualizarEtapaAreaSchema.parse(request.body)

      const etapa = await prisma.etapaArea.findUnique({
        where: { id },
      })

      if (!etapa) {
        throw new NotFoundError('Etapa nao localizada')
      }

      if (dados.nome && dados.nome.toLowerCase() !== etapa.nome.toLowerCase()) {
        const nomeConflito = await prisma.etapaArea.findFirst({
          where: {
            areaId: etapa.areaId,
            nome: {
              equals: dados.nome,
              mode: 'insensitive',
            },
            id: { not: id },
          },
        })

        if (nomeConflito) {
          throw new ConflictError('Ja existe uma etapa com este nome nesta area')
        }
      }

      const etapaAtualizada = await prisma.etapaArea.update({
        where: { id },
        data: dados,
      })

      return reply.status(200).send(etapaAtualizada)
    }
  )

  // Alterar status de uma etapa (EM_ANDAMENTO ou ENCERRADA - exclusivo ADMIN e ENGENHARIA)
  app.patch(
    '/etapas/:id/status',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA])],
      schema: {
        tags: ['Etapas da Area'],
        summary: 'Alterar status da etapa para EM_ANDAMENTO ou ENCERRADA (exclusivo ADMIN ou ENGENHARIA)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { status } = alterarStatusEtapaSchema.parse(request.body)

      const etapa = await prisma.etapaArea.findUnique({
        where: { id },
      })

      if (!etapa) {
        throw new NotFoundError('Etapa nao localizada')
      }

      const etapaAtualizada = await prisma.etapaArea.update({
        where: { id },
        data: {
          status,
          encerradaEm: status === StatusEtapa.ENCERRADA ? new Date() : null,
        },
      })

      return reply.status(200).send(etapaAtualizada)
    }
  )

  // Excluir etapa (exclusivo ADMIN e ENGENHARIA)
  app.delete(
    '/etapas/:id',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA])],
      schema: {
        tags: ['Etapas da Area'],
        summary: 'Excluir etapa caso nao possua requisicoes vinculadas (exclusivo ADMIN ou ENGENHARIA)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const etapa = await prisma.etapaArea.findUnique({
        where: { id },
      })

      if (!etapa) {
        throw new NotFoundError('Etapa nao localizada')
      }

      const totalRequisicoes = await prisma.requisicao.count({
        where: { etapaId: id },
      })

      if (totalRequisicoes > 0) {
        throw new BusinessRuleError(
          'Nao e possivel excluir uma etapa com requisicoes vinculadas. Em vez disso, altere seu status para ENCERRADA.'
        )
      }

      await prisma.etapaArea.delete({
        where: { id },
      })

      return reply.status(204).send()
    }
  )
}
