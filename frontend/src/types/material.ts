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
  unidadeCompraId?: string | null
  unidadeConsumoId: string
  fatorConversao: number | string
  ehKit: boolean
  exigeTesteQualidade: boolean
  ativo: boolean
  criadoEm: string
  categoria: CategoriaMaterial
  unidadeCompra?: UnidadeMedida | null
  unidadeConsumo: UnidadeMedida
}

export interface CriarMaterialInput {
  codigo: string
  descricao: string
  categoriaId: string
  unidadeConsumoId: string
  unidadeCompraId?: string | null
  fatorConversao?: number
  ehKit?: boolean
  exigeTesteQualidade?: boolean
  ativo?: boolean
}

export interface AtualizarMaterialInput {
  descricao?: string
  categoriaId?: string
  unidadeConsumoId?: string
  unidadeCompraId?: string | null
  fatorConversao?: number
  ehKit?: boolean
  exigeTesteQualidade?: boolean
  ativo?: boolean
}

export interface FiltrosMaterial {
  busca?: string
  categoriaId?: string
  somenteAtivos?: boolean
}

// ----------------------------------------------------
// FERRAMENTAS RASTREAVEIS
// ----------------------------------------------------
export type StatusFerramenta = 'DISPONIVEL' | 'EMPRESTADO' | 'COM_DEFEITO'

export interface UsuarioResumo {
  id: string
  nome: string
  login: string
  perfil: string
}

export interface Ferramenta {
  id: string
  codigo: string
  nome: string
  status: StatusFerramenta
  emprestadoParaId?: string | null
  ativo: boolean
  criadaEm: string
  emprestadoPara?: UsuarioResumo | null
}

export interface CriarFerramentaInput {
  codigo: string
  nome: string
  status?: StatusFerramenta
  emprestadoParaId?: string | null
  ativo?: boolean
}

export interface AtualizarFerramentaInput {
  nome?: string
  status?: StatusFerramenta
  emprestadoParaId?: string | null
  ativo?: boolean
}

export interface FiltrosFerramenta {
  busca?: string
  status?: StatusFerramenta
  somenteAtivas?: boolean
}
