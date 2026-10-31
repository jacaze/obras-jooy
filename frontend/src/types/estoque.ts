import type { Obra, AreaObra } from './obra'
import type { Material } from './material'

export type TipoMovimentacao =
  | 'ENTRADA_RECEB'
  | 'SAIDA_REQ'
  | 'ENTRADA_DEVOL'
  | 'SAIDA_TRANSF'
  | 'ENTRADA_TRANSF'
  | 'AJUSTE_INV'
  | 'ESTORNO'

export interface LocalEstoque {
  id: string
  obraId: string
  nome: string
  ativo: boolean
  criadoEm: string
  obra?: Pick<Obra, 'id' | 'codigo' | 'nome' | 'cidade' | 'ativa'>
  _count?: {
    saldos: number
    movimentacoes: number
  }
}

export interface EstoqueSaldoItem {
  localId: string
  materialId: string
  quantidade: number
  reservado: number
  disponivel: number
  versao: number
  atualizadoEm: string
  local: {
    id: string
    nome: string
    ativo: boolean
    obra: {
      id: string
      codigo: string
      nome: string
    }
  }
  material: Material
}

export interface MovimentacaoEstoqueItem {
  id: string
  localId: string
  materialId: string
  tipo: TipoMovimentacao
  natureza: 'ENTRADA' | 'SAIDA'
  quantidade: number
  areaId?: string | null
  requisicaoId?: string | null
  usuarioId: string
  chaveIdempotencia?: string | null
  observacao?: string | null
  ocorridaEm: string
  registradaEm: string
  local: {
    id: string
    nome: string
    obra: {
      id: string
      codigo: string
      nome: string
    }
  }
  material: {
    id: string
    codigo: string
    descricao: string
    unidadeConsumo: {
      sigla: string
      descricao: string
    }
  }
  area?: Pick<AreaObra, 'id' | 'nome'> | null
  usuario: {
    id: string
    nome: string
    login: string
    cargo?: {
      nome: string
    }
  }
}

export interface RegistrarMovimentacaoInput {
  localId: string
  materialId: string
  tipo: TipoMovimentacao
  quantidade: number
  usarUnidadeCompra?: boolean
  areaId?: string | null
  requisicaoId?: string | null
  observacao?: string | null
  chaveIdempotencia?: string | null
}

export interface FiltrosSaldoEstoque {
  obraId?: string
  localId?: string
  categoriaId?: string
  busca?: string
}

export interface FiltrosMovimentacaoEstoque {
  obraId?: string
  localId?: string
  materialId?: string
  tipo?: TipoMovimentacao
  limite?: number
}
