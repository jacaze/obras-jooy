export type StatusEtapa = 'EM_ANDAMENTO' | 'ENCERRADA'

export interface EtapaArea {
  id: string
  areaId: string
  nome: string
  ordem: number
  status: StatusEtapa
  encerradaEm?: string | null
  criadaEm: string
  atualizadaEm?: string
  _count?: {
    requisicoes: number
  }
}

export interface CriarEtapaAreaInput {
  nome: string
  ordem?: number
  status?: StatusEtapa
}

export interface AtualizarEtapaAreaInput {
  nome?: string
  ordem?: number
}

export interface AreaObra {
  id: string
  obraId: string
  nome: string
  ordem: number
  ativa: boolean
  criadaEm: string
  obra?: {
    id: string
    codigo: string
    nome: string
  }
  etapas?: EtapaArea[]
  _count?: {
    etapas: number
  }
}

export interface Obra {
  id: string
  codigo: string
  nome: string
  cidade: string
  ativa: boolean
  criadaEm: string
  _count?: {
    areas: number
  }
  areas?: AreaObra[]
}
