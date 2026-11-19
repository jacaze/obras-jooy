import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarCategoriaSchema,
  atualizarMaterialSchema,
  atualizarSituacaoMaterialSchema,
  atualizarUnidadeMedidaSchema,
  criarCategoriaSchema,
  criarMaterialSchema,
  criarUnidadeMedidaSchema,
  listarMateriaisQuerySchema,
} from './material.schemas.js'
import {
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js'

export async function materialRoutes(app: FastifyInstance) {
  // ----------------------------------------------------
  // UNIDADES DE MEDIDA
  // ----------------------------------------------------

  // Listar todas as unidades de medida (qualquer usuario autenticado)
  app.get(
    '/unidades-medida',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Materiais'],
        summary: 'Listagem de unidades de medida cadastradas',
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      const unidades = await prisma.unidadeMedida.findMany({
        orderBy: { sigla: 'asc' },
        include: {
          _count: {
            select: {
              materiaisCompra: true,
              materiaisConsumo: true,
            },
          },
        },
      })
      return reply.status(200).send(unidades)
    }
  )

  // Criar unidade de medida (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.post(
    '/unidades-medida',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Cadastro de nova unidade de medida',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = criarUnidadeMedidaSchema.parse(request.body)

      const existente = await prisma.unidadeMedida.findUnique({
        where: { sigla: dados.sigla },
      })
      if (existente) {
        throw new ConflictError(`Unidade com sigla "${dados.sigla}" ja esta cadastrada`)
      }

      const unidade = await prisma.unidadeMedida.create({
        data: dados,
      })

      return reply.status(201).send(unidade)
    }
  )

  // Atualizar unidade de medida (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.patch(
    '/unidades-medida/:id',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Atualizar descricao da unidade de medida',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const dados = atualizarUnidadeMedidaSchema.parse(request.body)

      const existente = await prisma.unidadeMedida.findUnique({ where: { id } })
      if (!existente) {
        throw new NotFoundError('Unidade de medida nao encontrada')
      }

      const atualizada = await prisma.unidadeMedida.update({
        where: { id },
        data: dados,
      })

      return reply.status(200).send(atualizada)
    }
  )

  // Excluir unidade de medida (ADMIN, ENGENHARIA, ALMOXARIFE - se nao houver materiais vinculados)
  app.delete(
    '/unidades-medida/:id',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Excluir unidade de medida se nao houver materiais vinculados',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const existente = await prisma.unidadeMedida.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              materiaisCompra: true,
              materiaisConsumo: true,
            },
          },
        },
      })
      if (!existente) {
        throw new NotFoundError('Unidade de medida nao encontrada')
      }

      const totalMateriais =
        existente._count.materiaisCompra + existente._count.materiaisConsumo

      if (totalMateriais > 0) {
        throw new ConflictError(
          `Nao e possivel excluir a unidade "${existente.sigla}" pois existem ${totalMateriais} material(is) vinculado(s) a ela`
        )
      }

      await prisma.unidadeMedida.delete({ where: { id } })
      return reply.status(204).send()
    }
  )

  // ----------------------------------------------------
  // CATEGORIAS DE MATERIAL
  // ----------------------------------------------------

  // Listar categorias (qualquer usuario autenticado)
  app.get(
    '/categorias-material',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Materiais'],
        summary: 'Listagem de categorias de materiais',
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      const categorias = await prisma.categoriaMaterial.findMany({
        orderBy: { nome: 'asc' },
        include: {
          _count: {
            select: { materiais: true },
          },
        },
      })
      return reply.status(200).send(categorias)
    }
  )

  // Criar categoria (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.post(
    '/categorias-material',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Criar nova categoria de material',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = criarCategoriaSchema.parse(request.body)

      const existente = await prisma.categoriaMaterial.findUnique({
        where: { nome: dados.nome },
      })
      if (existente) {
        throw new ConflictError(`Categoria "${dados.nome}" ja esta cadastrada`)
      }

      const categoria = await prisma.categoriaMaterial.create({
        data: dados,
      })

      return reply.status(201).send(categoria)
    }
  )

  // Atualizar categoria (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.patch(
    '/categorias-material/:id',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Atualizar categoria de material',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const dados = atualizarCategoriaSchema.parse(request.body)

      const existente = await prisma.categoriaMaterial.findUnique({ where: { id } })
      if (!existente) {
        throw new NotFoundError('Categoria de material nao encontrada')
      }

      const duplicada = await prisma.categoriaMaterial.findFirst({
        where: {
          nome: dados.nome,
          id: { not: id },
        },
      })
      if (duplicada) {
        throw new ConflictError(`Ja existe uma categoria com o nome "${dados.nome}"`)
      }

      const atualizada = await prisma.categoriaMaterial.update({
        where: { id },
        data: dados,
      })

      return reply.status(200).send(atualizada)
    }
  )

  // Excluir categoria de material (ADMIN, ENGENHARIA, ALMOXARIFE - se nao houver materiais vinculados)
  app.delete(
    '/categorias-material/:id',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Excluir categoria de material se nao houver materiais vinculados',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const existente = await prisma.categoriaMaterial.findUnique({
        where: { id },
        include: {
          _count: {
            select: { materiais: true },
          },
        },
      })
      if (!existente) {
        throw new NotFoundError('Categoria de material nao encontrada')
      }

      if (existente._count.materiais > 0) {
        throw new ConflictError(
          `Nao e possivel excluir a categoria "${existente.nome}" pois existem ${existente._count.materiais} material(is) vinculado(s) a ela`
        )
      }

      await prisma.categoriaMaterial.delete({ where: { id } })
      return reply.status(204).send()
    }
  )

  // ----------------------------------------------------
  // MATERIAIS
  // ----------------------------------------------------

  // Listar materiais com filtros
  app.get(
    '/materiais',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Materiais'],
        summary: 'Listagem de catalogo de materiais com filtros',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { busca, categoriaId, somenteAtivos } =
        listarMateriaisQuerySchema.parse(request.query)

      const where: any = {}

      if (somenteAtivos === true) {
        where.ativo = true
      }

      if (categoriaId) {
        where.categoriaId = categoriaId
      }

      if (busca) {
        const buscaTermo = busca.trim()
        where.OR = [
          { codigo: { contains: buscaTermo, mode: 'insensitive' } },
          { codigoSienge: { contains: buscaTermo, mode: 'insensitive' } },
          { descricao: { contains: buscaTermo, mode: 'insensitive' } },
        ]
      }

      const materiais = await prisma.material.findMany({
        where,
        include: {
          categoria: true,
          unidadeCompra: true,
          unidadeConsumo: true,
        },
        orderBy: { descricao: 'asc' },
      })

      return reply.status(200).send(materiais)
    }
  )

  // Detalhes de um material por ID
  app.get(
    '/materiais/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Materiais'],
        summary: 'Detalhes de um material especifico',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const material = await prisma.material.findUnique({
        where: { id },
        include: {
          categoria: true,
          unidadeCompra: true,
          unidadeConsumo: true,
        },
      })

      if (!material) {
        throw new NotFoundError('Material nao encontrado')
      }

      return reply.status(200).send(material)
    }
  )

  // Criar material (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.post(
    '/materiais',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Cadastrar novo material no catalogo',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = criarMaterialSchema.parse(request.body)

      const codigoExistente = await prisma.material.findUnique({
        where: { codigo: dados.codigo },
      })
      if (codigoExistente) {
        throw new ConflictError(`Material com codigo "${dados.codigo}" ja existe`)
      }

      const categoria = await prisma.categoriaMaterial.findUnique({
        where: { id: dados.categoriaId },
      })
      if (!categoria) {
        throw new NotFoundError('Categoria informada nao existe')
      }

      const unConsumo = await prisma.unidadeMedida.findUnique({
        where: { id: dados.unidadeConsumoId },
      })
      if (!unConsumo) {
        throw new NotFoundError('Unidade de consumo informada nao existe')
      }

      let unCompraId = dados.unidadeCompraId || null
      let fator = dados.fatorConversao || 1.0

      if (unCompraId) {
        const unCompra = await prisma.unidadeMedida.findUnique({
          where: { id: unCompraId },
        })
        if (!unCompra) {
          throw new NotFoundError('Unidade de compra informada nao existe')
        }
        if (unCompraId === dados.unidadeConsumoId) {
          fator = 1.0
        }
      } else {
        fator = 1.0
      }

      const material = await prisma.material.create({
        data: {
          codigo: dados.codigo,
          codigoSienge: dados.codigoSienge || null,
          descricao: dados.descricao,
          categoriaId: dados.categoriaId,
          unidadeCompraId: unCompraId,
          unidadeConsumoId: dados.unidadeConsumoId,
          fatorConversao: fator,
          ehKit: dados.ehKit,
          exigeTesteQualidade: dados.exigeTesteQualidade,
          ativo: dados.ativo,
        },
        include: {
          categoria: true,
          unidadeCompra: true,
          unidadeConsumo: true,
        },
      })

      return reply.status(201).send(material)
    }
  )

  // Atualizar dados de um material (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.patch(
    '/materiais/:id',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Atualizar material existente',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const dados = atualizarMaterialSchema.parse(request.body)

      const materialExistente = await prisma.material.findUnique({ where: { id } })
      if (!materialExistente) {
        throw new NotFoundError('Material nao encontrado')
      }

      if (dados.categoriaId) {
        const cat = await prisma.categoriaMaterial.findUnique({ where: { id: dados.categoriaId } })
        if (!cat) throw new NotFoundError('Categoria informada nao existe')
      }

      const finalUnConsumoId = dados.unidadeConsumoId ?? materialExistente.unidadeConsumoId
      const finalUnCompraId =
        dados.unidadeCompraId !== undefined ? dados.unidadeCompraId : materialExistente.unidadeCompraId

      if (dados.unidadeConsumoId) {
        const unU = await prisma.unidadeMedida.findUnique({ where: { id: dados.unidadeConsumoId } })
        if (!unU) throw new NotFoundError('Unidade de consumo nao existe')
      }

      if (dados.unidadeCompraId) {
        const unC = await prisma.unidadeMedida.findUnique({ where: { id: dados.unidadeCompraId } })
        if (!unC) throw new NotFoundError('Unidade de compra nao existe')
      }

      let fator =
        dados.fatorConversao !== undefined
          ? dados.fatorConversao
          : Number(materialExistente.fatorConversao)

      if (!finalUnCompraId || finalUnCompraId === finalUnConsumoId) {
        fator = 1.0
      }

      if (dados.codigo && dados.codigo !== materialExistente.codigo) {
        const existenteComCodigo = await prisma.material.findUnique({
          where: { codigo: dados.codigo },
        })
        if (existenteComCodigo) {
          throw new ConflictError(`Material com codigo "${dados.codigo}" ja existe`)
        }
      }

      const atualizado = await prisma.material.update({
        where: { id },
        data: {
          ...(dados.codigo && { codigo: dados.codigo }),
          ...(dados.codigoSienge !== undefined && { codigoSienge: dados.codigoSienge || null }),
          ...(dados.descricao && { descricao: dados.descricao }),
          ...(dados.categoriaId && { categoriaId: dados.categoriaId }),
          ...(dados.unidadeCompraId !== undefined && { unidadeCompraId: dados.unidadeCompraId }),
          ...(dados.unidadeConsumoId && { unidadeConsumoId: dados.unidadeConsumoId }),
          fatorConversao: fator,
          ...(dados.ehKit !== undefined && { ehKit: dados.ehKit }),
          ...(dados.exigeTesteQualidade !== undefined && { exigeTesteQualidade: dados.exigeTesteQualidade }),
          ...(dados.ativo !== undefined && { ativo: dados.ativo }),
        },
        include: {
          categoria: true,
          unidadeCompra: true,
          unidadeConsumo: true,
        },
      })

      return reply.status(200).send(atualizado)
    }
  )

  // Alternar situacao ativo/inativo (ADMIN, ENGENHARIA, ALMOXARIFE)
  app.patch(
    '/materiais/:id/situacao',
    {
      preHandler: [
        authenticate,
        requireRole([PerfilUsuario.ADMIN, PerfilUsuario.ENGENHARIA, PerfilUsuario.ALMOXARIFE]),
      ],
      schema: {
        tags: ['Materiais'],
        summary: 'Ativar ou desativar material',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { ativo } = atualizarSituacaoMaterialSchema.parse(request.body)

      const materialExistente = await prisma.material.findUnique({ where: { id } })
      if (!materialExistente) {
        throw new NotFoundError('Material nao encontrado')
      }

      const atualizado = await prisma.material.update({
        where: { id },
        data: { ativo },
        include: {
          categoria: true,
          unidadeCompra: true,
          unidadeConsumo: true,
        },
      })

      return reply.status(200).send(atualizado)
    }
  )
}
