import { describe, it, expect, beforeEach } from 'vitest'
import {
  salvarRequisicaoOffline,
  obterRequisicoesOffline,
  removerRequisicaoOffline,
  atualizarTentativaOffline,
  limparRequisicoesOffline,
  salvarCacheObras,
  obterCacheObras,
  salvarCacheMateriais,
  obterCacheMateriais,
  salvarCacheEtapas,
  obterCacheEtapas,
} from './offlineStorage'

describe('offlineStorage Service (F05 - PWA e Modo Offline)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('deve enfileirar requisicao offline e gerar identificador local unico', () => {
    const criada = salvarRequisicaoOffline({
      dados: {
        areaId: 'area-1',
        etapaId: 'etapa-1',
        itens: [{ materialId: 'mat-1', quantidade: 5 }],
      },
      dadosExibicao: {
        obraNome: 'Residencial Jooy',
        areaNome: 'Torre A',
        etapaNome: 'Alvenaria',
        itens: [
          { codigo: 'CIM-01', descricao: 'Cimento CP-II', quantidade: 5, unidadeMedida: 'SC' },
        ],
      },
    })

    expect(criada.idLocal).toMatch(/^offline-\d+-[a-z0-9]+$/)
    expect(criada.tentativas).toBe(0)
    expect(criada.dados.itens[0].quantidade).toBe(5)

    const salvas = obterRequisicoesOffline()
    expect(salvas).toHaveLength(1)
    expect(salvas[0].idLocal).toBe(criada.idLocal)
    expect(salvas[0].dadosExibicao.obraNome).toBe('Residencial Jooy')
  })

  it('deve remover requisicao offline da fila apos sincronizacao', () => {
    const req1 = salvarRequisicaoOffline({
      dados: { areaId: 'area-1', etapaId: 'etapa-1', itens: [{ materialId: 'mat-1', quantidade: 2 }] },
      dadosExibicao: { obraNome: 'Obra 1', itens: [] },
    })
    const req2 = salvarRequisicaoOffline({
      dados: { areaId: 'area-2', etapaId: 'etapa-2', itens: [{ materialId: 'mat-2', quantidade: 4 }] },
      dadosExibicao: { obraNome: 'Obra 2', itens: [] },
    })

    expect(obterRequisicoesOffline()).toHaveLength(2)

    removerRequisicaoOffline(req1.idLocal)

    const restantes = obterRequisicoesOffline()
    expect(restantes).toHaveLength(1)
    expect(restantes[0].idLocal).toBe(req2.idLocal)
  })

  it('deve registrar tentativa com erro ao falhar envio ao servidor', () => {
    const req = salvarRequisicaoOffline({
      dados: { areaId: 'area-1', etapaId: 'etapa-1', itens: [{ materialId: 'mat-1', quantidade: 2 }] },
      dadosExibicao: { obraNome: 'Obra 1', itens: [] },
    })

    atualizarTentativaOffline(req.idLocal, 'Erro 500: Timeout de conexao no canteiro')

    const atualizada = obterRequisicoesOffline().find((i) => i.idLocal === req.idLocal)
    expect(atualizada?.tentativas).toBe(1)
    expect(atualizada?.ultimoErro).toContain('Timeout de conexao')
  })

  it('deve salvar e recuperar cache de obras, materiais e etapas', () => {
    const mockObras = [{ id: 'obra-1', codigo: 'JY-01', nome: 'Jooy Reserva', cidade: 'Campo Grande' }] as any
    salvarCacheObras(mockObras)
    expect(obterCacheObras()).toEqual(mockObras)

    const mockMateriais = [{ id: 'mat-1', codigo: 'CIM-01', descricao: 'Cimento 50kg' }] as any
    salvarCacheMateriais(mockMateriais)
    expect(obterCacheMateriais()).toEqual(mockMateriais)

    const mockEtapas = [{ id: 'et-1', nome: 'Fundacao', status: 'EM_ANDAMENTO', ordem: 1 }] as any
    salvarCacheEtapas('area-1', mockEtapas)
    expect(obterCacheEtapas('area-1')).toEqual(mockEtapas)
  })

  it('deve limpar todas as requisicoes offline', () => {
    salvarRequisicaoOffline({
      dados: { areaId: 'area-1', etapaId: 'etapa-1', itens: [] },
      dadosExibicao: { itens: [] },
    })
    expect(obterRequisicoesOffline()).toHaveLength(1)

    limparRequisicoesOffline()
    expect(obterRequisicoesOffline()).toHaveLength(0)
  })
})
