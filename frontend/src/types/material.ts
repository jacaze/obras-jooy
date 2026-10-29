export type TipoControleMaterial = 'CONSUMO' | 'FERRAMENTA_PATRIMONIO'

export interface UnidadeMedida {
  id: string
  sigla: string
  descricao: string
  criadaEm: string
  _count?: {
    materiaisCompra: number
    materiaisConsumo: number
  }
}

export interface CategoriaMaterial {
  id: string
  nome: string
  criadaEm: string
  _count?: {
    materiais: number
  }
}

export interface Material {
  id: string
  codigo: string
  descricao: string
  categoriaId: string
  tipoControle: TipoControleMaterial
  unidadeCompraId: string
  unidadeConsumoId: string
  fatorConversao: number | string
  ehKit: boolean
  exigeTesteQualidade: boolean
  ativo: boolean
  criadoEm: string
  categoria: CategoriaMaterial
  unidadeCompra: UnidadeMedida
  unidadeConsumo: UnidadeMedida
}

export interface CriarMaterialInput {
  codigo: string
  descricao: string
  categoriaId: string
  tipoControle: TipoControleMaterial
  unidadeCompraId: string
  unidadeConsumoId: string
  fatorConversao: number
  ehKit?: boolean
  exigeTesteQualidade?: boolean
  ativo?: boolean
}

export interface AtualizarMaterialInput {
  descricao?: string
  categoriaId?: string
  tipoControle?: TipoControleMaterial
  unidadeCompraId?: string
  unidadeConsumoId?: string
  fatorConversao?: number
  ehKit?: boolean
  exigeTesteQualidade?: boolean
  ativo?: boolean
}

export interface FiltrosMaterial {
  busca?: string
  categoriaId?: string
  tipoControle?: TipoControleMaterial
  somenteAtivos?: boolean
}
