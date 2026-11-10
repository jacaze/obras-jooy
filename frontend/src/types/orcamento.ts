export type StatusOrcamentoMaterial = 'DENTRO_DO_LIMITE' | 'ATENCAO' | 'ULTRAPASSADO'

export interface LimiteOrcamentoObra {
  id: string
  obraId: string
  materialId: string
  quantidadeOrcada: number
  quantidadeConsumida?: number
  saldoOrcamento?: number
}

export interface OrcamentoObraItem {
  id: string
  obraId: string
  materialId: string
  quantidadeOrcada: number
  observacao?: string | null
  criadoEm: string
  atualizadoEm: string
  obra: {
    id: string
    codigo: string
    nome: string
    cidade: string
    ativa: boolean
  }
  material: {
    id: string
    codigo: string
    descricao: string
    unidadeConsumo: {
      id: string
      sigla: string
      descricao: string
    }
    categoria?: {
      id: string
      nome: string
    } | null
  }
  quantidadeEntregue: number
  quantidadePendente: number
  quantidadeConsumida: number
  saldoOrcamento: number
  excedente: number
  percentualConsumido: number
  statusOrcamento: StatusOrcamentoMaterial
}

export interface ResumoOrcamentoObra {
  totalItensOrcados: number
  totalUltrapassados: number
  totalEmAtencao: number
  totalDentroDoLimite: number
}

export interface PainelOrcamentoObraResponse {
  resumo: ResumoOrcamentoObra
  itens: OrcamentoObraItem[]
}

export interface FiltrosOrcamentoObra {
  obraId?: string
  materialId?: string
  status?: StatusOrcamentoMaterial
  busca?: string
}

export interface CriarOrcamentoObraInput {
  obraId: string
  materialId: string
  quantidadeOrcada: number
  observacao?: string
}

export interface AtualizarOrcamentoObraInput {
  quantidadeOrcada?: number
  observacao?: string | null
}
