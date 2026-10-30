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
