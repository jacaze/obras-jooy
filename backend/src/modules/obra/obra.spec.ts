import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'

describe('Modulo de Obras (Rotas e Regras de Negocio)', () => {
  let app: FastifyInstance
  let adminToken: string
  let adminOpToken: string
  let engenhariaToken: string
  let almoxarifeToken: string

  const adminId = '00000000-0000-0000-0000-000000000001'
  const adminOpId = '00000000-0000-0000-0000-000000000002'
  const engenhariaId = '00000000-0000-0000-0000-000000000003'
  const almoxarifeId = '00000000-0000-0000-0000-000000000004'

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    adminToken = app.jwt.sign({
      sub: adminId,
      login: 'admin',
      nome: 'Administrador',
      perfil: PerfilUsuario.ADMIN,
    })

    adminOpToken = app.jwt.sign({
      sub: adminOpId,
      login: 'admin.op',
      nome: 'Adm Operacoes',
      perfil: PerfilUsuario.ADMINISTRACAO,
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
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/obras', () => {
    it('deve rejeitar listagem sem token de autenticacao (401)', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/obras',
      })

      expect(response.statusCode).toBe(401)
    })

    it('deve listar obras cadastradas para qualquer usuario autenticado', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findMany').mockResolvedValueOnce([
        {
          id: 'obra-1',
          codigo: 'JOOY-01',
          nome: 'Residencial Jooy Reserva',
          cidade: 'Campo Grande',
          ativa: true,
          criadaEm: new Date(),
          _count: { areas: 8 },
        },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/obras',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body[0].codigo).toBe('JOOY-01')
      expect(body[0]._count.areas).toBe(8)
    })
  })

  describe('GET /api/obras/:id', () => {
    it('deve retornar detalhes da obra e suas areas vinculadas', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: 'obra-1',
        codigo: 'JOOY-01',
        nome: 'Residencial Jooy Reserva',
        cidade: 'Campo Grande',
        ativa: true,
        criadaEm: new Date(),
        areas: [
          { id: 'area-1', nome: 'Subsolo 01', ordem: -1, ativa: true },
          { id: 'area-2', nome: 'Terreo', ordem: 0, ativa: true },
        ],
      } as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/obras/obra-1',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.codigo).toBe('JOOY-01')
      expect(body.areas.length).toBe(2)
    })

    it('deve retornar 404 quando a obra nao for encontrada', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce(null)

      const response = await app.inject({
        method: 'GET',
        url: '/api/obras/obra-inexistente',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('POST /api/obras', () => {
    it('deve permitir que ADMIN cadastre nova obra convertendo codigo para maiusculo', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: adminId,
        perfil: PerfilUsuario.ADMIN,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findFirst').mockResolvedValueOnce(null)
      vi.spyOn(prisma.obra, 'create').mockResolvedValueOnce({
        id: 'obra-nova',
        codigo: 'JOOY-02',
        nome: 'Residencial Jooy Horizonte',
        cidade: 'Dourados',
        ativa: true,
        criadaEm: new Date(),
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/obras',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          codigo: 'jooy-02',
          nome: 'Residencial Jooy Horizonte',
          cidade: 'Dourados',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.codigo).toBe('JOOY-02')
    })

    it('deve permitir que ADMINISTRACAO cadastre nova obra', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: adminOpId,
        perfil: PerfilUsuario.ADMINISTRACAO,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findFirst').mockResolvedValueOnce(null)
      vi.spyOn(prisma.obra, 'create').mockResolvedValueOnce({
        id: 'obra-nova',
        codigo: 'JOOY-03',
        nome: 'Residencial Jooy Prime',
        cidade: 'Campo Grande',
        ativa: true,
        criadaEm: new Date(),
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/obras',
        headers: {
          authorization: `Bearer ${adminOpToken}`,
        },
        payload: {
          codigo: 'JOOY-03',
          nome: 'Residencial Jooy Prime',
          cidade: 'Campo Grande',
        },
      })

      expect(response.statusCode).toBe(201)
    })

    it('deve proibir que perfis nao autorizados (ALMOXARIFE / ENGENHARIA) cadastrem obras (403)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        perfil: PerfilUsuario.ALMOXARIFE,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/obras',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          codigo: 'JOOY-99',
          nome: 'Obra Invalida',
          cidade: 'Campo Grande',
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve retornar 409 quando o codigo da obra ja existir', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: adminId,
        perfil: PerfilUsuario.ADMIN,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findFirst').mockResolvedValueOnce({
        id: 'obra-existente',
        codigo: 'JOOY-01',
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/obras',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          codigo: 'JOOY-01',
          nome: 'Outro Nome',
          cidade: 'Campo Grande',
        },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.erro).toBe('Codigo de obra ja cadastrado')
    })
  })

  describe('PATCH /api/obras/:id', () => {
    it('deve atualizar nome e cidade da obra preservando imutabilidade do codigo', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: adminId,
        perfil: PerfilUsuario.ADMIN,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: 'obra-1',
        codigo: 'JOOY-01',
        nome: 'Nome Antigo',
        cidade: 'Campo Grande',
        ativa: true,
      } as any)

      vi.spyOn(prisma.obra, 'update').mockResolvedValueOnce({
        id: 'obra-1',
        codigo: 'JOOY-01',
        nome: 'Residencial Jooy Reserva Atualizado',
        cidade: 'Campo Grande',
        ativa: true,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/obras/obra-1',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          nome: 'Residencial Jooy Reserva Atualizado',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.nome).toBe('Residencial Jooy Reserva Atualizado')
    })
  })

  describe('PATCH /api/obras/:id/situacao', () => {
    it('deve ativar ou desativar uma obra', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: adminId,
        perfil: PerfilUsuario.ADMIN,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: 'obra-1',
        ativa: true,
      } as any)

      vi.spyOn(prisma.obra, 'update').mockResolvedValueOnce({
        id: 'obra-1',
        ativa: false,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/obras/obra-1/situacao',
        headers: {
          authorization: `Bearer ${adminToken}`,
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
