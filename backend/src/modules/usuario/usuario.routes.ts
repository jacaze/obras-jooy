import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { PerfilUsuario } from '@prisma/client'
import { prisma } from '../../shared/database/prisma.js'
import { authenticate, requireRole } from '../../shared/middlewares/auth.js'
import {
  atualizarSituacaoUsuarioSchema,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  loginSchema,
  resetarSenhaSchema,
} from './usuario.schemas.js'
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/errors/AppError.js'

export async function usuarioRoutes(app: FastifyInstance) {
  // ----------------------------------------------------
  // AUTENTICACAO
  // ----------------------------------------------------

  // Login de usuario (publico com rate limit de 5 req/min)
  app.post(
    '/auth/login',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
      schema: {
        tags: ['Autenticacao'],
        summary: 'Autenticacao de usuario e geracao de JWT',
        response: {
          200: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              tipo: { type: 'string', example: 'Bearer' },
              expiraEm: { type: 'string', example: '8h' },
              usuario: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  nome: { type: 'string' },
                  login: { type: 'string' },
                  perfil: { type: 'string' },
                  cargo: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { login, senha } = loginSchema.parse(request.body)

      const usuario = await prisma.usuario.findFirst({
        where: {
          login: {
            equals: login.toLowerCase().trim(),
            mode: 'insensitive',
          },
        },
        include: {
          cargo: true,
        },
      })

      // Zero Trust: Nao revela se o login existe ou se a senha esta errada
      if (!usuario) {
        throw new UnauthorizedError('Credenciais invalidas')
      }

      const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash)
      if (!senhaCorreta) {
        throw new UnauthorizedError('Credenciais invalidas')
      }

      // Se usuario estiver inativo/desativado, informa o motivo com clareza
      if (!usuario.ativo) {
        throw new UnauthorizedError('Usuario desativado. Entre em contato com o administrador.')
      }

      // Gera o token JWT com payload limpo (sem dados sensiveis)
      const token = app.jwt.sign(
        {
          sub: usuario.id,
          login: usuario.login,
          nome: usuario.nome,
          perfil: usuario.perfil,
        },
        { expiresIn: '8h' }
      )

      return reply.status(200).send({
        token,
        tipo: 'Bearer',
        expiraEm: '8h',
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          login: usuario.login,
          perfil: usuario.perfil,
          cargo: usuario.cargo.nome,
        },
      })
    }
  )

  // Perfil do usuario autenticado
  app.get(
    '/auth/me',
    {
      preHandler: [authenticate],
      schema: {
        tags: ['Autenticacao'],
        summary: 'Dados do usuario logado atual',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const usuario = await prisma.usuario.findUnique({
        where: { id: request.user.sub },
        include: { cargo: true },
      })

      if (!usuario || !usuario.ativo) {
        throw new UnauthorizedError('Usuario inativo ou nao localizado')
      }

      return reply.status(200).send({
        id: usuario.id,
        nome: usuario.nome,
        login: usuario.login,
        perfil: usuario.perfil,
        cargo: usuario.cargo.nome,
        criadoEm: usuario.criadoEm,
      })
    }
  )

  // ----------------------------------------------------
  // GESTAO DE USUARIOS (EXCLUSIVO ADMIN)
  // ----------------------------------------------------

  // Listar usuarios
  app.get(
    '/usuarios',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN])],
      schema: {
        tags: ['Usuarios'],
        summary: 'Listagem de usuarios cadastrados (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      const usuarios = await prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          login: true,
          perfil: true,
          ativo: true,
          criadoEm: true,
          cargo: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
        orderBy: { nome: 'asc' },
      })

      return reply.status(200).send(usuarios)
    }
  )

  // Criar usuario
  app.post(
    '/usuarios',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN])],
      schema: {
        tags: ['Usuarios'],
        summary: 'Cadastrar novo usuario no sistema (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { nome, login, senha, perfil, cargoId } = criarUsuarioSchema.parse(request.body)

      // Valida unicidade do login
      const loginExistente = await prisma.usuario.findFirst({
        where: {
          login: {
            equals: login,
            mode: 'insensitive',
          },
        },
      })

      if (loginExistente) {
        throw new ConflictError('Login ja cadastrado')
      }

      // Valida existencia e atividade do cargo
      const cargo = await prisma.cargo.findUnique({
        where: { id: cargoId },
      })

      if (!cargo || !cargo.ativo) {
        throw new BusinessRuleError('Cargo informado nao existe ou esta inativo')
      }

      // Hash seguro da senha
      const senhaHash = await bcrypt.hash(senha, 10)

      const novoUsuario = await prisma.usuario.create({
        data: {
          nome,
          login,
          senhaHash,
          perfil,
          cargoId,
          ativo: true,
        },
        select: {
          id: true,
          nome: true,
          login: true,
          perfil: true,
          ativo: true,
          criadoEm: true,
          cargo: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      })

      return reply.status(201).send(novoUsuario)
    }
  )

  // Atualizar situacao (ativar/desativar)
  app.patch(
    '/usuarios/:id/situacao',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN])],
      schema: {
        tags: ['Usuarios'],
        summary: 'Ativar ou desativar usuario (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { ativo } = atualizarSituacaoUsuarioSchema.parse(request.body)

      // Protecao: impede o admin de desativar a si proprio
      if (request.user.sub === id && !ativo) {
        throw new BusinessRuleError('Nao e permitido desativar o proprio usuario logado')
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id },
      })

      if (!usuario) {
        throw new NotFoundError('Usuario nao localizado')
      }

      const usuarioAtualizado = await prisma.usuario.update({
        where: { id },
        data: { ativo },
        select: {
          id: true,
          nome: true,
          login: true,
          perfil: true,
          ativo: true,
          criadoEm: true,
        },
      })

      return reply.status(200).send(usuarioAtualizado)
    }
  )

  // Resetar senha de usuario (exclusivo ADMIN)
  app.patch(
    '/usuarios/:id/senha',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN])],
      schema: {
        tags: ['Usuarios'],
        summary: 'Resetar senha de usuario (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { novaSenha } = resetarSenhaSchema.parse(request.body)

      const usuario = await prisma.usuario.findUnique({
        where: { id },
      })

      if (!usuario) {
        throw new NotFoundError('Usuario nao localizado')
      }

      const senhaHash = await bcrypt.hash(novaSenha, 10)

      await prisma.usuario.update({
        where: { id },
        data: { senhaHash },
      })

      return reply.status(200).send({
        mensagem: 'Senha resetada com sucesso',
      })
    }
  )

  // Atualizar dados cadastrais de usuario (exclusivo ADMIN)
  app.patch(
    '/usuarios/:id',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN])],
      schema: {
        tags: ['Usuarios'],
        summary: 'Atualizar dados cadastrais de um usuario (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const dados = atualizarUsuarioSchema.parse(request.body)

      const usuarioExistente = await prisma.usuario.findUnique({
        where: { id },
      })

      if (!usuarioExistente) {
        throw new NotFoundError('Usuario nao localizado')
      }

      // Se informou login, valida unicidade
      if (dados.login && dados.login !== usuarioExistente.login) {
        const loginEmUso = await prisma.usuario.findFirst({
          where: {
            id: { not: id },
            login: {
              equals: dados.login,
              mode: 'insensitive',
            },
          },
        })

        if (loginEmUso) {
          throw new ConflictError('Login ja cadastrado para outro usuario')
        }
      }

      // Se informou cargoId, valida se existe e esta ativo
      if (dados.cargoId && dados.cargoId !== usuarioExistente.cargoId) {
        const cargo = await prisma.cargo.findUnique({
          where: { id: dados.cargoId },
        })

        if (!cargo || !cargo.ativo) {
          throw new BusinessRuleError('Cargo informado nao existe ou esta inativo')
        }
      }

      // Protecao: impede o admin de retirar a si proprio o perfil ADMIN
      if (
        request.user.sub === id &&
        dados.perfil &&
        dados.perfil !== PerfilUsuario.ADMIN &&
        usuarioExistente.perfil === PerfilUsuario.ADMIN
      ) {
        throw new BusinessRuleError('Nao e permitido alterar o perfil do proprio administrador logado')
      }

      const usuarioAtualizado = await prisma.usuario.update({
        where: { id },
        data: {
          nome: dados.nome,
          login: dados.login,
          perfil: dados.perfil,
          cargoId: dados.cargoId,
        },
        select: {
          id: true,
          nome: true,
          login: true,
          perfil: true,
          ativo: true,
          criadoEm: true,
          cargo: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      })

      return reply.status(200).send(usuarioAtualizado)
    }
  )

  // Excluir usuario (exclusivo ADMIN)
  app.delete(
    '/usuarios/:id',
    {
      preHandler: [authenticate, requireRole([PerfilUsuario.ADMIN])],
      schema: {
        tags: ['Usuarios'],
        summary: 'Excluir usuario do sistema (exclusivo ADMIN)',
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      // Protecao: impede o admin de excluir a si proprio
      if (request.user.sub === id) {
        throw new BusinessRuleError('Nao e permitido excluir o proprio usuario logado')
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              ferramentasEmprestadas: true,
              requisicoesFeitas: true,
              movimentacoesRegistradas: true,
            },
          },
        },
      })

      if (!usuario) {
        throw new NotFoundError('Usuario nao localizado')
      }

      // Bloqueio de exclusao se houver historico de ferramentas, requisicoes ou movimentacoes vinculadas
      if (
        usuario._count.ferramentasEmprestadas > 0 ||
        usuario._count.requisicoesFeitas > 0 ||
        usuario._count.movimentacoesRegistradas > 0
      ) {
        throw new ConflictError(
          'Nao e possivel excluir o usuario pois ele possui historico vinculado (ferramentas, requisicoes ou movimentacoes de estoque). Desative o usuario caso ele nao deva mais acessar o sistema.'
        )
      }

      await prisma.usuario.delete({
        where: { id },
      })

      return reply.status(204).send()
    }
  )
}
