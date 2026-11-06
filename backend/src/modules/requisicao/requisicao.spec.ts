import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PerfilUsuario, StatusFerramenta, StatusRequisicao } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'

describe('Modulo de Requisicoes de Obra, Atendimento de Estoque e Exportacao SIENGE', () => {
  let app: FastifyInstance
  let encarregadoToken: string
  let outroEncarregadoToken: string
  let almoxarifeToken: string

  const encarregadoId = '00000000-0000-0000-0000-000000000001'
  const outroEncarregadoId = '00000000-0000-0000-0000-000000000002'
  const almoxarifeId = '00000000-0000-0000-0000-000000000003'

  const obraId = '00000000-0000-0000-0000-000000000010'
  const areaId = '00000000-0000-0000-0000-000000000020'
  const localId = '00000000-0000-0000-0000-000000000025'
  const materialId = '00000000-0000-0000-0000-000000000030'
  const ferramentaId = '00000000-0000-0000-0000-000000000040'
  const requisicaoId = '00000000-0000-0000-0000-000000000050'
  const requisicaoOutroId = '00000000-0000-0000-0000-000000000051'
  const itemMaterialId = '00000000-0000-0000-0000-000000000060'

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

  describe('POST /api/requisicoes (Criacao com Validacao de Saldo)', () => {
    it('deve permitir que o Encarregado crie uma requisicao quando houver saldo disponivel suficiente na obra (201)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce(null)

      vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
        id: areaId,
        obraId,
        nome: 'Pavimento 03',
        ativa: true,
        obra: { id: obraId, ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        descricao: 'Cimento CP-II',
        ativo: true,
        unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
      } as any)

      // Saldo disponivel na obra = 50 sacos (pede 15)
      vi.spyOn(prisma.estoqueSaldo, 'findMany').mockResolvedValueOnce([
        {
          localId,
          materialId,
          quantidade: 50,
          reservado: 0,
          versao: 1,
        },
      ] as any)

      vi.spyOn(prisma.ferramenta, 'findUnique').mockResolvedValueOnce({
        id: ferramentaId,
        nome: 'Furadeira de Impacto',
        status: StatusFerramenta.DISPONIVEL,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'create').mockResolvedValueOnce({
        id: requisicaoId,
        numeroSequencial: 101,
        areaId,
        requisitanteId: encarregadoId,
        status: StatusRequisicao.SOLICITADA,
        chaveIdempotencia: 'chave-uuid-001',
        observacao: 'Para concretagem da laje',
        exportadaSienge: false,
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
            id: itemMaterialId,
            materialId,
            ferramentaId: null,
            quantidade: 15,
            quantidadeEntregue: null,
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
            quantidadeEntregue: null,
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
      expect(body.id).toBe(requisicaoId)
      expect(body.numeroSequencial).toBe(101)
      expect(body.itens).toHaveLength(2)
      expect(body.status).toBe('SOLICITADA')
    })

    it('deve impedir criacao de requisicao quando a quantidade solicitada for maior que o saldo disponivel na obra (422)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce(null)

      vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
        id: areaId,
        obraId,
        nome: 'Pavimento 03',
        ativa: true,
        obra: { id: obraId, ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        descricao: 'Cimento CP-II',
        ativo: true,
        unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
      } as any)

      // Saldo disponivel = 8 sacos (tenta pedir 20)
      vi.spyOn(prisma.estoqueSaldo, 'findMany').mockResolvedValueOnce([
        {
          localId,
          materialId,
          quantidade: 10,
          reservado: 2,
          versao: 1,
        },
      ] as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/requisicoes',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
        payload: {
          areaId,
          itens: [{ materialId, quantidade: 20 }],
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('Saldo insuficiente no estoque da obra')
      expect(body.erro).toContain('disponivel: 8 SC, solicitado: 20 SC')
    })

    it('deve retornar requisicao existente se a mesma chave de idempotencia for reenviada (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce({
        id: requisicaoId,
        numeroSequencial: 101,
        status: StatusRequisicao.SOLICITADA,
        chaveIdempotencia: 'chave-repetida-999',
        itens: [],
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
      expect(body.id).toBe(requisicaoId)
    })

    it('deve rejeitar requisicao com area inativa ou inexistente (422)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce(null)

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

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce(null)

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
          id: requisicaoId,
          requisitanteId: encarregadoId,
          status: StatusRequisicao.SOLICITADA,
          itens: [],
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

    it('deve permitir que ALMOXARIFE liste todas as requisicoes da obra e filtre por exportadaSienge', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      const findManySpy = vi.spyOn(prisma.requisicao, 'findMany').mockResolvedValueOnce([
        { id: requisicaoId, requisitanteId: encarregadoId, itens: [] },
        { id: requisicaoOutroId, requisitanteId: outroEncarregadoId, itens: [] },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/requisicoes?exportadaSienge=false',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveLength(2)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { exportadaSienge: false },
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
        id: requisicaoOutroId,
        requisitanteId: outroEncarregadoId,
        itens: [],
      } as any)

      const response = await app.inject({
        method: 'GET',
        url: `/api/requisicoes/${requisicaoOutroId}`,
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('voce so pode visualizar suas proprias requisicoes')
    })
  })

  describe('PATCH /api/requisicoes/:id/atender (Atendimento pelo Almoxarife com Baixa no Estoque)', () => {
    it('deve impedir que ENCARREGADO atenda uma requisicao (403 Forbidden)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/requisicoes/${requisicaoId}/atender`,
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
        payload: {
          retiradoPor: 'Jose Pedreiro',
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve permitir que ALMOXARIFE atenda requisicao editando quantidade entregue, registrando quem retirou e baixando saldo no Kardex (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      const mockUpdateManySaldo = vi.fn().mockResolvedValueOnce({ count: 1 })
      const mockCreateMovimentacao = vi.fn().mockResolvedValueOnce({ id: 'mov-saida-1' })
      const mockUpdateItem = vi.fn().mockResolvedValueOnce({})

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const fakeTx = {
          requisicao: {
            findUnique: vi.fn().mockResolvedValueOnce({
              id: requisicaoId,
              numeroSequencial: 101,
              areaId,
              requisitanteId: encarregadoId,
              status: StatusRequisicao.SOLICITADA,
              area: {
                id: areaId,
                nome: 'Pavimento 03',
                obra: { id: obraId, codigo: 'OBRA-01', nome: 'Residencial Jooy' },
              },
              itens: [
                {
                  id: itemMaterialId,
                  materialId,
                  ferramentaId: null,
                  quantidade: 10, // Solicitou 10
                  material: {
                    id: materialId,
                    codigo: 'CIM-01',
                    descricao: 'Cimento CP-II',
                    unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
                  },
                },
              ],
            }),
            update: vi.fn().mockResolvedValueOnce({
              id: requisicaoId,
              numeroSequencial: 101,
              status: StatusRequisicao.ATENDIDA,
              retiradoPor: 'Carlos Pedreiro',
              atendidoPorId: almoxarifeId,
              exportadaSienge: false,
              itens: [
                {
                  id: itemMaterialId,
                  materialId,
                  quantidade: 10,
                  quantidadeEntregue: 6, // Entregou 6
                },
              ],
            }),
          },
          requisicaoItem: {
            update: mockUpdateItem,
          },
          estoqueSaldo: {
            findMany: vi.fn().mockResolvedValueOnce([
              {
                localId,
                materialId,
                quantidade: 30,
                reservado: 0,
                versao: 2,
                local: { id: localId, nome: 'Almoxarifado Geral' },
              },
            ]),
            updateMany: mockUpdateManySaldo,
          },
          movimentacaoEstoque: {
            create: mockCreateMovimentacao,
          },
        }
        return callback(fakeTx)
      })

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/requisicoes/${requisicaoId}/atender`,
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          retiradoPor: 'Carlos Pedreiro',
          itens: [
            {
              itemId: itemMaterialId,
              quantidadeEntregue: 6,
            },
          ],
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.status).toBe('ATENDIDA')
      expect(body.retiradoPor).toBe('Carlos Pedreiro')
      expect(body.itens[0].quantidade).toBe(10)
      expect(body.itens[0].quantidadeEntregue).toBe(6)

      // Verifica se baixou exatamente 6 unidades com Optimistic Locking e registrou no Kardex
      expect(mockUpdateManySaldo).toHaveBeenCalledWith({
        where: {
          localId,
          materialId,
          versao: 2,
        },
        data: {
          quantidade: { increment: -6 },
          versao: { increment: 1 },
        },
      })
      expect(mockCreateMovimentacao).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            localId,
            materialId,
            tipo: 'SAIDA_REQ',
            quantidade: 6,
            requisicaoId,
          }),
        })
      )
    })
  })

  describe('POST /api/requisicoes/exportar-sienge (Exportacao CSV e Flag SIENGE)', () => {
    it('deve impedir que ENCARREGADO exporte requisicoes para o SIENGE (403 Forbidden)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/requisicoes/exportar-sienge',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve gerar CSV formatado para o SIENGE e marcar requisicoes como exportadaSienge = true (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: almoxarifeId,
        ativo: true,
      } as any)

      const mockUpdateManyReq = vi.fn().mockResolvedValueOnce({ count: 1 })

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const fakeTx = {
          requisicao: {
            findMany: vi.fn().mockResolvedValueOnce([
              {
                id: requisicaoId,
                numeroSequencial: 101,
                status: StatusRequisicao.ATENDIDA,
                solicitadaEm: new Date('2026-10-31T10:00:00Z'),
                atendidoEm: new Date('2026-10-31T11:00:00Z'),
                retiradoPor: 'Carlos Pedreiro',
                observacao: 'Urgente Bloco A',
                area: {
                  id: areaId,
                  nome: 'Pavimento 03',
                  obra: { id: obraId, codigo: 'JOOY-01', nome: 'Residencial Jooy' },
                },
                requisitante: {
                  id: encarregadoId,
                  nome: 'Joao Encarregado',
                },
                atendidoPor: {
                  id: almoxarifeId,
                  nome: 'Maria Almoxarife',
                },
                itens: [
                  {
                    id: itemMaterialId,
                    quantidade: 10,
                    quantidadeEntregue: 6,
                    material: {
                      id: materialId,
                      codigo: 'CIM-01',
                      descricao: 'Cimento CP-II',
                      unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
                    },
                    ferramenta: null,
                  },
                ],
              },
            ]),
            updateMany: mockUpdateManyReq,
          },
        }
        return callback(fakeTx)
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/requisicoes/exportar-sienge',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {},
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.totalRequisicoes).toBe(1)
      expect(body.requisicaoIds).toEqual([requisicaoId])
      expect(body.csv).toContain('NUMERO_REQUISICAO;DATA_SOLICITACAO;DATA_ATENDIMENTO;CODIGO_OBRA')
      expect(body.csv).toContain('REQ-101;')
      expect(body.csv).toContain(';JOOY-01;Residencial Jooy;Pavimento 03;MATERIAL;CIM-01;Cimento CP-II;SC;10;6;Joao Encarregado;Carlos Pedreiro;Maria Almoxarife;Urgente Bloco A')

      expect(mockUpdateManyReq).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [requisicaoId] } },
          data: expect.objectContaining({
            exportadaSienge: true,
            exportadaPorId: almoxarifeId,
          }),
        })
      )
    })
  })

  describe('PATCH /api/requisicoes/:id/cancelar', () => {
    it('deve permitir que o Encarregado cancele sua requisicao enquanto estiver com status SOLICITADA (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValue({
        id: encarregadoId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.requisicao, 'findUnique').mockResolvedValueOnce({
        id: requisicaoId,
        requisitanteId: encarregadoId,
        status: StatusRequisicao.SOLICITADA,
      } as any)

      vi.spyOn(prisma.requisicao, 'update').mockResolvedValueOnce({
        id: requisicaoId,
        status: StatusRequisicao.CANCELADA,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/requisicoes/${requisicaoId}/cancelar`,
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
        id: requisicaoId,
        requisitanteId: encarregadoId,
        status: StatusRequisicao.EM_SEPARACAO,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/requisicoes/${requisicaoId}/cancelar`,
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
