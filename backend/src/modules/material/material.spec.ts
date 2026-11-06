import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'
import { PerfilUsuario } from '@prisma/client'

describe('Modulo de Catalogo de Materiais, Categorias e Unidades', () => {
  let app: FastifyInstance
  const adminId = '00000000-0000-0000-0000-000000000001'
  const almoxarifeId = '00000000-0000-0000-0000-000000000002'
  const encarregadoId = '00000000-0000-0000-0000-000000000003'

  let adminToken: string
  let almoxarifeToken: string
  let encarregadoToken: string

  const unidadeUnId = '11111111-1111-1111-1111-111111111111'
  const unidadeKgId = '22222222-2222-2222-2222-222222222222'
  const unidadeScId = '33333333-3333-3333-3333-333333333333'
  const categoriaAlvenariaId = '44444444-4444-4444-4444-444444444444'

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    // Setup de tokens de autenticacao para RBAC
    adminToken = app.jwt.sign({
      sub: adminId,
      login: 'admin',
      nome: 'Administrador',
      perfil: PerfilUsuario.ADMIN,
    })

    almoxarifeToken = app.jwt.sign({
      sub: almoxarifeId,
      login: 'almoxarife',
      nome: 'Almoxarife Teste',
      perfil: PerfilUsuario.ALMOXARIFE,
    })

    encarregadoToken = app.jwt.sign({
      sub: encarregadoId,
      login: 'encarregado',
      nome: 'Encarregado Teste',
      perfil: PerfilUsuario.ENCARREGADO,
    })

    // Mock do prisma.usuario.findUnique para o auth middleware
    vi.spyOn(prisma.usuario, 'findUnique').mockImplementation(async (args: any) => {
      const id = args?.where?.id
      if (id === adminId) {
        return { id: adminId, login: 'admin', perfil: PerfilUsuario.ADMIN, ativo: true } as any
      }
      if (id === almoxarifeId) {
        return { id: almoxarifeId, login: 'almoxarife', perfil: PerfilUsuario.ALMOXARIFE, ativo: true } as any
      }
      if (id === encarregadoId) {
        return { id: encarregadoId, login: 'encarregado', perfil: PerfilUsuario.ENCARREGADO, ativo: true } as any
      }
      return null
    })
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    await app.close()
  })

  // ----------------------------------------------------
  // TESTES DE UNIDADE DE MEDIDA
  // ----------------------------------------------------
  describe('Unidades de Medida', () => {
    it('deve listar unidades de medida para usuario autenticado', async () => {
      vi.spyOn(prisma.unidadeMedida, 'findMany').mockResolvedValueOnce([
        { id: unidadeUnId, sigla: 'UN', descricao: 'Unidade', criadaEm: new Date(), _count: { materiaisCompra: 0, materiaisConsumo: 0 } },
        { id: unidadeKgId, sigla: 'KG', descricao: 'Quilograma', criadaEm: new Date(), _count: { materiaisCompra: 0, materiaisConsumo: 0 } },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/unidades-medida',
        headers: { authorization: `Bearer ${encarregadoToken}` },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      expect(data[0].sigla).toBe('UN')
    })

    it('deve permitir almoxarife criar nova unidade de medida', async () => {
      vi.spyOn(prisma.unidadeMedida, 'findUnique').mockResolvedValueOnce(null)
      vi.spyOn(prisma.unidadeMedida, 'create').mockResolvedValueOnce({
        id: 'mock-unidade-id',
        sigla: 'M3',
        descricao: 'Metro Cubico',
        criadaEm: new Date(),
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/unidades-medida',
        headers: { authorization: `Bearer ${almoxarifeToken}` },
        payload: {
          sigla: 'm3',
          descricao: 'Metro Cubico',
        },
      })

      expect(response.statusCode).toBe(201)
      const data = response.json()
      expect(data.sigla).toBe('M3')
      expect(data.descricao).toBe('Metro Cubico')
    })

    it('deve rejeitar criacao de unidade por perfil nao autorizado (ENCARREGADO)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/unidades-medida',
        headers: { authorization: `Bearer ${encarregadoToken}` },
        payload: {
          sigla: 'L',
          descricao: 'Litro',
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve rejeitar unidade com sigla duplicada', async () => {
      vi.spyOn(prisma.unidadeMedida, 'findUnique').mockResolvedValueOnce({
        id: unidadeUnId,
        sigla: 'UN',
        descricao: 'Unidade',
        criadaEm: new Date(),
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/unidades-medida',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          sigla: 'UN',
          descricao: 'Unidade Duplicada',
        },
      })

      expect(response.statusCode).toBe(409)
    })

    it('deve rejeitar exclusao de unidade que possui materiais vinculados', async () => {
      vi.spyOn(prisma.unidadeMedida, 'findUnique').mockResolvedValueOnce({
        id: unidadeUnId,
        sigla: 'UN',
        descricao: 'Unidade',
        _count: { materiaisCompra: 2, materiaisConsumo: 0 },
      } as any)

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/unidades-medida/${unidadeUnId}`,
        headers: { authorization: `Bearer ${almoxarifeToken}` },
      })

      expect(response.statusCode).toBe(409)
      expect(response.json().erro).toContain('vinculado')
    })
  })

  // ----------------------------------------------------
  // TESTES DE CATEGORIAS
  // ----------------------------------------------------
  describe('Categorias de Material', () => {
    it('deve listar categorias para usuario autenticado', async () => {
      vi.spyOn(prisma.categoriaMaterial, 'findMany').mockResolvedValueOnce([
        { id: categoriaAlvenariaId, nome: 'Alvenaria e Cimento', criadaEm: new Date(), _count: { materiais: 5 } },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/categorias-material',
        headers: { authorization: `Bearer ${encarregadoToken}` },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data[0].nome).toBe('Alvenaria e Cimento')
    })

    it('deve permitir almoxarife criar nova categoria', async () => {
      vi.spyOn(prisma.categoriaMaterial, 'findUnique').mockResolvedValueOnce(null)
      vi.spyOn(prisma.categoriaMaterial, 'create').mockResolvedValueOnce({
        id: 'mock-cat-id',
        nome: 'Eletrica',
        criadaEm: new Date(),
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/categorias-material',
        headers: { authorization: `Bearer ${almoxarifeToken}` },
        payload: {
          nome: 'Eletrica',
        },
      })

      expect(response.statusCode).toBe(201)
      const data = response.json()
      expect(data.nome).toBe('Eletrica')
    })

    it('deve rejeitar categoria com nome duplicado', async () => {
      vi.spyOn(prisma.categoriaMaterial, 'findUnique').mockResolvedValueOnce({
        id: 'existing-id',
        nome: 'Eletrica',
        criadaEm: new Date(),
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/categorias-material',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          nome: 'Eletrica',
        },
      })

      expect(response.statusCode).toBe(409)
    })

    it('deve rejeitar exclusao de categoria que possui materiais vinculados', async () => {
      vi.spyOn(prisma.categoriaMaterial, 'findUnique').mockResolvedValueOnce({
        id: categoriaAlvenariaId,
        nome: 'Alvenaria e Cimento',
        _count: { materiais: 3 },
      } as any)

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/categorias-material/${categoriaAlvenariaId}`,
        headers: { authorization: `Bearer ${almoxarifeToken}` },
      })

      expect(response.statusCode).toBe(409)
      expect(response.json().erro).toContain('vinculado')
    })
  })

  // ----------------------------------------------------
  // TESTES DE MATERIAIS
  // ----------------------------------------------------
  describe('Catalogo de Materiais', () => {
    const materialId = '55555555-5555-5555-5555-555555555555'

    it('deve criar material com conversao opcional (SC -> KG, fator 50)', async () => {
      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce(null)
      vi.spyOn(prisma.categoriaMaterial, 'findUnique').mockResolvedValueOnce({ id: categoriaAlvenariaId } as any)
      vi.spyOn(prisma.unidadeMedida, 'findUnique')
        .mockResolvedValueOnce({ id: unidadeKgId, sigla: 'KG' } as any)
        .mockResolvedValueOnce({ id: unidadeScId, sigla: 'SC' } as any)

      vi.spyOn(prisma.material, 'create').mockResolvedValueOnce({
        id: materialId,
        codigo: 'CIM-01',
        descricao: 'Cimento CP-II 50kg',
        categoriaId: categoriaAlvenariaId,
        unidadeCompraId: unidadeScId,
        unidadeConsumoId: unidadeKgId,
        fatorConversao: 50.0 as any,
        ehKit: false,
        exigeTesteQualidade: true,
        ativo: true,
        criadoEm: new Date(),
        categoria: { id: categoriaAlvenariaId, nome: 'Alvenaria e Cimento' },
        unidadeCompra: { id: unidadeScId, sigla: 'SC' },
        unidadeConsumo: { id: unidadeKgId, sigla: 'KG' },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/materiais',
        headers: { authorization: `Bearer ${almoxarifeToken}` },
        payload: {
          codigo: 'CIM-01',
          descricao: 'Cimento CP-II 50kg',
          categoriaId: categoriaAlvenariaId,
          unidadeConsumoId: unidadeKgId,
          unidadeCompraId: unidadeScId,
          fatorConversao: 50.0,
          ehKit: false,
          exigeTesteQualidade: true,
        },
      })

      expect(response.statusCode).toBe(201)
      const data = response.json()
      expect(data.codigo).toBe('CIM-01')
      expect(Number(data.fatorConversao)).toBe(50.0)
      expect(data.exigeTesteQualidade).toBe(true)
      expect(data.unidadeCompra.sigla).toBe('SC')
      expect(data.unidadeConsumo.sigla).toBe('KG')
    })

    it('deve criar material simples sem conversao (apenas unidade de consumo)', async () => {
      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce(null)
      vi.spyOn(prisma.categoriaMaterial, 'findUnique').mockResolvedValueOnce({ id: categoriaAlvenariaId } as any)
      vi.spyOn(prisma.unidadeMedida, 'findUnique').mockResolvedValueOnce({ id: unidadeKgId, sigla: 'KG' } as any)

      vi.spyOn(prisma.material, 'create').mockResolvedValueOnce({
        id: 'mat-simples-id',
        codigo: 'ARE-01',
        descricao: 'Areia Media',
        categoriaId: categoriaAlvenariaId,
        unidadeCompraId: null,
        unidadeConsumoId: unidadeKgId,
        fatorConversao: 1.0 as any,
        ehKit: false,
        exigeTesteQualidade: false,
        ativo: true,
        criadoEm: new Date(),
        categoria: { id: categoriaAlvenariaId, nome: 'Alvenaria' },
        unidadeCompra: null,
        unidadeConsumo: { id: unidadeKgId, sigla: 'KG' },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/materiais',
        headers: { authorization: `Bearer ${almoxarifeToken}` },
        payload: {
          codigo: 'ARE-01',
          descricao: 'Areia Media',
          categoriaId: categoriaAlvenariaId,
          unidadeConsumoId: unidadeKgId,
        },
      })

      expect(response.statusCode).toBe(201)
      const data = response.json()
      expect(data.codigo).toBe('ARE-01')
      expect(Number(data.fatorConversao)).toBe(1.0)
      expect(data.unidadeCompra).toBeNull()
      expect(data.unidadeConsumo.sigla).toBe('KG')
    })

    it('deve forcar fator de conversao 1 se as unidades de compra e consumo forem iguais', async () => {
      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce(null)
      vi.spyOn(prisma.categoriaMaterial, 'findUnique').mockResolvedValueOnce({ id: categoriaAlvenariaId } as any)
      vi.spyOn(prisma.unidadeMedida, 'findUnique')
        .mockResolvedValueOnce({ id: unidadeUnId, sigla: 'UN' } as any)
        .mockResolvedValueOnce({ id: unidadeUnId, sigla: 'UN' } as any)

      const createSpy = vi.spyOn(prisma.material, 'create').mockResolvedValueOnce({
        id: 'bloc-id',
        codigo: 'BLOC-01',
        descricao: 'Bloco Ceramico 9x19x19',
        categoriaId: categoriaAlvenariaId,
        tipoControle: 'CONSUMO',
        unidadeCompraId: unidadeUnId,
        unidadeConsumoId: unidadeUnId,
        fatorConversao: 1.0 as any,
        ehKit: false,
        exigeTesteQualidade: false,
        ativo: true,
        criadoEm: new Date(),
        categoria: { id: categoriaAlvenariaId, nome: 'Alvenaria' },
        unidadeCompra: { id: unidadeUnId, sigla: 'UN' },
        unidadeConsumo: { id: unidadeUnId, sigla: 'UN' },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/materiais',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          codigo: 'BLOC-01',
          descricao: 'Bloco Ceramico 9x19x19',
          categoriaId: categoriaAlvenariaId,
          tipoControle: 'CONSUMO',
          unidadeCompraId: unidadeUnId,
          unidadeConsumoId: unidadeUnId,
          fatorConversao: 25.0, // Deve ser corrigido para 1
        },
      })

      expect(response.statusCode).toBe(201)
      const data = response.json()
      expect(Number(data.fatorConversao)).toBe(1.0)
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fatorConversao: 1.0,
          }),
        })
      )
    })

    it('deve rejeitar material com codigo duplicado', async () => {
      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        codigo: 'CIM-01',
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/materiais',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          codigo: 'CIM-01',
          descricao: 'Outro Cimento',
          categoriaId: categoriaAlvenariaId,
          unidadeCompraId: unidadeUnId,
          unidadeConsumoId: unidadeUnId,
        },
      })

      expect(response.statusCode).toBe(409)
    })

    it('deve listar materiais com busca e filtros', async () => {
      vi.spyOn(prisma.material, 'findMany').mockResolvedValueOnce([
        {
          id: materialId,
          codigo: 'CIM-01',
          descricao: 'Cimento CP-II 50kg',
          categoriaId: categoriaAlvenariaId,
          ativo: true,
          categoria: { id: categoriaAlvenariaId, nome: 'Alvenaria e Cimento' },
          unidadeCompra: { id: unidadeScId, sigla: 'SC' },
          unidadeConsumo: { id: unidadeKgId, sigla: 'KG' },
        },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/materiais?busca=cimento',
        headers: { authorization: `Bearer ${encarregadoToken}` },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(1)
      expect(data[0].codigo).toBe('CIM-01')
    })

    it('deve permitir atualizar descricao e status de um material', async () => {
      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        codigo: 'CIM-01',
        descricao: 'Cimento CP-II 50kg',
        categoriaId: categoriaAlvenariaId,
        unidadeCompraId: unidadeScId,
        unidadeConsumoId: unidadeKgId,
        fatorConversao: 50.0 as any,
        ativo: true,
      } as any)

      vi.spyOn(prisma.material, 'update').mockResolvedValueOnce({
        id: materialId,
        codigo: 'CIM-01',
        descricao: 'Cimento CP-II 50kg Votoran',
        categoriaId: categoriaAlvenariaId,
        unidadeCompraId: unidadeScId,
        unidadeConsumoId: unidadeKgId,
        fatorConversao: 50.0 as any,
        ativo: true,
        categoria: { id: categoriaAlvenariaId, nome: 'Alvenaria' },
        unidadeCompra: { id: unidadeScId, sigla: 'SC' },
        unidadeConsumo: { id: unidadeKgId, sigla: 'KG' },
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/materiais/${materialId}`,
        headers: { authorization: `Bearer ${almoxarifeToken}` },
        payload: {
          descricao: 'Cimento CP-II 50kg Votoran',
        },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(data.descricao).toBe('Cimento CP-II 50kg Votoran')
    })

    it('deve criar material informando codigoSienge opcional', async () => {
      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce(null)
      vi.spyOn(prisma.categoriaMaterial, 'findUnique').mockResolvedValueOnce({ id: categoriaAlvenariaId } as any)
      vi.spyOn(prisma.unidadeMedida, 'findUnique').mockResolvedValueOnce({ id: unidadeUnId, sigla: 'UN' } as any)

      const createSpy = vi.spyOn(prisma.material, 'create').mockResolvedValueOnce({
        id: 'mat-sienge-id',
        codigo: 'MAT-742',
        codigoSienge: 'SIENGE-74201',
        descricao: 'Tinta Acrilica Fosca',
        categoriaId: categoriaAlvenariaId,
        unidadeCompraId: null,
        unidadeConsumoId: unidadeUnId,
        fatorConversao: 1.0 as any,
        ehKit: false,
        exigeTesteQualidade: false,
        ativo: true,
        criadoEm: new Date(),
        categoria: { id: categoriaAlvenariaId, nome: 'Pintura' },
        unidadeCompra: null,
        unidadeConsumo: { id: unidadeUnId, sigla: 'UN' },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/materiais',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          codigo: 'MAT-742',
          codigoSienge: 'SIENGE-74201',
          descricao: 'Tinta Acrilica Fosca',
          categoriaId: categoriaAlvenariaId,
          unidadeConsumoId: unidadeUnId,
        },
      })

      expect(response.statusCode).toBe(201)
      const data = response.json()
      expect(data.codigo).toBe('MAT-742')
      expect(data.codigoSienge).toBe('SIENGE-74201')
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codigo: 'MAT-742',
            codigoSienge: 'SIENGE-74201',
          }),
        })
      )
    })

    it('deve permitir atualizar codigo e codigoSienge de um material existente', async () => {
      vi.spyOn(prisma.material, 'findUnique')
        .mockResolvedValueOnce({
          id: materialId,
          codigo: 'MAT-ANTIGO',
          codigoSienge: null,
          descricao: 'Material Existente',
          categoriaId: categoriaAlvenariaId,
          unidadeConsumoId: unidadeUnId,
          unidadeCompraId: null,
          fatorConversao: 1.0 as any,
          ativo: true,
        } as any)
        .mockResolvedValueOnce(null) // Para verificacao de duplicidade de codigo

      vi.spyOn(prisma.material, 'update').mockResolvedValueOnce({
        id: materialId,
        codigo: 'MAT-NOVO',
        codigoSienge: 'SIENGE-999',
        descricao: 'Material Existente',
        categoriaId: categoriaAlvenariaId,
        unidadeConsumoId: unidadeUnId,
        unidadeCompraId: null,
        fatorConversao: 1.0 as any,
        ativo: true,
        categoria: { id: categoriaAlvenariaId, nome: 'Geral' },
        unidadeCompra: null,
        unidadeConsumo: { id: unidadeUnId, sigla: 'UN' },
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/materiais/${materialId}`,
        headers: { authorization: `Bearer ${almoxarifeToken}` },
        payload: {
          codigo: 'MAT-NOVO',
          codigoSienge: 'SIENGE-999',
        },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json()
      expect(data.codigo).toBe('MAT-NOVO')
      expect(data.codigoSienge).toBe('SIENGE-999')
    })

    it('deve permitir desativar e reativar um material', async () => {
      vi.spyOn(prisma.material, 'findUnique').mockResolvedValue({
        id: materialId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.material, 'update')
        .mockResolvedValueOnce({ id: materialId, ativo: false } as any)
        .mockResolvedValueOnce({ id: materialId, ativo: true } as any)

      const desativar = await app.inject({
        method: 'PATCH',
        url: `/api/materiais/${materialId}/situacao`,
        headers: { authorization: `Bearer ${almoxarifeToken}` },
        payload: { ativo: false },
      })

      expect(desativar.statusCode).toBe(200)
      expect(desativar.json().ativo).toBe(false)

      const reativar = await app.inject({
        method: 'PATCH',
        url: `/api/materiais/${materialId}/situacao`,
        headers: { authorization: `Bearer ${almoxarifeToken}` },
        payload: { ativo: true },
      })

      expect(reativar.statusCode).toBe(200)
      expect(reativar.json().ativo).toBe(true)
    })
  })
})
