import type { FastifyInstance } from 'fastify'
import { PerfilUsuario, StatusRequisicao } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarOrcamentoObraSchema,
  criarOrcamentoObraSchema,
  filtrosLimitesObraSchema,
  filtrosOrcamentoObraSchema,
  idOrcamentoParamSchema,
} from './orcamento-obra.schemas.js'
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js'

const PERFIS_GESTAO_ORCAMENTO = [
  PerfilUsuario.ADMIN,
  PerfilUsuario.ENGENHARIA,
  PerfilUsuario.ADMINISTRACAO,
]

export type StatusOrcamentoItem = 'DENTRO_DO_LIMITE' | 'ATENCAO' | 'ULTRAPASSADO'

export async function orcamentoObraRoutes(app: FastifyInstance) {
  // ----------------------------------------------------
  // 1. CONSULTA LEVE DE LIMITES POR OBRA (QUALQUER USUARIO AUTENTICADO, PARA EXIBIR NO SELETOR DE REQUISICAO)
  // ----------------------------------------------------
  app.get(
    '/orcamentos-obra/limites',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Orcamento de Obra'],
        summary: 'Consultar limites orcados de materiais de uma obra para exibicao no seletor de requisicoes',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const filtros = filtrosLimitesObraSchema.parse(request.query)
      const where: any = {}

      if (filtros.obraId) {
        where.obraId = filtros.obraId
      }

      const limites = await prisma.orcamentoObraMaterial.findMany({
        where,
        select: {
          id: true,
          obraId: true,
          materialId: true,
          quantidadeOrcada: true,
        },
      })

      const obraIds = Array.from(new Set(limites.map((l) => l.obraId)))
      const materialIds = Array.from(new Set(limites.map((l) => l.materialId)))

      const consumoMap = new Map<string, number>()

      if (obraIds.length > 0 && materialIds.length > 0) {
        const itensRequisitados = await prisma.requisicaoItem.findMany({
          where: {
            materialId: { in: materialIds },
            requisicao: {
              status: { not: StatusRequisicao.CANCELADA },
              area: {
                obraId: { in: obraIds },
              },
            },
          },
          select: {
            materialId: true,
            quantidade: true,
            quantidadeEntregue: true,
            requisicao: {
              select: {
                status: true,
                area: {
                  select: {
                    obraId: true,
                  },
                },
              },
            },
          },
        })

        for (const it of itensRequisitados) {
          if (!it.materialId) continue
          const chave = `${it.requisicao.area.obraId}:${it.materialId}`
          const atual = consumoMap.get(chave) || 0
          const valor =
            it.requisicao.status === StatusRequisicao.ATENDIDA &&
            it.quantidadeEntregue !== null &&
            it.quantidadeEntregue !== undefined
              ? Number(it.quantidadeEntregue)
              : Number(it.quantidade)
          consumoMap.set(chave, Number((atual + valor).toFixed(4)))
        }
      }

      return reply.status(200).send(
        limites.map((l) => {
          const quantidadeOrcada = Number(l.quantidadeOrcada)
          const quantidadeConsumida =
            consumoMap.get(`${l.obraId}:${l.materialId}`) || 0
          const saldoOrcamento = Number(
            (quantidadeOrcada - quantidadeConsumida).toFixed(4)
          )

          return {
            ...l,
            quantidadeOrcada,
            quantidadeConsumida,
            saldoOrcamento,
          }
        })
      )
    }
  )

  // ----------------------------------------------------
  // 2. PAINEL DE CONTROLE DE ORCAMENTO E CONSUMO DA OBRA (EXCLUSIVO ENGENHARIA, ADMINISTRACAO E ADMIN)
  // ----------------------------------------------------
  app.get(
    '/orcamentos-obra',
    {
      preHandler: [authenticate, requireRole(PERFIS_GESTAO_ORCAMENTO)],
      schema: {
        tags: ['Orcamento de Obra'],
        summary: 'Listar orcamento previsto vs consumido por obra com indicadores de estouro (Engenharia / Administracao)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const filtros = filtrosOrcamentoObraSchema.parse(request.query)
      const where: any = {}

      if (filtros.obraId) {
        where.obraId = filtros.obraId
      }

      if (filtros.busca) {
        where.material = {
          OR: [
            { codigo: { contains: filtros.busca, mode: 'insensitive' } },
            { descricao: { contains: filtros.busca, mode: 'insensitive' } },
          ],
        }
      }

      const orcamentos = await prisma.orcamentoObraMaterial.findMany({
        where,
        include: {
          obra: {
            select: {
              id: true,
              codigo: true,
              nome: true,
              cidade: true,
              ativa: true,
            },
          },
          material: {
            include: {
              categoria: true,
              unidadeConsumo: true,
            },
          },
        },
      })

      const obraIds = Array.from(new Set(orcamentos.map((o) => o.obraId)))
      const materialIds = Array.from(new Set(orcamentos.map((o) => o.materialId)))

      const consumoMap = new Map<
        string,
        { entregue: number; pendente: number; qtdRequisicoes: number }
      >()

      if (obraIds.length > 0 && materialIds.length > 0) {
        const itensRequisitados = await prisma.requisicaoItem.findMany({
          where: {
            materialId: { in: materialIds },
            requisicao: {
              status: { not: StatusRequisicao.CANCELADA },
              area: {
                obraId: { in: obraIds },
              },
            },
          },
          select: {
            materialId: true,
            quantidade: true,
            quantidadeEntregue: true,
            requisicao: {
              select: {
                id: true,
                status: true,
                area: {
                  select: {
                    obraId: true,
                  },
                },
              },
            },
          },
        })

        for (const it of itensRequisitados) {
          if (!it.materialId) continue
          const chave = `${it.requisicao.area.obraId}:${it.materialId}`
          const atual = consumoMap.get(chave) || {
            entregue: 0,
            pendente: 0,
            qtdRequisicoes: 0,
          }

          if (it.requisicao.status === StatusRequisicao.ATENDIDA) {
            const val =
              it.quantidadeEntregue !== null && it.quantidadeEntregue !== undefined
                ? Number(it.quantidadeEntregue)
                : Number(it.quantidade)
            atual.entregue = Number((atual.entregue + val).toFixed(4))
          } else {
            atual.pendente = Number((atual.pendente + Number(it.quantidade)).toFixed(4))
          }

          atual.qtdRequisicoes += 1
          consumoMap.set(chave, atual)
        }
      }

      const todosItens = orcamentos.map((orc) => {
        const chave = `${orc.obraId}:${orc.materialId}`
        const consumo = consumoMap.get(chave) || {
          entregue: 0,
          pendente: 0,
          qtdRequisicoes: 0,
        }

        const quantidadeOrcada = Number(orc.quantidadeOrcada)
        const quantidadeEntregue = consumo.entregue
        const quantidadePendente = consumo.pendente
        const quantidadeConsumida = Number(
          (quantidadeEntregue + quantidadePendente).toFixed(4)
        )
        const saldoOrcamento = Number(
          (quantidadeOrcada - quantidadeConsumida).toFixed(4)
        )
        const excedente = Number(
          Math.max(0, quantidadeConsumida - quantidadeOrcada).toFixed(4)
        )
        const percentualConsumido =
          quantidadeOrcada > 0
            ? Number(((quantidadeConsumida / quantidadeOrcada) * 100).toFixed(1))
            : 0

        let statusOrcamento: StatusOrcamentoItem = 'DENTRO_DO_LIMITE'
        if (quantidadeConsumida > quantidadeOrcada) {
          statusOrcamento = 'ULTRAPASSADO'
        } else if (percentualConsumido >= 80) {
          statusOrcamento = 'ATENCAO'
        }

        return {
          id: orc.id,
          obraId: orc.obraId,
          materialId: orc.materialId,
          quantidadeOrcada,
          quantidadeEntregue,
          quantidadePendente,
          quantidadeConsumida,
          saldoOrcamento,
          excedente,
          percentualConsumido,
          statusOrcamento,
          qtdRequisicoes: consumo.qtdRequisicoes,
          observacao: orc.observacao,
          criadoEm: orc.criadoEm,
          atualizadoEm: orc.atualizadoEm,
          obra: orc.obra,
          material: orc.material,
        }
      })

      // Ordena colocando os que ultrapassaram o orcamento no topo, seguido pelo maior percentual consumido
      todosItens.sort((a, b) => {
        const pesoStatus = (s: StatusOrcamentoItem) =>
          s === 'ULTRAPASSADO' ? 3 : s === 'ATENCAO' ? 2 : 1
        const diffStatus = pesoStatus(b.statusOrcamento) - pesoStatus(a.statusOrcamento)
        if (diffStatus !== 0) return diffStatus
        return b.percentualConsumido - a.percentualConsumido
      })

      const resumo = {
        totalItensOrcados: todosItens.length,
        totalUltrapassados: todosItens.filter((i) => i.statusOrcamento === 'ULTRAPASSADO')
          .length,
        totalEmAtencao: todosItens.filter((i) => i.statusOrcamento === 'ATENCAO').length,
        totalDentroDoLimite: todosItens.filter(
          (i) => i.statusOrcamento === 'DENTRO_DO_LIMITE'
        ).length,
      }

      const itensFiltrados =
        filtros.status && filtros.status !== 'TODOS'
          ? todosItens.filter((i) => i.statusOrcamento === filtros.status)
          : todosItens

      return reply.status(200).send({
        resumo,
        itens: itensFiltrados,
      })
    }
  )

  // ----------------------------------------------------
  // 3. CADASTRAR LIMITE ORCAMENTARIO DE MATERIAL NA OBRA
  // ----------------------------------------------------
  app.post(
    '/orcamentos-obra',
    {
      preHandler: [authenticate, requireRole(PERFIS_GESTAO_ORCAMENTO)],
      schema: {
        tags: ['Orcamento de Obra'],
        summary: 'Definir limite de orcamento para um material em uma obra',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = criarOrcamentoObraSchema.parse(request.body)

      const obra = await prisma.obra.findUnique({
        where: { id: dados.obraId },
      })

      if (!obra || !obra.ativa) {
        throw new BusinessRuleError('A obra informada nao existe ou esta inativa')
      }

      const material = await prisma.material.findUnique({
        where: { id: dados.materialId },
      })

      if (!material || !material.ativo) {
        throw new BusinessRuleError('O material informado nao existe ou esta inativo')
      }

      const duplicado = await prisma.orcamentoObraMaterial.findUnique({
        where: {
          orcamento_obra_material_unico: {
            obraId: dados.obraId,
            materialId: dados.materialId,
          },
        },
      })

      if (duplicado) {
        throw new ConflictError(
          'Este material ja possui um limite de orcamento cadastrado nesta obra. Utilize a opcao de editar.'
        )
      }

      const novoOrcamento = await prisma.orcamentoObraMaterial.create({
        data: {
          obraId: dados.obraId,
          materialId: dados.materialId,
          quantidadeOrcada: dados.quantidadeOrcada,
          observacao: dados.observacao || null,
        },
        include: {
          obra: {
            select: {
              id: true,
              codigo: true,
              nome: true,
            },
          },
          material: {
            include: {
              categoria: true,
              unidadeConsumo: true,
            },
          },
        },
      })

      return reply.status(201).send({
        ...novoOrcamento,
        quantidadeOrcada: Number(novoOrcamento.quantidadeOrcada),
      })
    }
  )

  // ----------------------------------------------------
  // 4. ATUALIZAR LIMITE ORCAMENTARIO DE MATERIAL NA OBRA
  // ----------------------------------------------------
  app.patch(
    '/orcamentos-obra/:id',
    {
      preHandler: [authenticate, requireRole(PERFIS_GESTAO_ORCAMENTO)],
      schema: {
        tags: ['Orcamento de Obra'],
        summary: 'Atualizar quantidade orcada (limite) ou observacao de um item do orcamento da obra',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = idOrcamentoParamSchema.parse(request.params)
      const dados = atualizarOrcamentoObraSchema.parse(request.body)

      const existente = await prisma.orcamentoObraMaterial.findUnique({
        where: { id },
      })

      if (!existente) {
        throw new NotFoundError('Item de orcamento da obra nao localizado')
      }

      const atualizado = await prisma.orcamentoObraMaterial.update({
        where: { id },
        data: {
          quantidadeOrcada: dados.quantidadeOrcada,
          ...(dados.observacao !== undefined ? { observacao: dados.observacao } : {}),
        },
        include: {
          obra: {
            select: {
              id: true,
              codigo: true,
              nome: true,
            },
          },
          material: {
            include: {
              categoria: true,
              unidadeConsumo: true,
            },
          },
        },
      })

      return reply.status(200).send({
        ...atualizado,
        quantidadeOrcada: Number(atualizado.quantidadeOrcada),
      })
    }
  )

  // ----------------------------------------------------
  // 5. EXCLUIR LIMITE ORCAMENTARIO
  // ----------------------------------------------------
  app.delete(
    '/orcamentos-obra/:id',
    {
      preHandler: [authenticate, requireRole(PERFIS_GESTAO_ORCAMENTO)],
      schema: {
        tags: ['Orcamento de Obra'],
        summary: 'Remover item do orcamento da obra',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = idOrcamentoParamSchema.parse(request.params)

      const existente = await prisma.orcamentoObraMaterial.findUnique({
        where: { id },
      })

      if (!existente) {
        throw new NotFoundError('Item de orcamento da obra nao localizado')
      }

      await prisma.orcamentoObraMaterial.delete({
        where: { id },
      })

      return reply.status(204).send()
    }
  )
}
