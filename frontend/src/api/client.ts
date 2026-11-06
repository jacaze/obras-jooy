import axios from 'axios'
import type { Cargo, PerfilUsuario, UsuarioAuth, UsuarioListagem } from '../types/auth'
import type { AreaObra, Obra } from '../types/obra'
import type {
  CategoriaMaterial,
  CriarMaterialInput,
  AtualizarMaterialInput,
  FiltrosMaterial,
  Material,
  UnidadeMedida,
  Ferramenta,
  CriarFerramentaInput,
  AtualizarFerramentaInput,
  FiltrosFerramenta,
} from '../types/material'
import type {
  AtenderRequisicaoInput,
  CriarRequisicaoInput,
  ExportarSiengeInput,
  ExportarSiengeResponse,
  FiltrosRequisicao,
  Requisicao,
} from '../types/requisicao'
import type {
  EstoqueSaldoItem,
  FiltrosMovimentacaoEstoque,
  FiltrosSaldoEstoque,
  LocalEstoque,
  MovimentacaoEstoqueItem,
  RegistrarMovimentacaoInput,
} from '../types/estoque'
import type {
  AtualizarOrcamentoObraInput,
  CriarOrcamentoObraInput,
  FiltrosOrcamentoObra,
  LimiteOrcamentoObra,
  OrcamentoObraItem,
  PainelOrcamentoObraResponse,
} from '../types/orcamento'

export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para injetar token JWT em todas as requisicoes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('almox.token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para tratar expiracao de sessao (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      localStorage.removeItem('almox.token')
      localStorage.removeItem('almox.usuario')
      window.dispatchEvent(new Event('auth:expirada'))
    }
    return Promise.reject(error)
  }
)

export interface HealthResponse {
  status: string
  timestamp: string
  servico: string
  versao: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/health')
  return response.data
}

export async function login(loginStr: string, senhaStr: string): Promise<{ token: string; usuario: UsuarioAuth }> {
  const response = await api.post<{ token: string; usuario: UsuarioAuth }>('/auth/login', {
    login: loginStr,
    senha: senhaStr,
  })
  return response.data
}

export async function getMe(): Promise<UsuarioAuth> {
  const response = await api.get<UsuarioAuth>('/auth/me')
  return response.data
}

export async function getCargos(somenteAtivos = true): Promise<Cargo[]> {
  const response = await api.get<Cargo[]>(`/cargos?somenteAtivos=${somenteAtivos}`)
  return response.data
}

export async function createCargo(nome: string): Promise<Cargo> {
  const response = await api.post<Cargo>('/cargos', { nome })
  return response.data
}

export async function toggleCargoSituacao(id: string, ativo: boolean): Promise<Cargo> {
  const response = await api.patch<Cargo>(`/cargos/${id}/situacao`, { ativo })
  return response.data
}

export async function getUsuarios(): Promise<UsuarioListagem[]> {
  const response = await api.get<UsuarioListagem[]>('/usuarios')
  return response.data
}

export async function getUsuariosOpcoes(): Promise<UsuarioListagem[]> {
  const response = await api.get<UsuarioListagem[]>('/usuarios/opcoes')
  return response.data
}

export async function createUsuario(dados: {
  nome: string
  login: string
  senha: string
  perfil: PerfilUsuario
  cargoId: string
  obraId?: string | null
}): Promise<UsuarioListagem> {
  const response = await api.post<UsuarioListagem>('/usuarios', dados)
  return response.data
}

export interface AtualizarUsuarioInput {
  nome?: string
  login?: string
  perfil?: PerfilUsuario
  cargoId?: string
  obraId?: string | null
}

export async function updateUsuario(id: string, dados: AtualizarUsuarioInput): Promise<UsuarioListagem> {
  const response = await api.patch<UsuarioListagem>(`/usuarios/${id}`, dados)
  return response.data
}

export async function deleteUsuario(id: string): Promise<void> {
  await api.delete(`/usuarios/${id}`)
}

export async function toggleUsuarioSituacao(id: string, ativo: boolean): Promise<{ id: string; ativo: boolean }> {
  const response = await api.patch<{ id: string; ativo: boolean }>(`/usuarios/${id}/situacao`, { ativo })
  return response.data
}

export async function resetarSenhaUsuario(id: string, novaSenha: string): Promise<{ mensagem: string }> {
  const response = await api.patch<{ mensagem: string }>(`/usuarios/${id}/senha`, { novaSenha })
  return response.data
}

// ----------------------------------------------------
// OBRAS E AREAS DA OBRA (T05)
// ----------------------------------------------------

export async function getObras(somenteAtivas = true): Promise<Obra[]> {
  const response = await api.get<Obra[]>(`/obras?somenteAtivas=${somenteAtivas}`)
  return response.data
}

export async function getObraDetalhes(id: string): Promise<Obra> {
  const response = await api.get<Obra>(`/obras/${id}`)
  return response.data
}

export async function createObra(dados: { codigo: string; nome: string; cidade: string }): Promise<Obra> {
  const response = await api.post<Obra>('/obras', dados)
  return response.data
}

export async function toggleObraSituacao(id: string, ativa: boolean): Promise<Obra> {
  const response = await api.patch<Obra>(`/obras/${id}/situacao`, { ativa })
  return response.data
}

export async function getAreasObra(obraId: string, somenteAtivas = true): Promise<AreaObra[]> {
  const response = await api.get<AreaObra[]>(`/obras/${obraId}/areas?somenteAtivas=${somenteAtivas}`)
  return response.data
}

export async function createAreaObra(obraId: string, dados: { nome: string; ordem?: number }): Promise<AreaObra> {
  const response = await api.post<AreaObra>(`/obras/${obraId}/areas`, dados)
  return response.data
}

export async function updateAreaObra(id: string, dados: { nome?: string; ordem?: number }): Promise<AreaObra> {
  const response = await api.patch<AreaObra>(`/areas/${id}`, dados)
  return response.data
}

export async function toggleAreaSituacao(id: string, ativa: boolean): Promise<AreaObra> {
  const response = await api.patch<AreaObra>(`/areas/${id}/situacao`, { ativa })
  return response.data
}

export async function deleteAreaObra(id: string): Promise<void> {
  await api.delete(`/areas/${id}`)
}

// ----------------------------------------------------
// CATALOGO DE MATERIAIS, UNIDADES E CATEGORIAS (T07)
// ----------------------------------------------------

export async function getUnidadesMedida(): Promise<UnidadeMedida[]> {
  const response = await api.get<UnidadeMedida[]>('/unidades-medida')
  return response.data
}

export async function createUnidadeMedida(dados: { sigla: string; descricao: string }): Promise<UnidadeMedida> {
  const response = await api.post<UnidadeMedida>('/unidades-medida', dados)
  return response.data
}

export async function updateUnidadeMedida(id: string, dados: { descricao: string }): Promise<UnidadeMedida> {
  const response = await api.patch<UnidadeMedida>(`/unidades-medida/${id}`, dados)
  return response.data
}

export async function deleteUnidadeMedida(id: string): Promise<void> {
  await api.delete(`/unidades-medida/${id}`)
}

export async function getCategoriasMaterial(): Promise<CategoriaMaterial[]> {
  const response = await api.get<CategoriaMaterial[]>('/categorias-material')
  return response.data
}

export async function createCategoriaMaterial(dados: { nome: string }): Promise<CategoriaMaterial> {
  const response = await api.post<CategoriaMaterial>('/categorias-material', dados)
  return response.data
}

export async function updateCategoriaMaterial(id: string, dados: { nome: string }): Promise<CategoriaMaterial> {
  const response = await api.patch<CategoriaMaterial>(`/categorias-material/${id}`, dados)
  return response.data
}

export async function deleteCategoriaMaterial(id: string): Promise<void> {
  await api.delete(`/categorias-material/${id}`)
}

export async function getMateriais(filtros?: FiltrosMaterial): Promise<Material[]> {
  const params = new URLSearchParams()
  if (filtros?.busca) params.append('busca', filtros.busca)
  if (filtros?.categoriaId) params.append('categoriaId', filtros.categoriaId)
  if (filtros?.somenteAtivos !== undefined) {
    params.append('somenteAtivos', String(filtros.somenteAtivos))
  }

  const queryStr = params.toString() ? `?${params.toString()}` : ''
  const response = await api.get<Material[]>(`/materiais${queryStr}`)
  return response.data
}

export async function getMaterialDetalhes(id: string): Promise<Material> {
  const response = await api.get<Material>(`/materiais/${id}`)
  return response.data
}

export async function createMaterial(dados: CriarMaterialInput): Promise<Material> {
  const response = await api.post<Material>('/materiais', dados)
  return response.data
}

export async function updateMaterial(id: string, dados: AtualizarMaterialInput): Promise<Material> {
  const response = await api.patch<Material>(`/materiais/${id}`, dados)
  return response.data
}

export async function toggleMaterialSituacao(id: string, ativo: boolean): Promise<Material> {
  const response = await api.patch<Material>(`/materiais/${id}/situacao`, { ativo })
  return response.data
}

// ----------------------------------------------------
// FERRAMENTAS RASTREAVEIS
// ----------------------------------------------------

export async function getFerramentas(filtros?: FiltrosFerramenta): Promise<Ferramenta[]> {
  const params = new URLSearchParams()
  if (filtros?.busca) params.append('busca', filtros.busca)
  if (filtros?.status) params.append('status', filtros.status)
  if (filtros?.somenteAtivas !== undefined) {
    params.append('somenteAtivas', String(filtros.somenteAtivas))
  }

  const queryStr = params.toString() ? `?${params.toString()}` : ''
  const response = await api.get<Ferramenta[]>(`/ferramentas${queryStr}`)
  return response.data
}

export async function createFerramenta(dados: CriarFerramentaInput): Promise<Ferramenta> {
  const response = await api.post<Ferramenta>('/ferramentas', dados)
  return response.data
}

export async function updateFerramenta(id: string, dados: AtualizarFerramentaInput): Promise<Ferramenta> {
  const response = await api.patch<Ferramenta>(`/ferramentas/${id}`, dados)
  return response.data
}

export async function registrarEmprestimoFerramenta(id: string, usuarioId: string): Promise<Ferramenta> {
  const response = await api.post<Ferramenta>(`/ferramentas/${id}/emprestimo`, { usuarioId })
  return response.data
}

export async function registrarDevolucaoFerramenta(id: string, comDefeito: boolean): Promise<Ferramenta> {
  const response = await api.post<Ferramenta>(`/ferramentas/${id}/devolucao`, { comDefeito })
  return response.data
}

// ----------------------------------------------------
// REQUISICOES DE OBRA (T11)
// ----------------------------------------------------

export async function getRequisicoes(filtros?: FiltrosRequisicao): Promise<Requisicao[]> {
  const params = new URLSearchParams()
  if (filtros?.status) params.append('status', filtros.status)
  if (filtros?.areaId) params.append('areaId', filtros.areaId)
  if (filtros?.obraId) params.append('obraId', filtros.obraId)
  if (filtros?.requisitanteId) params.append('requisitanteId', filtros.requisitanteId)
  if (filtros?.exportadaSienge !== undefined) {
    params.append('exportadaSienge', String(filtros.exportadaSienge))
  }

  const queryStr = params.toString() ? `?${params.toString()}` : ''
  const response = await api.get<Requisicao[]>(`/requisicoes${queryStr}`)
  return response.data
}

export async function getRequisicaoDetalhes(id: string): Promise<Requisicao> {
  const response = await api.get<Requisicao>(`/requisicoes/${id}`)
  return response.data
}

export async function createRequisicao(dados: CriarRequisicaoInput): Promise<Requisicao> {
  const response = await api.post<Requisicao>('/requisicoes', dados)
  return response.data
}

export async function atenderRequisicao(id: string, dados: AtenderRequisicaoInput): Promise<Requisicao> {
  const response = await api.patch<Requisicao>(`/requisicoes/${id}/atender`, dados)
  return response.data
}

export async function exportarRequisicoesSienge(dados?: ExportarSiengeInput): Promise<ExportarSiengeResponse> {
  const response = await api.post<ExportarSiengeResponse>('/requisicoes/exportar-sienge', dados || {})
  return response.data
}

export async function cancelarRequisicao(id: string): Promise<{ id: string; status: string }> {
  const response = await api.patch<{ id: string; status: string }>(`/requisicoes/${id}/cancelar`)
  return response.data
}

// ----------------------------------------------------
// ESTOQUE FISICO, SALDOS E LIVRO-RAZAO (T08)
// ----------------------------------------------------

export async function getLocaisEstoque(obraId?: string, somenteAtivos?: boolean): Promise<LocalEstoque[]> {
  const params = new URLSearchParams()
  if (obraId) params.append('obraId', obraId)
  if (somenteAtivos !== undefined) params.append('somenteAtivos', String(somenteAtivos))

  const queryStr = params.toString() ? `?${params.toString()}` : ''
  const response = await api.get<LocalEstoque[]>(`/locais-estoque${queryStr}`)
  return response.data
}

export async function createLocalEstoque(dados: { obraId: string; nome: string }): Promise<LocalEstoque> {
  const response = await api.post<LocalEstoque>('/locais-estoque', dados)
  return response.data
}

export async function updateLocalEstoque(id: string, nome: string): Promise<LocalEstoque> {
  const response = await api.patch<LocalEstoque>(`/locais-estoque/${id}`, { nome })
  return response.data
}

export async function deleteLocalEstoque(id: string): Promise<void> {
  await api.delete(`/locais-estoque/${id}`)
}

export async function toggleLocalEstoqueSituacao(id: string, ativo: boolean): Promise<LocalEstoque> {
  const response = await api.patch<LocalEstoque>(`/locais-estoque/${id}/situacao`, { ativo })
  return response.data
}

export async function getSaldosEstoque(filtros?: FiltrosSaldoEstoque): Promise<EstoqueSaldoItem[]> {
  const params = new URLSearchParams()
  if (filtros?.obraId) params.append('obraId', filtros.obraId)
  if (filtros?.localId) params.append('localId', filtros.localId)
  if (filtros?.categoriaId) params.append('categoriaId', filtros.categoriaId)
  if (filtros?.busca) params.append('busca', filtros.busca)

  const queryStr = params.toString() ? `?${params.toString()}` : ''
  const response = await api.get<EstoqueSaldoItem[]>(`/estoque/saldos${queryStr}`)
  return response.data
}

export async function getMovimentacoesEstoque(
  filtros?: FiltrosMovimentacaoEstoque
): Promise<MovimentacaoEstoqueItem[]> {
  const params = new URLSearchParams()
  if (filtros?.obraId) params.append('obraId', filtros.obraId)
  if (filtros?.localId) params.append('localId', filtros.localId)
  if (filtros?.materialId) params.append('materialId', filtros.materialId)
  if (filtros?.tipo) params.append('tipo', filtros.tipo)
  if (filtros?.limite) params.append('limite', String(filtros.limite))

  const queryStr = params.toString() ? `?${params.toString()}` : ''
  const response = await api.get<MovimentacaoEstoqueItem[]>(`/estoque/movimentacoes${queryStr}`)
  return response.data
}

export async function registrarMovimentacaoEstoque(dados: RegistrarMovimentacaoInput): Promise<{
  movimentacao: MovimentacaoEstoqueItem
  saldo: EstoqueSaldoItem
}> {
  const response = await api.post<{
    movimentacao: MovimentacaoEstoqueItem
    saldo: EstoqueSaldoItem
  }>('/estoque/movimentacoes', dados)
  return response.data
}

// ----------------------------------------------------
// ORCAMENTO E LIMITES DE MATERIAL POR OBRA (T13)
// ----------------------------------------------------

export async function getLimitesOrcamentoObra(obraId?: string): Promise<LimiteOrcamentoObra[]> {
  const params = new URLSearchParams()
  if (obraId) params.append('obraId', obraId)
  const queryStr = params.toString() ? `?${params.toString()}` : ''
  const response = await api.get<LimiteOrcamentoObra[]>(`/orcamentos-obra/limites${queryStr}`)
  return response.data
}

export async function getOrcamentosObra(filtros?: FiltrosOrcamentoObra): Promise<PainelOrcamentoObraResponse> {
  const params = new URLSearchParams()
  if (filtros?.obraId) params.append('obraId', filtros.obraId)
  if (filtros?.materialId) params.append('materialId', filtros.materialId)
  if (filtros?.status) params.append('status', filtros.status)
  if (filtros?.busca) params.append('busca', filtros.busca)
  const queryStr = params.toString() ? `?${params.toString()}` : ''
  const response = await api.get<PainelOrcamentoObraResponse>(`/orcamentos-obra${queryStr}`)
  return response.data
}

export async function createOrcamentoObra(dados: CriarOrcamentoObraInput): Promise<OrcamentoObraItem> {
  const response = await api.post<OrcamentoObraItem>('/orcamentos-obra', dados)
  return response.data
}

export async function updateOrcamentoObra(
  id: string,
  dados: AtualizarOrcamentoObraInput
): Promise<OrcamentoObraItem> {
  const response = await api.patch<OrcamentoObraItem>(`/orcamentos-obra/${id}`, dados)
  return response.data
}

export async function deleteOrcamentoObra(id: string): Promise<void> {
  await api.delete(`/orcamentos-obra/${id}`)
}
