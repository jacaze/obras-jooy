import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'

describe('Modulo de Areas da Obra (Rotas e Regras de Negocio)', () => {
  let app: FastifyInstance
  let adminToken: string
  let engenhariaToken: string
  let almoxarifeToken: string
  let adminOpToken: string

  const adminId = '00000000-0000-0000-0000-000000000001'
  const engenhariaId = '00000000-0000-0000-0000-000000000002'
  const almoxarifeId = '00000000-0000-0000-0000-000000000003'
  const adminOpId = '00000000-0000-0000-0000-000000000004'

  const obraId = '00000000-0000-0000-0000-000000000010'

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    adminToken = app.jwt.sign({
      sub: adminId,
      login: 'admin',
      nome: 'Administrador',
      perfil: PerfilUsuario.ADMIN,
    })

    engenhariaToken = app.jwt.sign({
      sub: engenhariaId,
      login: 'eng.carlos',
      nome: 'Carlos Engenheiro',
      perfil: PerfilUsuario.ENGENHARIA,
    })

    almoxarifeToken = app.jwt.sign({
      sub: almoxarifeId,
      login: 'joao.almox',
      nome: 'Joao Almoxarife',
      perfil: PerfilUsuario.ALMOXARIFE,
    })

    adminOpToken = app.jwt.sign({
      sub: adminOpId,
      login: 'admin.op',
      nome: 'Adm Operacoes',
      perfil: PerfilUsuario.ADMINISTRACAO,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/obras/:obraId/areas', () => {
    it('deve listar areas da obra ordenadas por ordem e nome', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        nome: 'Residencial Jooy Reserva',
      } as any)

      vi.spyOn(prisma.areaObra, 'findMany').mockResolvedValueOnce([
        { id: 'area-1', obraId, nome: 'Subsolo 01', ordem: -1, ativa: true },
        { id: 'area-2', obraId, nome: 'Terreo', ordem: 0, ativa: true },
        { id: 'area-3', obraId, nome: '1o Pavimento', ordem: 1, ativa: true },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: `/api/obras/${obraId}/areas`,
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(3)
      expect(body[0].nome).toBe('Subsolo 01')
      expect(body[0].ordem).toBe(-1)
    })

    it('deve retornar 404 se a obra nao for encontrada', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce(null)

      const response = await app.inject({
        method: 'GET',
        url: '/api/obras/obra-inexistente/areas',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('POST /api/obras/:obraId/areas', () => {
    it('deve permitir que ENGENHARIA crie nova area/pavimento', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: engenhariaId,
        perfil: PerfilUsuario.ENGENHARIA,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        ativa: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findFirst').mockResolvedValueOnce(null)
      vi.spyOn(prisma.areaObra, 'create').mockResolvedValueOnce({
        id: 'area-nova',
        obraId,
        nome: '4o Pavimento',
        ordem: 4,
        ativa: true,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: `/api/obras/${obraId}/areas`,
        headers: {
          authorization: `Bearer ${engenhariaToken}`,
        },
        payload: {
          nome: '4o Pavimento',
          ordem: 4,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.nome).toBe('4o Pavimento')
      expect(body.ordem).toBe(4)
    })

    it('deve permitir que ADMIN crie nova area', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: adminId,
        perfil: PerfilUsuario.ADMIN,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        ativa: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findFirst').mockResolvedValueOnce(null)
      vi.spyOn(prisma.areaObra, 'create').mockResolvedValueOnce({
        id: 'area-nova-admin',
        obraId,
        nome: 'Casa de Maquinas',
        ordem: 25,
        ativa: true,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: `/api/obras/${obraId}/areas`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          nome: 'Casa de Maquinas',
          ordem: 25,
        },
      })

      expect(response.statusCode).toBe(201)
    })

    it('deve proibir que ALMOXARIFE ou ADMINISTRACAO criem areas na obra (403)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        perfil: PerfilUsuario.ALMOXARIFE,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: `/api/obras/${obraId}/areas`,
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          nome: 'Area Bloqueada',
          ordem: 1,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve rejeitar criacao de area se a obra estiver inativa (422 BusinessRuleError)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: engenhariaId,
        perfil: PerfilUsuario.ENGENHARIA,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        ativa: false,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: `/api/obras/${obraId}/areas`,
        headers: {
          authorization: `Bearer ${engenhariaToken}`,
        },
        payload: {
          nome: 'Area Impossivel',
          ordem: 1,
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toBe('Nao e possivel cadastrar areas em uma obra inativa')
    })

    it('deve rejeitar nome de area duplicado na mesma obra (409 Conflict)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: engenhariaId,
        perfil: PerfilUsuario.ENGENHARIA,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        ativa: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findFirst').mockResolvedValueOnce({
        id: 'area-existente',
        obraId,
        nome: 'Terreo',
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: `/api/obras/${obraId}/areas`,
        headers: {
          authorization: `Bearer ${engenhariaToken}`,
        },
        payload: {
          nome: 'Terreo',
          ordem: 0,
        },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.erro).toBe('Ja existe uma area com este nome nesta obra')
    })
  })

  describe('PATCH /api/areas/:id', () => {
    it('deve atualizar nome e ordem de uma area existente', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: engenhariaId,
        perfil: PerfilUsuario.ENGENHARIA,
        ativo: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
        id: 'area-1',
        obraId,
        nome: 'Nome Antigo',
        ordem: 1,
        ativa: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findFirst').mockResolvedValueOnce(null)

      vi.spyOn(prisma.areaObra, 'update').mockResolvedValueOnce({
        id: 'area-1',
        obraId,
        nome: '1o Pavimento Torre A',
        ordem: 1,
        ativa: true,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/areas/area-1',
        headers: {
          authorization: `Bearer ${engenhariaToken}`,
        },
        payload: {
          nome: '1o Pavimento Torre A',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.nome).toBe('1o Pavimento Torre A')
    })
  })

  describe('PATCH /api/areas/:id/situacao', () => {
    it('deve ativar ou desativar uma area', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: engenhariaId,
        perfil: PerfilUsuario.ENGENHARIA,
        ativo: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
        id: 'area-1',
        ativa: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'update').mockResolvedValueOnce({
        id: 'area-1',
        ativa: false,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/areas/area-1/situacao',
        headers: {
          authorization: `Bearer ${engenhariaToken}`,
        },
        payload: {
          ativa: false,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.ativa).toBe(false)
    })
  })
})
