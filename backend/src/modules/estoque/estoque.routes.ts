import type { FastifyInstance } from 'fastify'
import { PerfilUsuario, TipoMovimentacao } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarSituacaoLocalSchema,
  criarLocalEstoqueSchema,
  filtrosLocalEstoqueSchema,
  filtrosMovimentacaoSchema,
  filtrosSaldoEstoqueSchema,
  idLocalParamSchema,
  registrarMovimentacaoSchema,
} from './estoque.schemas.js'
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js'

const PERFIS_LEITURA_ESTOQUE = [
  PerfilUsuario.ADMIN,
  PerfilUsuario.ALMOXARIFE,
  PerfilUsuario.ENGENHARIA,
  PerfilUsuario.ADMINISTRACAO,
]

const PERFIS_GESTAO_LOCAL = [
  PerfilUsuario.ADMIN,
  PerfilUsuario.ALMOXARIFE,
  PerfilUsuario.ENGENHARIA,
]

const PERFIS_MOVIMENTACAO = [
  PerfilUsuario.ADMIN,
  PerfilUsuario.ALMOXARIFE,
]

const TIPOS_ENTRADA: TipoMovimentacao[] = [
  TipoMovimentacao.ENTRADA_RECEB,
  TipoMovimentacao.ENTRADA_DEVOL,
  TipoMovimentacao.ENTRADA_TRANSF,
  TipoMovimentacao.AJUSTE_INV,
]

export function ehMovimentacaoEntrada(tipo: TipoMovimentacao): boolean {
  return TIPOS_ENTRADA.includes(tipo)
}

export async function estoqueRoutes(app: FastifyInstance) {
  // ----------------------------------------------------
  // 1. LOCAIS DE ESTOQUE (ALMOXARIFADOS POR OBRA)
  // ----------------------------------------------------
  app.get(
    '/locais-estoque',
    {
      preHandler: [authenticate, requireRole(PERFIS_LEITURA_ESTOQUE)],
      schema: {
        tags: ['Estoque'],
        summary: 'Listar locais de estoque (almoxarifados) das obras',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const filtros = filtrosLocalEstoqueSchema.parse(request.query)
      const where: any = {}

      if (filtros.obraId) {
        where.obraId = filtros.obraId
      }
      if (filtros.somenteAtivos !== undefined) {
        where.ativo = filtros.somenteAtivos
      }

      const locais = await prisma.localEstoque.findMany({
        where,
        orderBy: [{ obra: { nome: 'asc' } }, { nome: 'asc' }],
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
          _count: {
            select: {
              saldos: true,
              movimentacoes: true,
            },
          },
        },
      })

      return reply.status(200).send(locais)
    }
  )

  app.post(
    '/locais-estoque',
    {
      preHandler: [authenticate, requireRole(PERFIS_GESTAO_LOCAL)],
      schema: {
        tags: ['Estoque'],
        summary: 'Cadastrar novo local de estoque vinculado a uma obra',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = criarLocalEstoqueSchema.parse(request.body)

      const obra = await prisma.obra.findUnique({
        where: { id: dados.obraId },
      })

      if (!obra || !obra.ativa) {
        throw new BusinessRuleError('A obra informada nao existe ou esta inativa')
      }

      const duplicado = await prisma.localEstoque.findFirst({
        where: {
          obraId: dados.obraId,
          nome: {
            equals: dados.nome,
            mode: 'insensitive',
          },
        },
      })

      if (duplicado) {
        throw new ConflictError('Ja existe um local de estoque com este nome nesta obra')
      }

      const novoLocal = await prisma.localEstoque.create({
        data: {
          obraId: dados.obraId,
          nome: dados.nome,
          ativo: true,
        },
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
        },
      })

      return reply.status(201).send(novoLocal)
    }
  )

  app.patch(
    '/locais-estoque/:id/situacao',
    {
      preHandler: [authenticate, requireRole(PERFIS_GESTAO_LOCAL)],
      schema: {
        tags: ['Estoque'],
        summary: 'Ativar ou desativar local de estoque',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = idLocalParamSchema.parse(request.params)
      const { ativo } = atualizarSituacaoLocalSchema.parse(request.body)

      const local = await prisma.localEstoque.findUnique({
        where: { id },
        include: {
          saldos: true,
        },
      })

      if (!local) {
        throw new NotFoundError('Local de estoque nao localizado')
      }

      // Guarda-corpo: impede desativar local que possua saldo fisico ou reservado positivo
      if (!ativo) {
        const possuiSaldoPositivo = local.saldos.some(
          (s) => Number(s.quantidade) > 0 || Number(s.reservado) > 0
        )
        if (possuiSaldoPositivo) {
          throw new ConflictError(
            'Nao e possivel desativar um local de estoque que ainda possui saldo fisico ou reservado de materiais'
          )
        }
      }

      const localAtualizado = await prisma.localEstoque.update({
        where: { id },
        data: { ativo },
        include: {
          obra: {
            select: {
              id: true,
              codigo: true,
              nome: true,
            },
          },
        },
      })

      return reply.status(200).send(localAtualizado)
    }
  )

  // ----------------------------------------------------
  // 2. CONSULTA DE SALDOS DE ESTOQUE
  // ----------------------------------------------------
  app.get(
    '/estoque/saldos',
    {
      preHandler: [authenticate, requireRole(PERFIS_LEITURA_ESTOQUE)],
      schema: {
        tags: ['Estoque'],
        summary: 'Consultar saldos fisicos, reservados e disponiveis no estoque',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const filtros = filtrosSaldoEstoqueSchema.parse(request.query)
      const where: any = {}

      if (filtros.localId) {
        where.localId = filtros.localId
      } else if (filtros.obraId) {
        where.local = { obraId: filtros.obraId }
      }

      if (filtros.categoriaId || filtros.busca) {
        where.material = {}
        if (filtros.categoriaId) {
          where.material.categoriaId = filtros.categoriaId
        }
        if (filtros.busca) {
          where.material.OR = [
            { codigo: { contains: filtros.busca, mode: 'insensitive' } },
            { descricao: { contains: filtros.busca, mode: 'insensitive' } },
          ]
        }
      }

      const saldos = await prisma.estoqueSaldo.findMany({
        where,
        orderBy: [{ material: { descricao: 'asc' } }],
        include: {
          local: {
            select: {
              id: true,
              nome: true,
              ativo: true,
              obra: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                },
              },
            },
          },
          material: {
            include: {
              categoria: true,
              unidadeConsumo: true,
              unidadeCompra: true,
            },
          },
        },
      })

      const resultado = saldos.map((s) => {
        const qtd = Number(s.quantidade)
        const res = Number(s.reservado)
        const disp = Number((qtd - res).toFixed(4))
        return {
          ...s,
          quantidade: qtd,
          reservado: res,
          disponivel: disp,
        }
      })

      return reply.status(200).send(resultado)
    }
  )

  // ----------------------------------------------------
  // 3. LIVRO-RAZAO (KARDEX) E MOVIMENTACAO ATOMICA
  // ----------------------------------------------------
  app.get(
    '/estoque/movimentacoes',
    {
      preHandler: [authenticate, requireRole(PERFIS_LEITURA_ESTOQUE)],
      schema: {
        tags: ['Estoque'],
        summary: 'Consultar historico imutavel do Livro-Razao (Kardex)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const filtros = filtrosMovimentacaoSchema.parse(request.query)
      const where: any = {}

      if (filtros.localId) {
        where.localId = filtros.localId
      } else if (filtros.obraId) {
        where.local = { obraId: filtros.obraId }
      }

      if (filtros.materialId) {
        where.materialId = filtros.materialId
      }

      if (filtros.tipo) {
        where.tipo = filtros.tipo
      }

      const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where,
        take: filtros.limite,
        orderBy: { registradaEm: 'desc' },
        include: {
          local: {
            select: {
              id: true,
              nome: true,
              obra: {
                select: {
                  id: true,
                  codigo: true,
                  nome: true,
                },
              },
            },
          },
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
          area: {
            select: {
              id: true,
              nome: true,
            },
          },
          usuario: {
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
        },
      })

      return reply.status(200).send(
        movimentacoes.map((m) => ({
          ...m,
          quantidade: Number(m.quantidade),
          natureza: ehMovimentacaoEntrada(m.tipo) ? 'ENTRADA' : 'SAIDA',
        }))
      )
    }
  )

  app.post(
    '/estoque/movimentacoes',
    {
      preHandler: [authenticate, requireRole(PERFIS_MOVIMENTACAO)],
      schema: {
        tags: ['Estoque'],
        summary: 'Registrar movimentacao no Livro-Razao e atualizar saldo atomicamente',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = registrarMovimentacaoSchema.parse(request.body)
      const usuarioId = request.user.sub

      // 1. Idempotencia: se a chave ja foi processada, devolve o registro existente
      if (dados.chaveIdempotencia) {
        const movExistente = await prisma.movimentacaoEstoque.findUnique({
          where: { chaveIdempotencia: dados.chaveIdempotencia },
          include: {
            local: { include: { obra: true } },
            material: { include: { unidadeConsumo: true } },
            usuario: { select: { id: true, nome: true } },
          },
        })

        if (movExistente) {
          const saldoAtual = await prisma.estoqueSaldo.findUnique({
            where: {
              localId_materialId: {
                localId: movExistente.localId,
                materialId: movExistente.materialId,
              },
            },
          })

          return reply.status(200).send({
            movimentacao: {
              ...movExistente,
              quantidade: Number(movExistente.quantidade),
              natureza: ehMovimentacaoEntrada(movExistente.tipo) ? 'ENTRADA' : 'SAIDA',
            },
            saldo: saldoAtual
              ? {
                  ...saldoAtual,
                  quantidade: Number(saldoAtual.quantidade),
                  reservado: Number(saldoAtual.reservado),
                  disponivel: Number(
                    (Number(saldoAtual.quantidade) - Number(saldoAtual.reservado)).toFixed(4)
                  ),
                }
              : null,
          })
        }
      }

      // 2. Valida Local de Estoque e Obra
      const local = await prisma.localEstoque.findUnique({
        where: { id: dados.localId },
        include: { obra: true },
      })

      if (!local || !local.ativo || !local.obra.ativa) {
        throw new BusinessRuleError('Local de estoque informado nao existe ou esta inativo')
      }

      // 3. Valida Material
      const material = await prisma.material.findUnique({
        where: { id: dados.materialId },
        include: { unidadeConsumo: true, unidadeCompra: true },
      })

      if (!material || !material.ativo) {
        throw new BusinessRuleError('Material informado nao existe ou esta inativo')
      }

      // 4. Valida Area de Aplicacao (se informada, deve pertencer a mesma obra do local de estoque)
      if (dados.areaId) {
        const area = await prisma.areaObra.findUnique({
          where: { id: dados.areaId },
        })

        if (!area || !area.ativa) {
          throw new BusinessRuleError('Area da obra informada nao existe ou esta inativa')
        }

        if (area.obraId !== local.obraId) {
          throw new BusinessRuleError(
            'A area de aplicacao informada pertence a uma obra diferente do local de estoque'
          )
        }
      }

      // 5. Calcula quantidade convertida e direcao (Entrada vs Saida)
      const ehEntrada = ehMovimentacaoEntrada(dados.tipo)

      if (dados.usarUnidadeCompra && !ehEntrada) {
        throw new BusinessRuleError(
          'A conversao por unidade de compra so pode ser utilizada em operacoes de entrada'
        )
      }

      const fator = dados.usarUnidadeCompra ? Number(material.fatorConversao) : 1
      const quantidadeConvertida = Number((dados.quantidade * fator).toFixed(4))
      const delta = ehEntrada ? quantidadeConvertida : -quantidadeConvertida

      // 6. Transacao Atomica com Controle de Concorrencia Otimista (Optimistic Locking)
      const resultado = await prisma.$transaction(async (tx) => {
        const saldoExistente = await tx.estoqueSaldo.findUnique({
          where: {
            localId_materialId: {
              localId: dados.localId,
              materialId: dados.materialId,
            },
          },
        })

        const qtdAtual = saldoExistente ? Number(saldoExistente.quantidade) : 0
        const resAtual = saldoExistente ? Number(saldoExistente.reservado) : 0
        const disponivelAtual = Number((qtdAtual - resAtual).toFixed(4))

        // Se for saida, impede que o saldo disponivel fique negativo
        if (!ehEntrada && disponivelAtual + delta < 0) {
          throw new BusinessRuleError(
            `Saldo disponivel insuficiente no almoxarifado (disponivel: ${disponivelAtual} ${material.unidadeConsumo.sigla}, solicitado: ${quantidadeConvertida} ${material.unidadeConsumo.sigla})`
          )
        }

        let saldoAtualizado

        if (saldoExistente) {
          const updateCount = await tx.estoqueSaldo.updateMany({
            where: {
              localId: dados.localId,
              materialId: dados.materialId,
              versao: saldoExistente.versao,
            },
            data: {
              quantidade: { increment: delta },
              versao: { increment: 1 },
            },
          })

          if (updateCount.count === 0) {
            throw new ConflictError(
              'Conflito de concorrencia detectado ao atualizar o saldo de estoque. Tente novamente.'
            )
          }

          saldoAtualizado = await tx.estoqueSaldo.findUniqueOrThrow({
            where: {
              localId_materialId: {
                localId: dados.localId,
                materialId: dados.materialId,
              },
            },
          })
        } else {
          saldoAtualizado = await tx.estoqueSaldo.create({
            data: {
              localId: dados.localId,
              materialId: dados.materialId,
              quantidade: delta,
              reservado: 0,
              versao: 1,
            },
          })
        }

        const novaMovimentacao = await tx.movimentacaoEstoque.create({
          data: {
            localId: dados.localId,
            materialId: dados.materialId,
            tipo: dados.tipo,
            quantidade: quantidadeConvertida,
            areaId: dados.areaId || null,
            requisicaoId: dados.requisicaoId || null,
            usuarioId,
            chaveIdempotencia: dados.chaveIdempotencia || null,
            observacao: dados.observacao || null,
          },
          include: {
            local: {
              select: {
                id: true,
                nome: true,
                obra: { select: { id: true, codigo: true, nome: true } },
              },
            },
            material: {
              select: {
                id: true,
                codigo: true,
                descricao: true,
                unidadeConsumo: { select: { sigla: true, descricao: true } },
              },
            },
            area: { select: { id: true, nome: true } },
            usuario: { select: { id: true, nome: true, login: true } },
          },
        })

        return {
          movimentacao: {
            ...novaMovimentacao,
            quantidade: Number(novaMovimentacao.quantidade),
            natureza: ehEntrada ? 'ENTRADA' : 'SAIDA',
          },
          saldo: {
            ...saldoAtualizado,
            quantidade: Number(saldoAtualizado.quantidade),
            reservado: Number(saldoAtualizado.reservado),
            disponivel: Number(
              (Number(saldoAtualizado.quantidade) - Number(saldoAtualizado.reservado)).toFixed(4)
            ),
          },
        }
      })

      return reply.status(201).send(resultado)
    }
  )
}
