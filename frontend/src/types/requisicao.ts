import type { AreaObra } from './obra'
import type { Material, Ferramenta } from './material'

export type StatusRequisicao =
  | 'SOLICITADA'
  | 'EM_SEPARACAO'
  | 'PRONTA'
  | 'ATENDIDA'
  | 'CANCELADA'

export interface RequisicaoItem {
  id: string
  requisicaoId: string
  materialId?: string | null
  ferramentaId?: string | null
  quantidade: number
  quantidadeEntregue?: number | null
  material?: Material | null
  ferramenta?: Ferramenta | null
}

export interface Requisicao {
  id: string
  numeroSequencial: number
  areaId: string
  requisitanteId: string
  status: StatusRequisicao
  codigoRetirada?: string | null
  chaveIdempotencia?: string | null
  observacao?: string | null
  retiradoPor?: string | null
  atendidoPorId?: string | null
  atendidoEm?: string | null
  exportadaSienge?: boolean
  exportadaEm?: string | null
  exportadaPorId?: string | null
  solicitadaEm: string
  prontaEm?: string | null
  retiradaEm?: string | null
  area: AreaObra
  requisitante: {
    id: string
    nome: string
    login: string
    cargo: {
      nome: string
    }
  }
  atendidoPor?: {
    id: string
    nome: string
    login: string
  } | null
  exportadaPor?: {
    id: string
    nome: string
    login: string
  } | null
  itens: RequisicaoItem[]
}

export interface ItemRequisicaoInput {
  materialId?: string | null
  ferramentaId?: string | null
  quantidade: number
}

export interface CriarRequisicaoInput {
  areaId: string
  observacao?: string
  chaveIdempotencia?: string
  itens: ItemRequisicaoInput[]
}

export interface AtenderRequisicaoInput {
  retiradoPor: string
  observacao?: string | null
  itens?: Array<{
    itemId: string
    quantidadeEntregue: number
    localId?: string | null
  }>
}

export interface ExportarSiengeInput {
  requisicaoIds?: string[]
  obraId?: string
  incluirJaExportadas?: boolean
}

export interface ExportarSiengeResponse {
  csv: string
  nomeArquivo: string
  totalRequisicoes: number
  requisicaoIds: string[]
  exportadaEm: string
}

export interface FiltrosRequisicao {
  status?: StatusRequisicao
  areaId?: string
  obraId?: string
  requisitanteId?: string
  exportadaSienge?: boolean
}
