import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PerfilUsuario, StatusRequisicao } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'

describe('Modulo de Requisicoes de Obra (Rotas e Regras de Negocio)', () => {
  let app: FastifyInstance
  let encarregadoToken: string
  let outroEncarregadoToken: string
  let almoxarifeToken: string

  const encarregadoId = '00000000-0000-0000-0000-000000000001'
  const outroEncarregadoId = '00000000-0000-0000-0000-000000000002'
  const almoxarifeId = '00000000-0000-0000-0000-000000000003'

  const obraId = '00000000-0000-0000-0000-000000000010'
  const areaId = '00000000-0000-0000-0000-000000000020'
  const materialId = '00000000-0000-0000-0000-000000000030'
  const ferramentaId = '00000000-0000-0000-0000-000000000040'

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    encarregadoToken = app.jwt.sign({
      sub: encarregadoId,
      login: 'joao.encarregado',
      nome: 'Joao Encarregado',
      perfil: PerfilUsuario.ENCARREGADO,
    })

    outroEncarregadoToken = app.jwt.sign({
      sub: outroEncarregadoId,
      login: 'pedro.encarregado',
      nome: 'Pedro Encarregado',
      perfil: PerfilUsuario.ENCARREGADO,
    })

    almoxarifeToken = app.jwt.sign({
      sub: almoxarifeId,
      login: 'maria.almoxarife',
      nome: 'Maria Almoxarife',
      perfil: PerfilUsuario.ALMOXARIFE,
    })
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/requisicoes (Criacao)', () => {
    it('deve permitir que o Encarregado crie uma requisicao com itens validos (201)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
        id: areaId,
        nome: 'Pavimento 03',
        ativa: true,
        obra: { id: obraId, ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        descricao: 'Cimento CP-II',
        ativo: true,
      } as any)

      vi.spyOn(prisma.ferramenta, 'findUnique').mockResolvedValueOnce({
        id: ferramentaId,
        nome: 'Furadeira de Impacto',
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'create').mockResolvedValueOnce({
        id: 'req-01',
        numeroSequencial: 101,
        areaId,
        requisitanteId: encarregadoId,
        status: StatusRequisicao.SOLICITADA,
        chaveIdempotencia: 'chave-uuid-001',
        observacao: 'Para concretagem da laje',
        solicitadaEm: new Date(),
        area: {
          id: areaId,
          nome: 'Pavimento 03',
          ordem: 3,
          obra: { id: obraId, codigo: 'OBRA-01', nome: 'Residencial Jooy' },
        },
        requisitante: {
          id: encarregadoId,
          nome: 'Joao Encarregado',
          login: 'joao.encarregado',
          cargo: { nome: 'Mestre de Obras' },
        },
        itens: [
          {
            id: 'item-1',
            materialId,
            ferramentaId: null,
            quantidade: 15,
            material: {
              id: materialId,
              codigo: 'MAT-CIM-01',
              descricao: 'Cimento CP-II',
              unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
            },
            ferramenta: null,
          },
          {
            id: 'item-2',
            materialId: null,
            ferramentaId,
            quantidade: 1,
            material: null,
            ferramenta: {
              id: ferramentaId,
              codigo: 'FER-FUR-01',
              nome: 'Furadeira de Impacto',
              status: 'DISPONIVEL',
            },
          },
        ],
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/requisicoes',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
        payload: {
          areaId,
          chaveIdempotencia: 'chave-uuid-001',
          observacao: 'Para concretagem da laje',
          itens: [
            { materialId, quantidade: 15 },
            { ferramentaId, quantidade: 1 },
          ],
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.id).toBe('req-01')
      expect(body.numeroSequencial).toBe(101)
      expect(body.itens).toHaveLength(2)
      expect(body.status).toBe('SOLICITADA')
    })

    it('deve retornar requisicao existente se a mesma chave de idempotencia for reenviada (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce({
        id: 'req-01',
        numeroSequencial: 101,
        status: StatusRequisicao.SOLICITADA,
        chaveIdempotencia: 'chave-repetida-999',
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/requisicoes',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
        payload: {
          areaId,
          chaveIdempotencia: 'chave-repetida-999',
          itens: [{ materialId, quantidade: 5 }],
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBe('req-01')
    })

    it('deve rejeitar requisicao com area inativa ou inexistente (422)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
        id: areaId,
        ativa: false,
        obra: { ativa: true },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/requisicoes',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
        payload: {
          areaId,
          itens: [{ materialId, quantidade: 2 }],
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toBe('Area informada nao existe ou esta inativa na obra')
    })

    it('deve rejeitar requisicao com material inativo (422)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
        id: areaId,
        ativa: true,
        obra: { ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        ativo: false,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/requisicoes',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
        payload: {
          areaId,
          itens: [{ materialId, quantidade: 2 }],
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('Material informado')
      expect(body.erro).toContain('inativo')
    })
  })

  describe('GET /api/requisicoes (Listagem e Isolamento)', () => {
    it('deve filtrar automaticamente apenas as proprias requisicoes quando o usuario for ENCARREGADO', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      const findManySpy = vi.spyOn(prisma.requisicao, 'findMany').mockResolvedValueOnce([
        {
          id: 'req-joao-1',
          requisitanteId: encarregadoId,
          status: StatusRequisicao.SOLICITADA,
        },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/requisicoes',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requisitanteId: encarregadoId,
          }),
        })
      )
    })

    it('deve permitir que ALMOXARIFE liste todas as requisicoes da obra', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      const findManySpy = vi.spyOn(prisma.requisicao, 'findMany').mockResolvedValueOnce([
        { id: 'req-1', requisitanteId: encarregadoId },
        { id: 'req-2', requisitanteId: outroEncarregadoId },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/requisicoes',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveLength(2)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      )
    })
  })

  describe('GET /api/requisicoes/:id (Detalhes e RBAC)', () => {
    it('deve impedir que ENCARREGADO acesse detalhes de requisicao de outro encarregado (403 Forbidden)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce({
        id: 'req-de-outro',
        requisitanteId: outroEncarregadoId,
      } as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/requisicoes/req-de-outro',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('voce so pode visualizar suas proprias requisicoes')
    })
  })

  describe('PATCH /api/requisicoes/:id/cancelar', () => {
    it('deve permitir que o Encarregado cancele sua requisicao enquanto estiver com status SOLICITADA (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce({
        id: 'req-01',
        requisitanteId: encarregadoId,
        status: StatusRequisicao.SOLICITADA,
      } as any)

      vi.spyOn(prisma.requisicao, 'update').mockResolvedValueOnce({
        id: 'req-01',
        status: StatusRequisicao.CANCELADA,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/requisicoes/req-01/cancelar',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('CANCELADA')
    })

    it('deve impedir cancelamento pelo Encarregado se a requisicao ja estiver EM_SEPARACAO (422)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce({
        id: 'req-01',
        requisitanteId: encarregadoId,
        status: StatusRequisicao.EM_SEPARACAO,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/requisicoes/req-01/cancelar',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('ja esta em separacao pelo almoxarifado')
    })
  })
})
