import type { FastifyInstance } from 'fastify'
import { PerfilUsuario, StatusRequisicao } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate } from '../../shared/middlewares/auth.js'
import {
  criarRequisicaoSchema,
  filtrosRequisicaoSchema,
} from './requisicao.schemas.js'
import {
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/AppError.js'

export async function requisicaoRoutes(app: FastifyInstance) {
  // ----------------------------------------------------
  // LISTAGEM DE REQUISICOES
  // ----------------------------------------------------
  app.get(
    '/requisicoes',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Requisicoes'],
        summary: 'Listar requisicoes de obra (Encarregado visualiza somente suas proprias)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const filtros = filtrosRequisicaoSchema.parse(request.query)
      const ehEncarregado = request.user.perfil === PerfilUsuario.ENCARREGADO

      const where: any = {}

      // Isolamento de dados: Encarregado so enxerga as suas proprias requisicoes
      if (ehEncarregado) {
        where.requisitanteId = request.user.sub
      } else if (filtros.requisitanteId) {
        where.requisitanteId = filtros.requisitanteId
      }

      if (filtros.status) {
        where.status = filtros.status
      }

      if (filtros.areaId) {
        where.areaId = filtros.areaId
      }

      if (filtros.obraId) {
        where.area = {
          obraId: filtros.obraId,
        }
      }

      const requisicoes = await prisma.requisicao.findMany({
        where,
        orderBy: { solicitadaEm: 'desc' },
        include: {
          area: {
            select: {
              id: true,
              nome: true,
              ordem: true,
              obra: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                },
              },
            },
          },
          requisitante: {
            select: {
              id: true,
              nome: true,
              login: true,
              cargo: {
                select: {
                  nome: true,
                },
              },
            },
          },
          itens: {
            include: {
              material: {
                select: {
                  id: true,
                  codigo: true,
                  descricao: true,
                  unidadeConsumo: {
                    select: {
                      sigla: true,
                      descricao: true,
                    },
                  },
                },
              },
              ferramenta: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                  status: true,
                },
              },
            },
          },
        },
      })

      return reply.status(200).send(requisicoes)
    }
  )

  // ----------------------------------------------------
  // CRIACAO DE REQUISICAO (ENCARREGADO, ALMOXARIFE, ADMIN, ENGENHARIA)
  // ----------------------------------------------------
  app.post(
    '/requisicoes',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Requisicoes'],
        summary: 'Criar nova requisicao de obra com protecao de idempotencia',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = criarRequisicaoSchema.parse(request.body)
      const requisitanteId = request.user.sub

      // Idempotencia: se enviou chave e ela ja foi registrada, devolve a requisicao existente
      if (dados.chaveIdempotencia) {
        const existente = await prisma.requisicao.findUnique({
          where: { chaveIdempotencia: dados.chaveIdempotencia },
          include: {
            area: {
              select: {
                id: true,
                nome: true,
                obra: { select: { id: true, codigo: true, nome: true } },
              },
            },
            requisitante: {
              select: {
                id: true,
                nome: true,
                cargo: { select: { nome: true } },
              },
            },
            itens: {
              include: {
                material: {
                  select: {
                    id: true,
                    codigo: true,
                    descricao: true,
                    unidadeConsumo: true,
                  },
                },
                ferramenta: true,
              },
            },
          },
        })

        if (existente) {
          return reply.status(200).send(existente)
        }
      }

      // Valida existencia e atividade da area da obra
      const area = await prisma.areaObra.findUnique({
        where: { id: dados.areaId },
        include: { obra: true },
      })

      if (!area || !area.ativa || !area.obra.ativa) {
        throw new BusinessRuleError('Area informada nao existe ou esta inativa na obra')
      }

      // Valida itens solicitados (materiais e ferramentas)
      for (const item of dados.itens) {
        if (item.materialId) {
          const mat = await prisma.material.findUnique({
            where: { id: item.materialId },
          })
          if (!mat || !mat.ativo) {
            throw new BusinessRuleError(`Material informado (${item.materialId}) nao existe ou esta inativo`)
          }
        }

        if (item.ferramentaId) {
          const fer = await prisma.ferramenta.findUnique({
            where: { id: item.ferramentaId },
          })
          if (!fer || !fer.ativo) {
            throw new BusinessRuleError(`Ferramenta informada (${item.ferramentaId}) nao existe ou esta inativa`)
          }
        }
      }

      // Cria a requisicao com seus itens de forma atomica
      const novaRequisicao = await prisma.requisicao.create({
        data: {
          areaId: dados.areaId,
          requisitanteId,
          chaveIdempotencia: dados.chaveIdempotencia || null,
          observacao: dados.observacao ? dados.observacao.trim() : null,
          status: StatusRequisicao.SOLICITADA,
          itens: {
            create: dados.itens.map((it) => ({
              materialId: it.materialId || null,
              ferramentaId: it.ferramentaId || null,
              quantidade: it.quantidade,
            })),
          },
        },
        include: {
          area: {
            select: {
              id: true,
              nome: true,
              ordem: true,
              obra: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                },
              },
            },
          },
          requisitante: {
            select: {
              id: true,
              nome: true,
              login: true,
              cargo: {
                select: {
                  nome: true,
                },
              },
            },
          },
          itens: {
            include: {
              material: {
                select: {
                  id: true,
                  codigo: true,
                  descricao: true,
                  unidadeConsumo: {
                    select: {
                      sigla: true,
                      descricao: true,
                    },
                  },
                },
              },
              ferramenta: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                  status: true,
                },
              },
            },
          },
        },
      })

      return reply.status(201).send(novaRequisicao)
    }
  )

  // ----------------------------------------------------
  // CONSULTA DE REQUISICAO POR ID
  // ----------------------------------------------------
  app.get(
    '/requisicoes/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Requisicoes'],
        summary: 'Obter detalhes de uma requisicao de obra',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const ehEncarregado = request.user.perfil === PerfilUsuario.ENCARREGADO

      const requisicao = await prisma.requisicao.findUnique({
        where: { id },
        include: {
          area: {
            select: {
              id: true,
              nome: true,
              ordem: true,
              obra: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                },
              },
            },
          },
          requisitante: {
            select: {
              id: true,
              nome: true,
              login: true,
              cargo: {
                select: {
                  nome: true,
                },
              },
            },
          },
          itens: {
            include: {
              material: {
                select: {
                  id: true,
                  codigo: true,
                  descricao: true,
                  unidadeConsumo: {
                    select: {
                      sigla: true,
                      descricao: true,
                    },
                  },
                },
              },
              ferramenta: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                  status: true,
                },
              },
            },
          },
        },
      })

      if (!requisicao) {
        throw new NotFoundError('Requisicao nao localizada')
      }

      // Encarregado so pode acessar as proprias requisicoes
      if (ehEncarregado && requisicao.requisitanteId !== request.user.sub) {
        throw new ForbiddenError('Acesso negado: voce so pode visualizar suas proprias requisicoes')
      }

      return reply.status(200).send(requisicao)
    }
  )

  // ----------------------------------------------------
  // CANCELAMENTO DE REQUISICAO
  // ----------------------------------------------------
  app.patch(
    '/requisicoes/:id/cancelar',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Requisicoes'],
        summary: 'Cancelar requisicao de obra',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const usuarioLogado = request.user

      const requisicao = await prisma.requisicao.findUnique({
        where: { id },
      })

      if (!requisicao) {
        throw new NotFoundError('Requisicao nao localizada')
      }

      if (requisicao.status === StatusRequisicao.CANCELADA) {
        throw new BusinessRuleError('Esta requisicao ja esta cancelada')
      }

      if (requisicao.status === StatusRequisicao.ATENDIDA) {
        throw new BusinessRuleError('Nao e possivel cancelar uma requisicao que ja foi atendida e entregue')
      }

      // Regra para Encarregado: so pode cancelar se for o proprio requisitante e o status for SOLICITADA
      if (usuarioLogado.perfil === PerfilUsuario.ENCARREGADO) {
        if (requisicao.requisitanteId !== usuarioLogado.sub) {
          throw new ForbiddenError('Apenas o autor pode cancelar sua requisicao')
        }
        if (requisicao.status !== StatusRequisicao.SOLICITADA) {
          throw new BusinessRuleError(
            'A requisicao ja esta em separacao pelo almoxarifado e nao pode mais ser cancelada diretamente pelo aplicativo'
          )
        }
      }

      const requisicaoCancelada = await prisma.requisicao.update({
        where: { id },
        data: { status: StatusRequisicao.CANCELADA },
        select: {
          id: true,
          numeroSequencial: true,
          status: true,
        },
      })

      return reply.status(200).send(requisicaoCancelada)
    }
  )
}
