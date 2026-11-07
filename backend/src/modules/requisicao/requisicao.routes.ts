import type { FastifyInstance } from 'fastify'
import {
  PerfilUsuario,
  StatusFerramenta,
  StatusRequisicao,
  TipoMovimentacao,
} from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atenderRequisicaoSchema,
  criarRequisicaoSchema,
  exportarAnaliticoEngenhariaSchema,
  exportarSiengeSchema,
  filtrosRequisicaoSchema,
  idRequisicaoParamSchema,
} from './requisicao.schemas.js'
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/AppError.js'

const PERFIS_ATENDIMENTO_E_SIENGE = [
  PerfilUsuario.ADMIN,
  PerfilUsuario.ALMOXARIFE,
]

const PERFIS_ANALITICO_ENGENHARIA = [
  PerfilUsuario.ADMIN,
  PerfilUsuario.ENGENHARIA,
  PerfilUsuario.ADMINISTRACAO,
  PerfilUsuario.ALMOXARIFE,
]

const REQUISICAO_INCLUDE = {
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
  etapa: {
    select: {
      id: true,
      nome: true,
      ordem: true,
      status: true,
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
  atendidoPor: {
    select: {
      id: true,
      nome: true,
      login: true,
    },
  },
  exportadaPor: {
    select: {
      id: true,
      nome: true,
      login: true,
    },
  },
  itens: {
    include: {
      material: {
        select: {
          id: true,
          codigo: true,
          codigoSienge: true,
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
}

function formatarRequisicao(req: any) {
  if (!req) return req
  return {
    ...req,
    itens: Array.isArray(req.itens)
      ? req.itens.map((it: any) => ({
          ...it,
          quantidade: Number(it.quantidade),
          quantidadeEntregue:
            it.quantidadeEntregue !== null && it.quantidadeEntregue !== undefined
              ? Number(it.quantidadeEntregue)
              : null,
        }))
      : [],
  }
}

export function escaparCampoCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  let texto = String(valor).replace(/\r?\n|\r/g, ' ').trim()
  // Protecao contra CSV Formula Injection no Excel / SIENGE
  if (/^[=+\-@]/.test(texto)) {
    texto = `'${texto}`
  }
  if (texto.includes(';') || texto.includes('"')) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

export async function requisicaoRoutes(app: FastifyInstance) {
  // ----------------------------------------------------
  // 1. LISTAGEM DE REQUISICOES
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

      if (filtros.etapaId) {
        where.etapaId = filtros.etapaId
      }

      if (filtros.obraId) {
        where.area = {
          obraId: filtros.obraId,
        }
      }

      if (!ehEncarregado && filtros.exportadaSienge !== undefined) {
        where.exportadaSienge = filtros.exportadaSienge
      }

      const requisicoes = await prisma.requisicao.findMany({
        where,
        orderBy: { solicitadaEm: 'desc' },
        include: REQUISICAO_INCLUDE,
      })

      return reply.status(200).send(requisicoes.map(formatarRequisicao))
    }
  )

  // ----------------------------------------------------
  // 2. CRIACAO DE REQUISICAO COM VALIDACAO DE SALDO EM ESTOQUE
  // ----------------------------------------------------
  app.post(
    '/requisicoes',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Requisicoes'],
        summary: 'Criar nova requisicao de obra validando saldo disponivel e idempotencia',
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
          include: REQUISICAO_INCLUDE,
        })

        if (existente) {
          return reply.status(200).send(formatarRequisicao(existente))
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

      // Valida etapa da obra obrigatoria (F02)
      const etapa = await prisma.etapaArea.findUnique({
        where: { id: dados.etapaId },
      })

      if (!etapa) {
        throw new NotFoundError('Etapa informada nao existe')
      }

      if (etapa.areaId !== dados.areaId) {
        throw new BusinessRuleError('A etapa informada nao pertence a area selecionada')
      }

      if (etapa.status === 'ENCERRADA') {
        throw new BusinessRuleError(
          `A etapa "${etapa.nome}" esta encerrada e nao aceita novos pedidos de material`
        )
      }

      // Consolida quantidades por materialId para impedir que linhas duplicadas burlem o saldo
      const qtdPorMaterial = new Map<string, number>()
      const ferramentasSolicitadas = new Set<string>()

      for (const item of dados.itens) {
        if (item.materialId) {
          const acumulada = qtdPorMaterial.get(item.materialId) || 0
          qtdPorMaterial.set(
            item.materialId,
            Number((acumulada + item.quantidade).toFixed(4))
          )
        }

        if (item.ferramentaId) {
          if (ferramentasSolicitadas.has(item.ferramentaId)) {
            throw new BusinessRuleError(
              'A mesma ferramenta nao pode ser adicionada mais de uma vez na mesma requisicao'
            )
          }
          ferramentasSolicitadas.add(item.ferramentaId)
        }
      }

      // Valida cada material solicitado e seu saldo disponivel no estoque da obra
      for (const [matId, qtdTotalSolicitada] of qtdPorMaterial.entries()) {
        const mat = await prisma.material.findUnique({
          where: { id: matId },
          include: { unidadeConsumo: true },
        })

        if (!mat || !mat.ativo) {
          throw new BusinessRuleError(`Material informado (${matId}) nao existe ou esta inativo`)
        }

        const saldosObra = await prisma.estoqueSaldo.findMany({
          where: {
            materialId: matId,
            local: {
              obraId: area.obraId,
              ativo: true,
            },
          },
        })

        const disponivelObra = Number(
          saldosObra
            .reduce((acc, s) => acc + (Number(s.quantidade) - Number(s.reservado)), 0)
            .toFixed(4)
        )

        if (qtdTotalSolicitada > disponivelObra) {
          const sigla = mat.unidadeConsumo?.sigla || 'UN'
          throw new BusinessRuleError(
            `Saldo insuficiente no estoque da obra para o material "${mat.descricao}" (disponivel: ${disponivelObra} ${sigla}, solicitado: ${qtdTotalSolicitada} ${sigla})`
          )
        }
      }

      // Valida ferramentas solicitadas
      for (const ferId of ferramentasSolicitadas) {
        const fer = await prisma.ferramenta.findUnique({
          where: { id: ferId },
        })
        if (!fer || !fer.ativo) {
          throw new BusinessRuleError(`Ferramenta informada (${ferId}) nao existe ou esta inativa`)
        }
        if (fer.status && fer.status !== StatusFerramenta.DISPONIVEL) {
          throw new BusinessRuleError(
            `A ferramenta "${fer.nome}" nao esta disponivel no almoxarifado (status atual: ${fer.status})`
          )
        }
      }

      // Cria a requisicao com seus itens
      const novaRequisicao = await prisma.requisicao.create({
        data: {
          areaId: dados.areaId,
          etapaId: dados.etapaId || null,
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
        include: REQUISICAO_INCLUDE,
      })

      return reply.status(201).send(formatarRequisicao(novaRequisicao))
    }
  )

  // ----------------------------------------------------
  // 3. EXPORTACAO DE REQUISICOES PARA SIENGE (CSV) — EXCLUSIVO ALMOXARIFE / ADMIN
  // ----------------------------------------------------
  app.post(
    '/requisicoes/exportar-sienge',
    {
      preHandler: [authenticate, requireRole(PERFIS_ATENDIMENTO_E_SIENGE)],
      schema: {
        tags: ['Requisicoes'],
        summary: 'Exportar requisicoes atendidas para CSV padrao SIENGE e marcar flag de exportacao',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = exportarSiengeSchema.parse(request.body || {})
      const usuarioId = request.user.sub

      const where: any = {
        status: StatusRequisicao.ATENDIDA,
      }

      if (dados.requisicaoIds && dados.requisicaoIds.length > 0) {
        where.id = { in: dados.requisicaoIds }
      } else if (!dados.incluirJaExportadas) {
        where.exportadaSienge = false
      }

      if (dados.obraId) {
        where.area = { obraId: dados.obraId }
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const requisicoesParaExportar = await tx.requisicao.findMany({
          where,
          orderBy: { numeroSequencial: 'asc' },
          include: REQUISICAO_INCLUDE,
        })

        if (requisicoesParaExportar.length === 0) {
          throw new BusinessRuleError(
            'Nenhuma requisicao atendida encontrada para exportacao com os filtros selecionados'
          )
        }

        const idsExportados = requisicoesParaExportar.map((r) => r.id)
        const agora = new Date()

        await tx.requisicao.updateMany({
          where: { id: { in: idsExportados } },
          data: {
            exportadaSienge: true,
            exportadaEm: agora,
            exportadaPorId: usuarioId,
          },
        })

        const cabecalho = [
          'NUMERO_REQUISICAO',
          'DATA_SOLICITACAO',
          'DATA_ATENDIMENTO',
          'CODIGO_OBRA',
          'NOME_OBRA',
          'AREA_DESTINO',
          'TIPO_ITEM',
          'CODIGO_ITEM',
          'DESCRICAO_ITEM',
          'UNIDADE',
          'QTD_SOLICITADA',
          'QTD_ENTREGUE',
          'SOLICITANTE',
          'RETIRADO_POR',
          'ATENDIDO_POR',
          'OBSERVACAO',
        ].join(';')

        const linhas: string[] = [cabecalho]

        for (const req of requisicoesParaExportar) {
          const dataSol = req.solicitadaEm ? new Date(req.solicitadaEm).toISOString() : ''
          const dataAtend = req.atendidoEm
            ? new Date(req.atendidoEm).toISOString()
            : req.retiradaEm
              ? new Date(req.retiradaEm).toISOString()
              : agora.toISOString()

          for (const item of req.itens) {
            const ehMaterial = Boolean(item.material)
            const codigoItem = ehMaterial
              ? item.material?.codigo || ''
              : item.ferramenta?.codigo || ''
            const descricaoItem = ehMaterial
              ? item.material?.descricao || ''
              : item.ferramenta?.nome || ''
            const unidade = ehMaterial
              ? item.material?.unidadeConsumo?.sigla || 'UN'
              : 'UN'
            const qtdSol = Number(item.quantidade)
            const qtdEnt =
              item.quantidadeEntregue !== null && item.quantidadeEntregue !== undefined
                ? Number(item.quantidadeEntregue)
                : qtdSol

            const colunas = [
              `REQ-${req.numeroSequencial}`,
              dataSol,
              dataAtend,
              req.area?.obra?.codigo || '',
              req.area?.obra?.nome || '',
              req.area?.nome || '',
              ehMaterial ? 'MATERIAL' : 'FERRAMENTA',
              codigoItem,
              descricaoItem,
              unidade,
              qtdSol,
              qtdEnt,
              req.requisitante?.nome || '',
              req.retiradoPor || '',
              req.atendidoPor?.nome || request.user.nome || '',
              req.observacao || '',
            ].map(escaparCampoCsv)

            linhas.push(colunas.join(';'))
          }
        }

        const dataCurta = agora.toISOString().slice(0, 10)
        return {
          csv: '\uFEFF' + linhas.join('\r\n'),
          nomeArquivo: `sienge-requisicoes-${dataCurta}.csv`,
          totalRequisicoes: requisicoesParaExportar.length,
          requisicaoIds: idsExportados,
          exportadaEm: agora.toISOString(),
        }
      })

      return reply.status(200).send(resultado)
    }
  )

  // ----------------------------------------------------
  // 4. EXPORTACAO ANALITICA PARA ENGENHARIA (CSV) (F04)
  // ----------------------------------------------------
  app.post(
    '/requisicoes/exportar-analitico',
    {
      preHandler: [authenticate, requireRole(PERFIS_ANALITICO_ENGENHARIA)],
      schema: {
        tags: ['Requisicoes'],
        summary: 'Exportar relatorio analitico com filtros por data, etapa, obra e material',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const dados = exportarAnaliticoEngenhariaSchema.parse(request.body || {})
      const usuarioLogado = await prisma.usuario.findUnique({
        where: { id: request.user.sub },
        select: { id: true, perfil: true, obraId: true },
      })

      const where: any = {}

      // Se o usuario tiver obra fixa vinculada, restringe a essa obra
      if (usuarioLogado?.obraId) {
        where.area = { obraId: usuarioLogado.obraId }
      } else if (dados.obraId) {
        where.area = { obraId: dados.obraId }
      }

      // Filtro de Area
      if (dados.areaId) {
        where.areaId = dados.areaId
      }

      // Filtro de Etapa (F02/F04)
      if (dados.etapaId) {
        where.etapaId = dados.etapaId
      }

      // Filtro de Status
      if (dados.status) {
        where.status = dados.status
      }

      // Filtro por Periodo de Solicitacao (dataInicio e dataFim)
      if (dados.dataInicio || dados.dataFim) {
        where.solicitadaEm = {}
        if (dados.dataInicio) {
          const dtInicio = new Date(dados.dataInicio)
          if (!isNaN(dtInicio.getTime())) {
            where.solicitadaEm.gte = dtInicio
          }
        }
        if (dados.dataFim) {
          const dtFim = new Date(dados.dataFim)
          if (!isNaN(dtFim.getTime())) {
            if (dados.dataFim.length <= 10) {
              dtFim.setUTCHours(23, 59, 59, 999)
            }
            where.solicitadaEm.lte = dtFim
          }
        }
      }

      // Filtro por Material especifico
      if (dados.materialId) {
        where.itens = {
          some: {
            materialId: dados.materialId,
          },
        }
      }

      // Filtro por termo de busca geral
      if (dados.busca && dados.busca.trim().length > 0) {
        const termo = dados.busca.trim()
        where.OR = [
          { observacao: { contains: termo, mode: 'insensitive' } },
          { retiradoPor: { contains: termo, mode: 'insensitive' } },
          { requisitante: { nome: { contains: termo, mode: 'insensitive' } } },
          { etapa: { nome: { contains: termo, mode: 'insensitive' } } },
          {
            itens: {
              some: {
                OR: [
                  { material: { descricao: { contains: termo, mode: 'insensitive' } } },
                  { material: { codigo: { contains: termo, mode: 'insensitive' } } },
                  { material: { codigoSienge: { contains: termo, mode: 'insensitive' } } },
                  { ferramenta: { nome: { contains: termo, mode: 'insensitive' } } },
                  { ferramenta: { codigo: { contains: termo, mode: 'insensitive' } } },
                ],
              },
            },
          },
        ]
      }

      const requisicoes = await prisma.requisicao.findMany({
        where,
        orderBy: [{ solicitadaEm: 'desc' }, { numeroSequencial: 'desc' }],
        include: REQUISICAO_INCLUDE,
      })

      if (requisicoes.length === 0) {
        throw new BusinessRuleError(
          'Nenhuma requisicao encontrada para exportacao com os filtros selecionados'
        )
      }

      const cabecalho = [
        'NUMERO_REQUISICAO',
        'STATUS_REQUISICAO',
        'DATA_SOLICITACAO',
        'DATA_ATENDIMENTO',
        'CODIGO_OBRA',
        'NOME_OBRA',
        'AREA_PAVIMENTO',
        'ETAPA_EXECUCAO',
        'STATUS_ETAPA',
        'TIPO_ITEM',
        'CODIGO_JOOY',
        'CODIGO_SIENGE',
        'DESCRICAO_ITEM',
        'UNIDADE_MEDIDA',
        'QTD_SOLICITADA',
        'QTD_ENTREGUE',
        'SOLICITANTE',
        'CARGO_SOLICITANTE',
        'RETIRADO_POR',
        'ATENDIDO_POR',
        'OBSERVACAO',
      ].join(';')

      const linhas: string[] = [cabecalho]
      let totalLinhas = 0
      let totalSolicitado = 0
      let totalEntregue = 0
      const materiaisUnicos = new Set<string>()
      const ferramentasUnicas = new Set<string>()

      for (const req of requisicoes) {
        const dataSol = req.solicitadaEm ? new Date(req.solicitadaEm).toISOString() : ''
        const dataAtend = req.atendidoEm
          ? new Date(req.atendidoEm).toISOString()
          : req.retiradaEm
            ? new Date(req.retiradaEm).toISOString()
            : ''

        for (const item of req.itens) {
          if (dados.materialId && item.materialId !== dados.materialId) {
            continue
          }

          const ehMaterial = Boolean(item.material)
          const codigoJooy = ehMaterial
            ? item.material?.codigo || ''
            : item.ferramenta?.codigo || ''
          const codigoSienge = ehMaterial
            ? item.material?.codigoSienge || ''
            : ''
          const descricaoItem = ehMaterial
            ? item.material?.descricao || ''
            : item.ferramenta?.nome || ''
          const unidade = ehMaterial
            ? item.material?.unidadeConsumo?.sigla || 'UN'
            : 'UN'

          const qtdSol = Number(item.quantidade)
          const qtdEnt =
            item.quantidadeEntregue !== null && item.quantidadeEntregue !== undefined
              ? Number(item.quantidadeEntregue)
              : req.status === StatusRequisicao.ATENDIDA
                ? qtdSol
                : 0

          totalLinhas++
          totalSolicitado += qtdSol
          totalEntregue += qtdEnt
          if (ehMaterial && item.materialId) materiaisUnicos.add(item.materialId)
          if (!ehMaterial && item.ferramentaId) ferramentasUnicas.add(item.ferramentaId)

          const colunas = [
            `REQ-${req.numeroSequencial}`,
            req.status,
            dataSol,
            dataAtend,
            req.area?.obra?.codigo || '',
            req.area?.obra?.nome || '',
            req.area?.nome || '',
            req.etapa?.nome || 'Nao vinculada',
            req.etapa?.status || '',
            ehMaterial ? 'MATERIAL' : 'FERRAMENTA',
            codigoJooy,
            codigoSienge,
            descricaoItem,
            unidade,
            qtdSol,
            qtdEnt,
            req.requisitante?.nome || '',
            req.requisitante?.cargo?.nome || '',
            req.retiradoPor || '',
            req.atendidoPor?.nome || '',
            req.observacao || '',
          ].map(escaparCampoCsv)

          linhas.push(colunas.join(';'))
        }
      }

      const agora = new Date()
      const dataCurta = agora.toISOString().slice(0, 10)

      return reply.status(200).send({
        csv: '\uFEFF' + linhas.join('\r\n'),
        nomeArquivo: `relatorio-analitico-engenharia-${dataCurta}.csv`,
        totalRequisicoes: requisicoes.length,
        totalLinhas,
        exportadoEm: agora.toISOString(),
        resumo: {
          totalSolicitado: Number(totalSolicitado.toFixed(4)),
          totalEntregue: Number(totalEntregue.toFixed(4)),
          totalMateriaisDiferentes: materiaisUnicos.size,
          totalFerramentasDiferentes: ferramentasUnicas.size,
        },
      })
    }
  )

  // ----------------------------------------------------
  // 4. CONSULTA DE REQUISICAO POR ID
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
      const { id } = idRequisicaoParamSchema.parse(request.params)
      const ehEncarregado = request.user.perfil === PerfilUsuario.ENCARREGADO

      const requisicao = await prisma.requisicao.findUnique({
        where: { id },
        include: REQUISICAO_INCLUDE,
      })

      if (!requisicao) {
        throw new NotFoundError('Requisicao nao localizada')
      }

      // Encarregado so pode acessar as proprias requisicoes
      if (ehEncarregado && requisicao.requisitanteId !== request.user.sub) {
        throw new ForbiddenError('Acesso negado: voce so pode visualizar suas proprias requisicoes')
      }

      return reply.status(200).send(formatarRequisicao(requisicao))
    }
  )

  // ----------------------------------------------------
  // 5. ATENDIMENTO E ENTREGA DE REQUISICAO (COM BAIXA ATOMICA NO ESTOQUE E KARDEX)
  // ----------------------------------------------------
  app.patch(
    '/requisicoes/:id/atender',
    {
      preHandler: [authenticate, requireRole(PERFIS_ATENDIMENTO_E_SIENGE)],
      schema: {
        tags: ['Requisicoes'],
        summary: 'Atender requisicao com ajuste de quantidades entregues, responsavel pela retirada e baixa no estoque',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = idRequisicaoParamSchema.parse(request.params)
      const dados = atenderRequisicaoSchema.parse(request.body)
      const almoxarifeId = request.user.sub

      const requisicaoAtendida = await prisma.$transaction(async (tx) => {
        const requisicao = await tx.requisicao.findUnique({
          where: { id },
          include: REQUISICAO_INCLUDE,
        })

        if (!requisicao) {
          throw new NotFoundError('Requisicao nao localizada')
        }

        if (requisicao.status === StatusRequisicao.ATENDIDA) {
          throw new BusinessRuleError('Esta requisicao ja foi atendida anteriormente')
        }

        if (requisicao.status === StatusRequisicao.CANCELADA) {
          throw new BusinessRuleError('Nao e possivel atender uma requisicao cancelada')
        }

        const mapaItensInput = new Map(
          (dados.itens || []).map((i) => [i.itemId, i])
        )

        // Verifica se algum itemId enviado nao pertence a requisicao
        for (const itemIdEnviado of mapaItensInput.keys()) {
          const pertence = requisicao.itens.some((it) => it.id === itemIdEnviado)
          if (!pertence) {
            throw new BusinessRuleError(
              `O item informado (${itemIdEnviado}) nao pertence a esta requisicao`
            )
          }
        }

        // Calcula quantidades entregues e garante que ao menos 1 item tenha quantidade > 0
        const planoItens = requisicao.itens.map((item) => {
          const custom = mapaItensInput.get(item.id)
          const qtdSolicitada = Number(item.quantidade)
          const qtdEntregue =
            custom !== undefined
              ? Number(custom.quantidadeEntregue.toFixed(4))
              : qtdSolicitada

          return {
            item,
            qtdSolicitada,
            qtdEntregue,
            localIdPreferencial: custom?.localId || null,
          }
        })

        const algumEntregue = planoItens.some((p) => p.qtdEntregue > 0)
        if (!algumEntregue) {
          throw new BusinessRuleError(
            'Para atender a requisicao, ao menos um item deve ter quantidade entregue maior que zero. Caso nenhum item seja entregue, cancele a requisicao.'
          )
        }

        const obraId = requisicao.area.obra.id

        // Processa cada item: atualiza quantidadeEntregue, baixa saldo com Optimistic Locking e gera Kardex
        for (const plano of planoItens) {
          const { item, qtdEntregue, localIdPreferencial } = plano

          await tx.requisicaoItem.update({
            where: { id: item.id },
            data: {
              quantidadeEntregue: qtdEntregue,
            },
          })

          if (item.materialId && qtdEntregue > 0) {
            const whereSaldo: any = {
              materialId: item.materialId,
              local: {
                obraId,
                ativo: true,
              },
            }

            if (localIdPreferencial) {
              whereSaldo.localId = localIdPreferencial
            }

            const saldosEncontrados = await tx.estoqueSaldo.findMany({
              where: whereSaldo,
              include: {
                local: true,
              },
            })

            // Prioriza "Almoxarifado Geral" ou locacao com maior saldo disponivel
            const saldosOrdenados = [...saldosEncontrados].sort((a, b) => {
              const aGeral = a.local?.nome?.toLowerCase() === 'almoxarifado geral' ? 1 : 0
              const bGeral = b.local?.nome?.toLowerCase() === 'almoxarifado geral' ? 1 : 0
              if (aGeral !== bGeral) return bGeral - aGeral
              const dispA = Number(a.quantidade) - Number(a.reservado)
              const dispB = Number(b.quantidade) - Number(b.reservado)
              return dispB - dispA
            })

            const disponivelTotal = Number(
              saldosOrdenados
                .reduce((acc, s) => acc + (Number(s.quantidade) - Number(s.reservado)), 0)
                .toFixed(4)
            )

            if (qtdEntregue > disponivelTotal) {
              const sigla = item.material?.unidadeConsumo?.sigla || 'UN'
              const desc = item.material?.descricao || item.materialId
              throw new BusinessRuleError(
                `Saldo disponivel insuficiente no estoque da obra para atender o material "${desc}" (disponivel: ${disponivelTotal} ${sigla}, tentativa de entrega: ${qtdEntregue} ${sigla})`
              )
            }

            let restanteParaBaixar = qtdEntregue

            for (const saldo of saldosOrdenados) {
              if (restanteParaBaixar <= 0) break

              const disponivelNoLocal = Number(
                (Number(saldo.quantidade) - Number(saldo.reservado)).toFixed(4)
              )
              if (disponivelNoLocal <= 0) continue

              const qtdAbater = Number(
                Math.min(restanteParaBaixar, disponivelNoLocal).toFixed(4)
              )

              const updateCount = await tx.estoqueSaldo.updateMany({
                where: {
                  localId: saldo.localId,
                  materialId: item.materialId,
                  versao: saldo.versao,
                },
                data: {
                  quantidade: { increment: -qtdAbater },
                  versao: { increment: 1 },
                },
              })

              if (updateCount.count === 0) {
                throw new ConflictError(
                  'Conflito de concorrencia detectado ao baixar o saldo de estoque. Tente novamente.'
                )
              }

              await tx.movimentacaoEstoque.create({
                data: {
                  localId: saldo.localId,
                  materialId: item.materialId,
                  tipo: TipoMovimentacao.SAIDA_REQ,
                  quantidade: qtdAbater,
                  areaId: requisicao.areaId,
                  requisicaoId: requisicao.id,
                  usuarioId: almoxarifeId,
                  observacao: `Atendimento Req #${requisicao.numeroSequencial} - Retirado por: ${dados.retiradoPor}`,
                },
              })

              restanteParaBaixar = Number((restanteParaBaixar - qtdAbater).toFixed(4))
            }
          }

          if (item.ferramentaId && qtdEntregue > 0) {
            const fer = await tx.ferramenta.findUnique({
              where: { id: item.ferramentaId },
            })

            if (!fer || !fer.ativo || fer.status !== StatusFerramenta.DISPONIVEL) {
              throw new BusinessRuleError(
                `A ferramenta "${fer?.nome || item.ferramentaId}" nao esta disponivel para entrega`
              )
            }

            await tx.ferramenta.update({
              where: { id: item.ferramentaId },
              data: {
                status: StatusFerramenta.EMPRESTADO,
                emprestadoParaId: requisicao.requisitanteId,
              },
            })
          }
        }

        const agora = new Date()

        return tx.requisicao.update({
          where: { id: requisicao.id },
          data: {
            status: StatusRequisicao.ATENDIDA,
            retiradoPor: dados.retiradoPor,
            atendidoPorId: almoxarifeId,
            atendidoEm: agora,
            retiradaEm: agora,
            ...(dados.observacao !== undefined && dados.observacao !== null
              ? { observacao: dados.observacao || requisicao.observacao }
              : {}),
          },
          include: REQUISICAO_INCLUDE,
        })
      })

      return reply.status(200).send(formatarRequisicao(requisicaoAtendida))
    }
  )

  // ----------------------------------------------------
  // 6. CANCELAMENTO DE REQUISICAO
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
      const { id } = idRequisicaoParamSchema.parse(request.params)
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
        throw new BusinessRuleError(
          'Nao e possivel cancelar uma requisicao que ja foi atendida e entregue'
        )
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
