import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'

describe('Modulo de Cargos (Rotas e Regras de Negocio)', () => {
  let app: FastifyInstance
  let adminToken: string
  let almoxarifeToken: string

  const adminUserId = '00000000-0000-0000-0000-000000000001'
  const almoxarifeUserId = '00000000-0000-0000-0000-000000000002'

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    adminToken = app.jwt.sign({
      sub: adminUserId,
      login: 'admin',
      nome: 'Administrador',
      perfil: PerfilUsuario.ADMIN,
    })

    almoxarifeToken = app.jwt.sign({
      sub: almoxarifeUserId,
      login: 'maria',
      nome: 'Maria Almoxarife',
      perfil: PerfilUsuario.ALMOXARIFE,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('deve listar cargos para usuario autenticado', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
      id: almoxarifeUserId,
      ativo: true,
    } as any)

    vi.spyOn(prisma.cargo, 'findMany').mockResolvedValueOnce([
      { id: '1', nome: 'Almoxarife', ativo: true, criadoEm: new Date() },
      { id: '2', nome: 'Encarregado', ativo: true, criadoEm: new Date() },
    ] as any)

    const response = await app.inject({
      method: 'GET',
      url: '/api/cargos',
      headers: {
        authorization: `Bearer ${almoxarifeToken}`,
      },
    })

    expect(response.statusCode).toBe(200)
    const payload = JSON.parse(response.body)
    expect(payload).toHaveLength(2)
    expect(payload[0].nome).toBe('Almoxarife')
  })

  it('deve permitir que ADMIN crie um novo cargo com sucesso (201)', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
      id: adminUserId,
      ativo: true,
    } as any)

    vi.spyOn(prisma.cargo, 'findFirst').mockResolvedValueOnce(null)
    vi.spyOn(prisma.cargo, 'create').mockResolvedValueOnce({
      id: 'cargo-123',
      nome: 'Mestre de Obras',
      ativo: true,
      criadoEm: new Date(),
    } as any)

    const response = await app.inject({
      method: 'POST',
      url: '/api/cargos',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        nome: 'Mestre de Obras',
      },
    })

    expect(response.statusCode).toBe(201)
    const payload = JSON.parse(response.body)
    expect(payload.id).toBe('cargo-123')
    expect(payload.nome).toBe('Mestre de Obras')
  })

  it('deve recusar criacao de cargo com nome duplicado (409 Conflict)', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
      id: adminUserId,
      ativo: true,
    } as any)

    vi.spyOn(prisma.cargo, 'findFirst').mockResolvedValueOnce({
      id: 'cargo-existente',
      nome: 'Mestre de Obras',
    } as any)

    const response = await app.inject({
      method: 'POST',
      url: '/api/cargos',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        nome: 'mestre de obras',
      },
    })

    expect(response.statusCode).toBe(409)
    const payload = JSON.parse(response.body)
    expect(payload.erro).toBe('Cargo com este nome ja cadastrado')
  })

  it('deve barrar criacao de cargo por usuario sem perfil ADMIN (403 Forbidden)', async () => {
    vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
      id: almoxarifeUserId,
      ativo: true,
    } as any)

    const response = await app.inject({
      method: 'POST',
      url: '/api/cargos',
      headers: {
        authorization: `Bearer ${almoxarifeToken}`,
      },
      payload: {
        nome: 'Engenheiro Chefe',
      },
    })

    expect(response.statusCode).toBe(403)
  })
})
