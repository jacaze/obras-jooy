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
  codigoSienge?: string | null
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
  codigoSienge?: string | null
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
  codigo?: string
  codigoSienge?: string | null
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
// FERRAMENTAS RASTREAVEIS E CAUTELAS (F06)
// ----------------------------------------------------
export type StatusFerramenta = 'DISPONIVEL' | 'EMPRESTADO' | 'COM_DEFEITO'

export interface UsuarioResumo {
  id: string
  nome: string
  login: string
  perfil?: string
}

export interface CautelaFerramenta {
  id: string
  ferramentaId: string
  usuarioId: string
  areaId?: string | null
  entreguePorId: string
  testadoNaSaida: boolean
  observacaoSaida?: string | null
  previsaoDevolucao?: string | null
  retiradaEm: string
  devolvidaEm?: string | null
  recebidoPorId?: string | null
  testadoNoRetorno?: boolean | null
  comDefeito?: boolean | null
  observacaoDevolucao?: string | null
  usuario?: UsuarioResumo
  area?: {
    id: string
    nome: string
  } | null
  entreguePor?: UsuarioResumo
  recebidoPor?: UsuarioResumo | null
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
  cautelas?: CautelaFerramenta[]
}

export interface RegistrarEmprestimoInput {
  usuarioId: string
  areaId?: string | null
  testadoNaSaida: boolean
  previsaoDevolucao?: string | null
  observacaoSaida?: string | null
}

export interface RegistrarDevolucaoInput {
  testadoNoRetorno: boolean
  comDefeito: boolean
  observacaoDevolucao?: string | null
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
