import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { PerfilUsuario } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'

describe('Modulo de Usuarios e Autenticacao (Rotas e Regras de Negocio)', () => {
  let app: FastifyInstance
  let adminToken: string
  let almoxarifeToken: string

  const adminUserId = '00000000-0000-0000-0000-000000000001'
  const almoxarifeUserId = '00000000-0000-0000-0000-000000000002'
  const cargoId = '00000000-0000-0000-0000-000000000099'

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

  describe('POST /api/auth/login', () => {
    it('deve autenticar usuario com credenciais corretas e retornar token JWT', async () => {
      const senhaHash = await bcrypt.hash('senhaValida123', 10)

      vi.spyOn(prisma.usuario, 'findFirst').mockResolvedValueOnce({
        id: 'user-1',
        nome: 'Joao Silva',
        login: 'joao.silva',
        senhaHash,
        perfil: PerfilUsuario.ALMOXARIFE,
        ativo: true,
        cargo: { nome: 'Almoxarife' },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          login: 'joao.silva',
          senha: 'senhaValida123',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.token).toBeDefined()
      expect(body.tipo).toBe('Bearer')
      expect(body.usuario.login).toBe('joao.silva')
      expect(body.usuario.cargo).toBe('Almoxarife')
      expect(body.usuario.senhaHash).toBeUndefined()
    })

    it('deve rejeitar login com senha incorreta (401 Unauthorized)', async () => {
      const senhaHash = await bcrypt.hash('senhaCorreta', 10)

      vi.spyOn(prisma.usuario, 'findFirst').mockResolvedValueOnce({
        id: 'user-1',
        nome: 'Joao Silva',
        login: 'joao.silva',
        senhaHash,
        ativo: true,
        cargo: { nome: 'Almoxarife' },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          login: 'joao.silva',
          senha: 'senhaErrada',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.erro).toBe('Credenciais invalidas')
    })

    it('deve rejeitar login de usuario inativo com mensagem explicativa (401 Unauthorized)', async () => {
      const senhaHash = await bcrypt.hash('qualquerSenha', 10)
      vi.spyOn(prisma.usuario, 'findFirst').mockResolvedValueOnce({
        id: 'user-inativo',
        login: 'inativo',
        senhaHash,
        ativo: false,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          login: 'inativo',
          senha: 'qualquerSenha',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.erro).toBe('Usuario desativado. Entre em contato com o administrador.')
    })
  })

  describe('GET /api/auth/me', () => {
    it('deve retornar informacoes do usuario autenticado', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockImplementation(async ({ where }: any) => {
        if (where.id === adminUserId) {
          return {
            id: adminUserId,
            nome: 'Administrador',
            login: 'admin',
            perfil: PerfilUsuario.ADMIN,
            cargo: { nome: 'Administrador do Sistema' },
            ativo: true,
            criadoEm: new Date(),
          } as any
        }
        return null
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.nome).toBe('Administrador')
      expect(body.cargo).toBe('Administrador do Sistema')
    })
  })

  describe('Gestao de Usuarios (/api/usuarios)', () => {
    it('deve listar usuarios para o perfil ADMIN', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: adminUserId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.usuario, 'findMany').mockResolvedValueOnce([
        {
          id: adminUserId,
          nome: 'Administrador',
          login: 'admin',
          perfil: PerfilUsuario.ADMIN,
          ativo: true,
          cargo: { id: 'c1', nome: 'Administrador do Sistema' },
        },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/usuarios',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveLength(1)
      expect(body[0].login).toBe('admin')
    })

    it('deve impedir que usuario ALMOXARIFE liste usuarios (403 Forbidden)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeUserId,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/usuarios',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve cadastrar novo usuario quando solicitado por ADMIN (201)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: adminUserId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.usuario, 'findFirst').mockResolvedValueOnce(null)
      vi.spyOn(prisma.cargo, 'findUnique').mockResolvedValueOnce({
        id: cargoId,
        nome: 'Almoxarife',
        ativo: true,
      } as any)

      vi.spyOn(prisma.usuario, 'create').mockResolvedValueOnce({
        id: 'new-user-id',
        nome: 'Carlos Encarregado',
        login: 'carlos.obras',
        perfil: PerfilUsuario.ENCARREGADO,
        ativo: true,
        criadoEm: new Date(),
        cargo: { id: cargoId, nome: 'Almoxarife' },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/usuarios',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          nome: 'Carlos Encarregado',
          login: 'carlos.obras',
          senha: 'senhaForte123',
          perfil: 'ENCARREGADO',
          cargoId: cargoId,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.id).toBe('new-user-id')
      expect(body.login).toBe('carlos.obras')
    })

    it('deve rejeitar criacao de usuario com login duplicado (409 Conflict)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: adminUserId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.usuario, 'findFirst').mockResolvedValueOnce({
        id: 'user-existente',
        login: 'carlos.obras',
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/usuarios',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          nome: 'Carlos Outro',
          login: 'carlos.obras',
          senha: 'senhaForte123',
          perfil: 'ENCARREGADO',
          cargoId: cargoId,
        },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.erro).toBe('Login ja cadastrado')
    })

    it('deve permitir que o ADMIN resete a senha de um usuario', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockImplementation(async ({ where }: any) => {
        if (where.id === adminUserId) {
          return { id: adminUserId, ativo: true } as any
        }
        if (where.id === 'user-alvo') {
          return { id: 'user-alvo', login: 'alvo.reset' } as any
        }
        return null
      })

      const updateSpy = vi.spyOn(prisma.usuario, 'update').mockResolvedValueOnce({
        id: 'user-alvo',
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/usuarios/user-alvo/senha',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          novaSenha: 'novaSenhaSegura123',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.mensagem).toBe('Senha resetada com sucesso')
      expect(updateSpy).toHaveBeenCalled()
    })

    it('deve impedir que o ADMIN desative a si proprio (422 BusinessRuleError)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: adminUserId,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/usuarios/${adminUserId}/situacao`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          ativo: false,
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toBe('Nao e permitido desativar o proprio usuario logado')
    })
  })
})
