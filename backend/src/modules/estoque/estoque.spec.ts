import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { PerfilUsuario, TipoMovimentacao } from '@prisma/client'
import { buildApp } from '../../app.js'
import { prisma } from '../../shared/database/prisma.js'

describe('Modulo de Estoque Fisico, Saldos e Livro-Razao Imutavel (T08)', () => {
  let app: FastifyInstance
  let almoxarifeToken: string
  let encarregadoToken: string

  const almoxarifeId = '00000000-0000-0000-0000-000000000001'
  const encarregadoId = '00000000-0000-0000-0000-000000000002'
  const obraId = '00000000-0000-0000-0000-000000000010'
  const outraObraId = '00000000-0000-0000-0000-000000000011'
  const localId = '00000000-0000-0000-0000-000000000020'
  const areaId = '00000000-0000-0000-0000-000000000030'
  const materialId = '00000000-0000-0000-0000-000000000040'

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

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

  describe('Locais de Estoque (/api/locais-estoque)', () => {
    it('deve impedir que perfil ENCARREGADO acesse rotas de estoque (403 Forbidden)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: encarregadoId,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/locais-estoque',
        headers: {
          authorization: `Bearer ${encarregadoToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('deve cadastrar novo local de estoque em obra ativa (201)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        codigo: 'OBRA-01',
        nome: 'Residencial Jooy',
        ativa: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findFirst').mockResolvedValueOnce(null)

      vi.spyOn(prisma.localEstoque, 'create').mockResolvedValueOnce({
        id: localId,
        obraId,
        nome: 'Almoxarifado Central - Terreo',
        ativo: true,
        obra: {
          id: obraId,
          codigo: 'OBRA-01',
          nome: 'Residencial Jooy',
          cidade: 'Campo Grande',
          ativa: true,
        },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/locais-estoque',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          obraId,
          nome: 'Almoxarifado Central - Terreo',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(localId)
      expect(body.nome).toBe('Almoxarifado Central - Terreo')
    })

    it('deve bloquear duplicidade de nome de local na mesma obra (409 Conflict)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        ativa: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findFirst').mockResolvedValueOnce({
        id: localId,
        nome: 'Almoxarifado Central',
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/locais-estoque',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          obraId,
          nome: 'Almoxarifado Central',
        },
      })

      expect(response.statusCode).toBe(409)
    })

    it('deve bloquear desativacao de local de estoque que ainda possui saldo positivo (409 Conflict)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findUnique').mockResolvedValueOnce({
        id: localId,
        ativo: true,
        saldos: [{ quantidade: 15, reservado: 0 }],
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/locais-estoque/${localId}/situacao`,
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          ativo: false,
        },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('possui saldo fisico ou reservado')
    })

    it('deve rejeitar id invalido ao atualizar situacao de local de estoque (400 Bad Request)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/locais-estoque/id-invalido-nao-uuid/situacao',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          ativo: false,
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('deve permitir editar nome de locacao de estoque existente (200)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findUnique').mockResolvedValueOnce({
        id: localId,
        obraId,
        nome: 'Locacao Antiga',
        ativo: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findFirst').mockResolvedValueOnce(null)

      vi.spyOn(prisma.localEstoque, 'update').mockResolvedValueOnce({
        id: localId,
        obraId,
        nome: 'Locacao 01 - Prateleira A',
        ativo: true,
        obra: { id: obraId, codigo: 'OBRA-01', nome: 'Obra', cidade: 'Campo Grande', ativa: true },
      } as any)

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/locais-estoque/${localId}`,
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          nome: 'Locacao 01 - Prateleira A',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.nome).toBe('Locacao 01 - Prateleira A')
    })

    it('deve impedir exclusao de locacao que ja possui historico de saldos ou movimentacoes (409)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findUnique').mockResolvedValueOnce({
        id: localId,
        obraId,
        nome: 'Locacao 01',
        _count: { saldos: 1, movimentacoes: 2 },
      } as any)

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/locais-estoque/${localId}`,
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(409)
    })
  })

  describe('Saldos de Estoque (/api/estoque/saldos)', () => {
    it('deve listar saldos calculando corretamente o saldo disponivel (quantidade - reservado)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.estoqueSaldo, 'findMany').mockResolvedValueOnce([
        {
          localId,
          materialId,
          quantidade: 100,
          reservado: 25,
          versao: 3,
          local: {
            id: localId,
            nome: 'Almoxarifado Central',
            obra: { id: obraId, codigo: 'OBRA-01', nome: 'Residencial Jooy' },
          },
          material: {
            id: materialId,
            codigo: 'MAT-01',
            descricao: 'Cimento CP-II',
            unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
          },
        },
      ] as any)

      const response = await app.inject({
        method: 'GET',
        url: '/api/estoque/saldos',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveLength(1)
      expect(body[0].quantidade).toBe(100)
      expect(body[0].reservado).toBe(25)
      expect(body[0].disponivel).toBe(75)
    })
  })

  describe('Livro-Razao e Movimentacoes Atomicas (/api/estoque/movimentacoes)', () => {
    it('deve registrar entrada com conversao automatica de unidade de compra para consumo (201)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.movimentacaoEstoque, 'findUnique').mockResolvedValueOnce(null)

      vi.spyOn(prisma.localEstoque, 'findUnique').mockResolvedValueOnce({
        id: localId,
        obraId,
        ativo: true,
        obra: { id: obraId, ativa: true },
      } as any)

      // Material com fator de conversao 12 (1 Caixa = 12 Unidades)
      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        codigo: 'MAT-SIL-01',
        descricao: 'Silicone Acético Tubo',
        fatorConversao: 12,
        ativo: true,
        unidadeConsumo: { sigla: 'UN', descricao: 'Unidade' },
        unidadeCompra: { sigla: 'CX', descricao: 'Caixa' },
      } as any)

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const fakeTx = {
          estoqueSaldo: {
            findUnique: vi.fn().mockResolvedValueOnce(null),
            create: vi.fn().mockResolvedValueOnce({
              localId,
              materialId,
              quantidade: 60, // 5 caixas * 12 = 60 unidades
              reservado: 0,
              versao: 1,
            }),
          },
          movimentacaoEstoque: {
            create: vi.fn().mockResolvedValueOnce({
              id: 'mov-1',
              localId,
              materialId,
              tipo: TipoMovimentacao.ENTRADA_RECEB,
              quantidade: 60,
              local: { id: localId, nome: 'Almoxarifado Central', obra: { id: obraId, codigo: 'OBRA-01', nome: 'Obra' } },
              material: { id: materialId, codigo: 'MAT-SIL-01', descricao: 'Silicone', unidadeConsumo: { sigla: 'UN' } },
              usuario: { id: almoxarifeId, nome: 'Maria Almoxarife', login: 'maria.almox' },
            }),
          },
        }
        return callback(fakeTx)
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/estoque/movimentacoes',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          localId,
          materialId,
          tipo: 'ENTRADA_RECEB',
          quantidade: 5,
          usarUnidadeCompra: true,
          observacao: 'Recebimento NF 4580 (5 caixas com 12 tubos)',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.movimentacao.quantidade).toBe(60)
      expect(body.movimentacao.natureza).toBe('ENTRADA')
      expect(body.saldo.quantidade).toBe(60)
      expect(body.saldo.disponivel).toBe(60)
    })

    it('deve impedir saida quando o saldo disponivel for insuficiente (422 BusinessRuleError)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findUnique').mockResolvedValueOnce({
        id: localId,
        obraId,
        ativo: true,
        obra: { id: obraId, ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        fatorConversao: 1,
        ativo: true,
        unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
      } as any)

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const fakeTx = {
          estoqueSaldo: {
            findUnique: vi.fn().mockResolvedValueOnce({
              localId,
              materialId,
              quantidade: 20,
              reservado: 15, // Disponivel = 5
              versao: 2,
            }),
          },
        }
        return callback(fakeTx)
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/estoque/movimentacoes',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          localId,
          materialId,
          tipo: 'SAIDA_REQ',
          quantidade: 10, // Tenta retirar 10 mas so ha 5 disponiveis
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('Saldo disponivel insuficiente')
    })

    it('deve detectar conflito de concorrencia otimista (Optimistic Locking) e abortar com 409 Conflict', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findUnique').mockResolvedValueOnce({
        id: localId,
        obraId,
        ativo: true,
        obra: { id: obraId, ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        fatorConversao: 1,
        ativo: true,
        unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
      } as any)

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const fakeTx = {
          estoqueSaldo: {
            findUnique: vi.fn().mockResolvedValueOnce({
              localId,
              materialId,
              quantidade: 50,
              reservado: 0,
              versao: 4,
            }),
            // Simula que outra transacao concorrente alterou a versao antes do updateMany
            updateMany: vi.fn().mockResolvedValueOnce({ count: 0 }),
          },
        }
        return callback(fakeTx)
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/estoque/movimentacoes',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          localId,
          materialId,
          tipo: 'SAIDA_REQ',
          quantidade: 10,
        },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('Conflito de concorrencia detectado')
    })

    it('deve bloquear movimentacao se a area informada pertencer a outra obra diferente do local de estoque (422)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findUnique').mockResolvedValueOnce({
        id: localId,
        obraId,
        ativo: true,
        obra: { id: obraId, ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        fatorConversao: 1,
        ativo: true,
        unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
      } as any)

      vi.spyOn(prisma.areaObra, 'findUnique').mockResolvedValueOnce({
        id: areaId,
        obraId: outraObraId, // Obra diferente!
        ativa: true,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/estoque/movimentacoes',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          localId,
          materialId,
          areaId,
          tipo: 'SAIDA_REQ',
          quantidade: 5,
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('pertence a uma obra diferente do local de estoque')
    })

    it('deve garantir idempotencia retornando movimentacao existente (200) sem duplicar lançamento', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.movimentacaoEstoque, 'findUnique').mockResolvedValueOnce({
        id: 'mov-idemp-01',
        localId,
        materialId,
        tipo: TipoMovimentacao.ENTRADA_RECEB,
        quantidade: 30,
        chaveIdempotencia: 'idemp-key-123',
      } as any)

      vi.spyOn(prisma.estoqueSaldo, 'findUnique').mockResolvedValueOnce({
        localId,
        materialId,
        quantidade: 30,
        reservado: 0,
        versao: 1,
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/estoque/movimentacoes',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          localId,
          materialId,
          tipo: 'ENTRADA_RECEB',
          quantidade: 30,
          chaveIdempotencia: 'idemp-key-123',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.movimentacao.id).toBe('mov-idemp-01')
      expect(body.saldo.disponivel).toBe(30)
    })

    it('deve bloquear uso de conversao por unidade de compra em operacao de saida (422)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.localEstoque, 'findUnique').mockResolvedValueOnce({
        id: localId,
        obraId,
        ativo: true,
        obra: { id: obraId, ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        fatorConversao: 12,
        ativo: true,
        unidadeConsumo: { sigla: 'UN', descricao: 'Unidade' },
      } as any)

      const response = await app.inject({
        method: 'POST',
        url: '/api/estoque/movimentacoes',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          localId,
          materialId,
          tipo: 'SAIDA_REQ',
          quantidade: 2,
          usarUnidadeCompra: true,
        },
      })

      expect(response.statusCode).toBe(422)
      const body = JSON.parse(response.body)
      expect(body.erro).toContain('so pode ser utilizada em operacoes de entrada')
    })

    it('deve permitir registrar movimentacao informando apenas a obra (sem localId) criando/usando automaticamente o Almoxarifado Geral (201)', async () => {
      vi.spyOn(prisma.usuario, 'findUnique').mockResolvedValueOnce({
        id: almoxarifeId,
        ativo: true,
      } as any)

      vi.spyOn(prisma.obra, 'findUnique').mockResolvedValueOnce({
        id: obraId,
        codigo: 'OBRA-01',
        nome: 'Residencial Jooy',
        ativa: true,
      } as any)

      // Simula que ainda nao havia locacao padrao e cria "Almoxarifado Geral"
      vi.spyOn(prisma.localEstoque, 'findFirst').mockResolvedValueOnce(null)
      vi.spyOn(prisma.localEstoque, 'create').mockResolvedValueOnce({
        id: localId,
        obraId,
        nome: 'Almoxarifado Geral',
        ativo: true,
        obra: { id: obraId, codigo: 'OBRA-01', nome: 'Residencial Jooy', ativa: true },
      } as any)

      vi.spyOn(prisma.material, 'findUnique').mockResolvedValueOnce({
        id: materialId,
        fatorConversao: 1,
        ativo: true,
        unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
      } as any)

      vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (callback: any) => {
        const fakeTx = {
          estoqueSaldo: {
            findUnique: vi.fn().mockResolvedValueOnce(null),
            create: vi.fn().mockResolvedValueOnce({
              localId,
              materialId,
              quantidade: 15,
              reservado: 0,
              versao: 1,
            }),
          },
          movimentacaoEstoque: {
            create: vi.fn().mockResolvedValueOnce({
              id: 'mov-geral-1',
              localId,
              materialId,
              tipo: TipoMovimentacao.ENTRADA_RECEB,
              quantidade: 15,
              local: {
                id: localId,
                nome: 'Almoxarifado Geral',
                obra: { id: obraId, codigo: 'OBRA-01', nome: 'Residencial Jooy' },
              },
              material: {
                id: materialId,
                codigo: 'MAT-01',
                descricao: 'Cimento',
                unidadeConsumo: { sigla: 'SC', descricao: 'Saco' },
              },
              usuario: { id: almoxarifeId, nome: 'Maria', login: 'maria' },
            }),
          },
        }
        return callback(fakeTx)
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/estoque/movimentacoes',
        headers: {
          authorization: `Bearer ${almoxarifeToken}`,
        },
        payload: {
          obraId,
          materialId,
          tipo: 'ENTRADA_RECEB',
          quantidade: 15,
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.movimentacao.local.nome).toBe('Almoxarifado Geral')
      expect(body.saldo.disponivel).toBe(15)
    })
  })
})
