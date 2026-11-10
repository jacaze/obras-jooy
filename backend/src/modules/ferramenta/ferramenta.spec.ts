import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'
import { PerfilUsuario } from '@prisma/client'

describe('Modulo de Ferramentas e Emprestimos Rastreaveis', () => {
  let app: FastifyInstance
  const adminId = '00000000-0000-0000-0000-000000000001'
  const almoxarifeId = '00000000-0000-0000-0000-000000000002'
  const solicitanteId = '00000000-0000-0000-0000-000000000003'
  const engenhariaId = '00000000-0000-0000-0000-000000000004'
  const ferramentaId = '88888888-8888-8888-8888-888888888888'
  const areaId = '99999999-9999-9999-9999-999999999999'

  let adminToken: string
  let almoxarifeToken: string
  let solicitanteToken: string
  let engenhariaToken: string

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

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

    solicitanteToken = app.jwt.sign({
      sub: solicitanteId,
      login: 'carlos.mestre',
      nome: 'Carlos Mestre',
      perfil: PerfilUsuario.ENCARREGADO,
    })

    engenhariaToken = app.jwt.sign({
      sub: engenhariaId,
      login: 'eng.paula',
      nome: 'Paula Engenharia',
      perfil: PerfilUsuario.ENGENHARIA,
    })

    vi.spyOn(prisma.usuario, 'findUnique').mockImplementation(async (args: any) => {
      const id = args?.where?.id
      if (id === adminId) {
        return { id: adminId, login: 'admin', perfil: PerfilUsuario.ADMIN, ativo: true } as any
      }
      if (id === almoxarifeId) {
        return { id: almoxarifeId, login: 'almoxarife', perfil: PerfilUsuario.ALMOXARIFE, ativo: true } as any
      }
      if (id === solicitanteId) {
        return { id: solicitanteId, login: 'carlos.mestre', nome: 'Carlos Mestre', perfil: PerfilUsuario.ENCARREGADO, ativo: true } as any
      }
      if (id === engenhariaId) {
        return { id: engenhariaId, login: 'eng.paula', nome: 'Paula Engenharia', perfil: PerfilUsuario.ENGENHARIA, ativo: true } as any
      }
      return null
    })
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    await app.close()
  })

  it('deve cadastrar nova ferramenta com status DISPONIVEL', async () => {
    vi.spyOn(prisma.ferramenta, 'findUnique').mockResolvedValueOnce(null)
    vi.spyOn(prisma.ferramenta, 'create').mockResolvedValueOnce({
      id: ferramentaId,
      codigo: 'MART-01',
      nome: 'Martelete Rompedor 800W',
      status: 'DISPONIVEL',
      emprestadoParaId: null,
      ativo: true,
      criadaEm: new Date(),
      emprestadoPara: null,
    } as any)

    const response = await app.inject({
      method: 'POST',
      url: '/api/ferramentas',
      headers: { authorization: `Bearer ${almoxarifeToken}` },
      payload: {
        codigo: 'MART-01',
        nome: 'Martelete Rompedor 800W',
      },
    })

    expect(response.statusCode).toBe(201)
    const data = response.json()
    expect(data.codigo).toBe('MART-01')
    expect(data.status).toBe('DISPONIVEL')
  })

  it('deve listar ferramentas com busca e status', async () => {
    vi.spyOn(prisma.ferramenta, 'findMany').mockResolvedValueOnce([
      {
        id: ferramentaId,
        codigo: 'MART-01',
        nome: 'Martelete Rompedor 800W',
        status: 'DISPONIVEL',
        emprestadoPara: null,
      },
    ] as any)

    const response = await app.inject({
      method: 'GET',
      url: '/api/ferramentas?status=DISPONIVEL',
      headers: { authorization: `Bearer ${solicitanteToken}` },
    })

    expect(response.statusCode).toBe(200)
    const data = response.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data[0].codigo).toBe('MART-01')
  })

  it('deve registrar emprestimo (cautela) de ferramenta vinculando o usuario solicitante, area e flag de teste na saida', async () => {
    vi.spyOn(prisma.ferramenta, 'findUnique').mockResolvedValueOnce({
      id: ferramentaId,
      codigo: 'MART-01',
      status: 'DISPONIVEL',
    } as any)

    vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
      id: areaId,
      nome: '1o Pavimento',
    } as any)

    const createCautelaSpy = vi.spyOn(prisma.cautelaFerramenta, 'create').mockResolvedValueOnce({
      id: 'cautela-1',
      ferramentaId,
      usuarioId: solicitanteId,
      areaId,
      entreguePorId: almoxarifeId,
      testadoNaSaida: true,
    } as any)

    vi.spyOn(prisma.ferramenta, 'update').mockResolvedValueOnce({
      id: ferramentaId,
      codigo: 'MART-01',
      status: 'EMPRESTADO',
      emprestadoParaId: solicitanteId,
      emprestadoPara: { id: solicitanteId, nome: 'Carlos Mestre' },
    } as any)

    const response = await app.inject({
      method: 'POST',
      url: `/api/ferramentas/${ferramentaId}/emprestimo`,
      headers: { authorization: `Bearer ${almoxarifeToken}` },
      payload: {
        usuarioId: solicitanteId,
        areaId,
        testadoNaSaida: true,
        observacaoSaida: 'Entregue com ponteira SDS Plus',
      },
    })

    expect(response.statusCode).toBe(200)
    const data = response.json()
    expect(data.status).toBe('EMPRESTADO')
    expect(data.emprestadoPara.nome).toBe('Carlos Mestre')
    expect(createCautelaSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ferramentaId,
          usuarioId: solicitanteId,
          areaId,
          entreguePorId: almoxarifeId,
          testadoNaSaida: true,
        }),
      })
    )
  })

  it('deve recusar emprestimo se testadoNaSaida for false ou ausente', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/ferramentas/${ferramentaId}/emprestimo`,
      headers: { authorization: `Bearer ${almoxarifeToken}` },
      payload: {
        usuarioId: solicitanteId,
        testadoNaSaida: false,
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it('deve bloquear emprestimo e devolucao para perfis que nao sejam ALMOXARIFE ou ADMIN (ex: ENGENHARIA)', async () => {
    const resEmp = await app.inject({
      method: 'POST',
      url: `/api/ferramentas/${ferramentaId}/emprestimo`,
      headers: { authorization: `Bearer ${engenhariaToken}` },
      payload: {
        usuarioId: solicitanteId,
        testadoNaSaida: true,
      },
    })
    expect(resEmp.statusCode).toBe(403)

    const resDev = await app.inject({
      method: 'POST',
      url: `/api/ferramentas/${ferramentaId}/devolucao`,
      headers: { authorization: `Bearer ${engenhariaToken}` },
      payload: {
        testadoNoRetorno: true,
        comDefeito: false,
      },
    })
    expect(resDev.statusCode).toBe(403)
  })

  it('deve registrar devolucao de ferramenta com teste no retorno liberando para status DISPONIVEL', async () => {
    vi.spyOn(prisma.ferramenta, 'findUnique').mockResolvedValueOnce({
      id: ferramentaId,
      codigo: 'MART-01',
      status: 'EMPRESTADO',
      emprestadoParaId: solicitanteId,
    } as any)

    vi.spyOn(prisma.cautelaFerramenta, 'findFirst').mockResolvedValueOnce({
      id: 'cautela-1',
      ferramentaId,
      devolvidaEm: null,
    } as any)

    const updateCautelaSpy = vi.spyOn(prisma.cautelaFerramenta, 'update').mockResolvedValueOnce({
      id: 'cautela-1',
      testadoNoRetorno: true,
      comDefeito: false,
    } as any)

    vi.spyOn(prisma.ferramenta, 'update').mockResolvedValueOnce({
      id: ferramentaId,
      codigo: 'MART-01',
      status: 'DISPONIVEL',
      emprestadoParaId: null,
      emprestadoPara: null,
    } as any)

    const response = await app.inject({
      method: 'POST',
      url: `/api/ferramentas/${ferramentaId}/devolucao`,
      headers: { authorization: `Bearer ${almoxarifeToken}` },
      payload: {
        testadoNoRetorno: true,
        comDefeito: false,
        observacaoDevolucao: 'Retornou limpa e funcionando',
      },
    })

    expect(response.statusCode).toBe(200)
    const data = response.json()
    expect(data.status).toBe('DISPONIVEL')
    expect(data.emprestadoPara).toBeNull()
    expect(updateCautelaSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cautela-1' },
        data: expect.objectContaining({
          recebidoPorId: almoxarifeId,
          testadoNoRetorno: true,
          comDefeito: false,
          observacaoDevolucao: 'Retornou limpa e funcionando',
        }),
      })
    )
  })

  it('deve recusar devolucao se testadoNoRetorno for false', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/ferramentas/${ferramentaId}/devolucao`,
      headers: { authorization: `Bearer ${almoxarifeToken}` },
      payload: {
        testadoNoRetorno: false,
        comDefeito: false,
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
