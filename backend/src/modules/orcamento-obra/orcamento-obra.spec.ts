import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PerfilUsuario, StatusRequisicao } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'

describe('Modulo de Orcamento e Limites de Material por Obra (T13)', () => {
  let app: FastifyInstance
  let engenhariaToken: string
  let administracaoToken: string
  let almoxarifeToken: string
  let encarregadoToken: string

  const engenhariaId = '00000000-0000-0000-0000-000000000001'
  const administracaoId = '00000000-0000-0000-0000-000000000002'
  const almoxarifeId = '00000000-0000-0000-0000-000000000003'
  const encarregadoId = '00000000-0000-0000-0000-000000000004'

  const obraId = '00000000-0000-0000-0000-000000000010'
  const materialLuvaId = '00000000-0000-0000-0000-000000000020'
  const materialCimentoId = '00000000-0000-0000-0000-000000000021'
  const orcamentoId = '00000000-0000-0000-0000-000000000030'

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    engenhariaToken = app.jwt.sign({
      sub: engenhariaId,
      login: 'carlos.eng',
      nome: 'Carlos Engenheiro',
      perfil: PerfilUsuario.ENGENHARIA,
    })

    administracaoToken = app.jwt.sign({
      sub: administracaoId,
      login: 'ana.adm',
      nome: 'Ana Administracao',
      perfil: PerfilUsuario.ADMINISTRACAO,
    })

    almoxarifeToken = app.jwt.sign({
      sub: almoxarifeId,
      login: 'maria.almox',
      nome: 'Maria Almoxarife',
      perfil: PerfilUsuario.ALMOXARIFE,
    })

    encarregadoToken = app.jwt.sign({
      sub: encarregadoId,
      login: 'joao.enc',
      nome: 'Joao Encarregado',
      perfil: PerfilUsuario.ENCARREGADO,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Controle de Acesso (RBAC)', () => {
    it('deve bloquear acesso de ENCARREGADO ao painel de orcamento da obra (403 Forbidden)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: encarregadoId,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/orcamentos-obra',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve bloquear acesso de ALMOXARIFE ao gerenciamento de orcamento da obra (403 Forbidden)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/orcamentos-obra',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          obraId,
          materialId: materialLuvaId,
          quantidadeOrcada: 200,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve permitir que qualquer usuario autenticado consulte os limites leves (/api/orcamentos-obra/limites) para exibicao na requisicao (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.orcamentoObraMaterial, 'findMany').mockResolvedValueOnce([
        {
          id: orcamentoId,
          obraId,
          materialId: materialLuvaId,
          quantidadeOrcada: 200,
        },
      ] as any)

      vi.spyOn(prisma.requisicaoItem, 'findMany').mockResolvedValueOnce([
        {
          materialId: materialLuvaId,
          quantidade: 60,
          quantidadeEntregue: 60,
          requisicao: {
            id: 'req-antiga',
            status: StatusRequisicao.ATENDIDA,
            area: { obraId },
          },
        },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: `/api/orcamentos-obra/limites?obraId=${obraId}`,
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveLength(1)
      expect(body[0].quantidadeOrcada).toBe(200)
      expect(body[0].quantidadeConsumida).toBe(60)
      expect(body[0].saldoOrcamento).toBe(140)
    })
  })

  describe('Painel de Controle e Calculo de Estouro de Orcamento (GET /api/orcamentos-obra)', () => {
    it('deve calcular corretamente quantidade consumida, percentual e destacar itens que ultrapassaram o limite (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: engenhariaId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.orcamentoObraMaterial, 'findMany').mockResolvedValueOnce([
        {
          id: 'orc-1',
          obraId,
          materialId: materialLuvaId,
          quantidadeOrcada: 100, // Limite = 100
          observacao: 'Meta EPI anual',
          obra: { id: obraId, codigo: 'JOOY-01', nome: 'Residencial Jooy' },
          material: {
            id: materialLuvaId,
            codigo: 'MAT-004',
            descricao: 'Luva de Vaqueta Mista',
            categoria: { id: 'cat-1', nome: 'EPI' },
            unidadeConsumo: { sigla: 'PAR', descricao: 'Par' },
          },
        },
        {
          id: 'orc-2',
          obraId,
          materialId: materialCimentoId,
          quantidadeOrcada: 500, // Limite = 500
          observacao: null,
          obra: { id: obraId, codigo: 'JOOY-01', nome: 'Residencial Jooy' },
          material: {
            id: materialCimentoId,
            codigo: 'MAT-001',
            descricao: 'Cimento CP-II 50kg',
            categoria: { id: 'cat-2', nome: 'Basicos' },
            unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
          },
        },
      ] as any)

      // Simula consumo:
      // - Luva: 90 entregues + 30 pendentes = 120 consumidos (ultrapassou o limite de 100 em +20!)
      // - Cimento: 200 entregues = 200 consumidos (40% do limite de 500 -> DENTRO_DO_LIMITE)
      vi.spyOn(prisma.requisicaoItem, 'findMany').mockResolvedValueOnce([
        {
          materialId: materialLuvaId,
          quantidade: 90,
          quantidadeEntregue: 90,
          requisicao: {
            id: 'req-1',
            status: StatusRequisicao.ATENDIDA,
            area: { obraId },
          },
        },
        {
          materialId: materialLuvaId,
          quantidade: 30,
          quantidadeEntregue: null,
          requisicao: {
            id: 'req-2',
            status: StatusRequisicao.SOLICITADA,
            area: { obraId },
          },
        },
        {
          materialId: materialCimentoId,
          quantidade: 200,
          quantidadeEntregue: 200,
          requisicao: {
            id: 'req-3',
            status: StatusRequisicao.ATENDIDA,
            area: { obraId },
          },
        },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: `/api/orcamentos-obra?obraId=${obraId}`,
        headers: {
          authorization: `Bearer ${engenhariaToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)

      expect(body.resumo).toEqual({
        totalItensOrcados: 2,
        totalUltrapassados: 1,
        totalEmAtencao: 0,
        totalDentroDoLimite: 1,
      })

      // O primeiro item deve ser o que ultrapassou o orcamento (Luva)
      expect(body.itens[0].material.codigo).toBe('MAT-004')
      expect(body.itens[0].quantidadeOrcada).toBe(100)
      expect(body.itens[0].quantidadeEntregue).toBe(90)
      expect(body.itens[0].quantidadePendente).toBe(30)
      expect(body.itens[0].quantidadeConsumida).toBe(120)
      expect(body.itens[0].excedente).toBe(20)
      expect(body.itens[0].percentualConsumido).toBe(120)
      expect(body.itens[0].statusOrcamento).toBe('ULTRAPASSADO')

      // O segundo item deve estar dentro do limite (Cimento)
      expect(body.itens[1].material.codigo).toBe('MAT-001')
      expect(body.itens[1].quantidadeConsumida).toBe(200)
      expect(body.itens[1].percentualConsumido).toBe(40)
      expect(body.itens[1].statusOrcamento).toBe('DENTRO_DO_LIMITE')
    })
  })

  describe('Cadastro, Edicao e Exclusao de Limites (POST, PATCH, DELETE /api/orcamentos-obra)', () => {
    it('deve permitir que ADMINISTRACAO cadastre novo limite orcamentario na obra (201)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: administracaoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        ativa: true,
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialLuvaId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.orcamentoObraMaterial, 'findUnique').mockResolvedValueOnce(null)

      vi.spyOn(prisma.orcamentoObraMaterial, 'create').mockResolvedValueOnce({
        id: orcamentoId,
        obraId,
        materialId: materialLuvaId,
        quantidadeOrcada: 200,
        observacao: 'Teto previsto na planilha',
        obra: { id: obraId, codigo: 'JOOY-01', nome: 'Residencial Jooy' },
        material: {
          id: materialLuvaId,
          codigo: 'MAT-004',
          descricao: 'Luva de Vaqueta Mista',
          unidadeConsumo: { sigla: 'PAR' },
        },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/orcamentos-obra',
        headers: {
          authorization: `Bearer ${administracaoToken}`,
        },
        payload: {
          obraId,
          materialId: materialLuvaId,
          quantidadeOrcada: 200,
          observacao: 'Teto previsto na planilha',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(orcamentoId)
      expect(body.quantidadeOrcada).toBe(200)
    })

    it('deve impedir duplicidade de orcamento para o mesmo material na mesma obra (409 Conflict)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: engenhariaId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        ativa: true,
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialLuvaId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.orcamentoObraMaterial, 'findUnique').mockResolvedValueOnce({
        id: orcamentoId,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/orcamentos-obra',
        headers: {
          authorization: `Bearer ${engenhariaToken}`,
        },
        payload: {
          obraId,
          materialId: materialLuvaId,
          quantidadeOrcada: 300,
        },
      })

      expect(response.statusCode).toBe(409)
    })

    it('deve permitir atualizar a quantidade orcada de um item existente (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: engenhariaId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.orcamentoObraMaterial, 'findUnique').mockResolvedValueOnce({
        id: orcamentoId,
      } as any)

      vi.spyOn(prisma.orcamentoObraMaterial, 'update').mockResolvedValueOnce({
        id: orcamentoId,
        obraId,
        materialId: materialLuvaId,
        quantidadeOrcada: 250,
        observacao: 'Revisao de escopo',
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/orcamentos-obra/${orcamentoId}`,
        headers: {
          authorization: `Bearer ${engenhariaToken}`,
        },
        payload: {
          quantidadeOrcada: 250,
          observacao: 'Revisao de escopo',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.quantidadeOrcada).toBe(250)
    })
  })
})
