import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MateriaisPage } from './MateriaisPage'
import * as client from '../api/client'
import * as authHook from '../hooks/useAuth'

vi.mock('../api/client')
vi.mock('../hooks/useAuth')

const mockMateriais = [
  {
    id: 'mat-1',
    codigo: 'CIM-01',
    descricao: 'Cimento CP-II 50kg',
    categoriaId: 'cat-1',
    tipoControle: 'CONSUMO' as const,
    unidadeCompraId: 'un-sc',
    unidadeConsumoId: 'un-kg',
    fatorConversao: 50,
    ehKit: false,
    exigeTesteQualidade: true,
    ativo: true,
    criadoEm: '2026-10-29T10:00:00Z',
    categoria: { id: 'cat-1', nome: 'Alvenaria e Cimento', criadaEm: '' },
    unidadeCompra: { id: 'un-sc', sigla: 'SC', descricao: 'Saco', criadaEm: '' },
    unidadeConsumo: { id: 'un-kg', sigla: 'KG', descricao: 'Quilograma', criadaEm: '' },
  },
  {
    id: 'mat-2',
    codigo: 'MART-01',
    descricao: 'Martelete Rompedor 800W',
    categoriaId: 'cat-2',
    tipoControle: 'FERRAMENTA_PATRIMONIO' as const,
    unidadeCompraId: 'un-un',
    unidadeConsumoId: 'un-un',
    fatorConversao: 1,
    ehKit: false,
    exigeTesteQualidade: false,
    ativo: true,
    criadoEm: '2026-10-29T10:00:00Z',
    categoria: { id: 'cat-2', nome: 'Ferramentas Eletricas', criadaEm: '' },
    unidadeCompra: { id: 'un-un', sigla: 'UN', descricao: 'Unidade', criadaEm: '' },
    unidadeConsumo: { id: 'un-un', sigla: 'UN', descricao: 'Unidade', criadaEm: '' },
  },
]

const mockUnidades = [
  { id: 'un-sc', sigla: 'SC', descricao: 'Saco', criadaEm: '' },
  { id: 'un-kg', sigla: 'KG', descricao: 'Quilograma', criadaEm: '' },
  { id: 'un-un', sigla: 'UN', descricao: 'Unidade', criadaEm: '' },
]

const mockCategorias = [
  { id: 'cat-1', nome: 'Alvenaria e Cimento', criadaEm: '' },
  { id: 'cat-2', nome: 'Ferramentas Eletricas', criadaEm: '' },
]

describe('MateriaisPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    vi.mocked(authHook.useAuth).mockReturnValue({
      usuario: {
        id: 'usr-1',
        nome: 'Almoxarife Teste',
        login: 'almox',
        perfil: 'ALMOXARIFE',
        cargo: 'Almoxarife',
      },
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
    })

    vi.mocked(client.getMateriais).mockResolvedValue(mockMateriais)
    vi.mocked(client.getUnidadesMedida).mockResolvedValue(mockUnidades)
    vi.mocked(client.getCategoriasMaterial).mockResolvedValue(mockCategorias)
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MateriaisPage />
      </QueryClientProvider>
    )
  }

  it('deve listar materiais cadastrados com codigo, categoria e fator de conversao', async () => {
    renderComponent()

    expect(screen.getByText('Carregando catalogo de materiais...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Cimento CP-II 50kg')).toBeInTheDocument()
      expect(screen.getByText('CIM-01')).toBeInTheDocument()
      expect(screen.getByText('1 SC = 50 KG')).toBeInTheDocument()
      expect(screen.getByText('Martelete Rompedor 800W')).toBeInTheDocument()
      expect(screen.getAllByText('Ferramenta Patrimonial').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('deve permitir abrir modal de cadastro de material para ALMOXARIFE', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('+ Cadastrar Material')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ Cadastrar Material'))

    expect(screen.getByRole('heading', { name: 'Novo Material' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Codigo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Descricao Completa/i)).toBeInTheDocument()
  })

  it('deve submeter novo material com sucesso', async () => {
    vi.mocked(client.createMaterial).mockResolvedValueOnce({
      ...mockMateriais[0],
      id: 'mat-novo',
      codigo: 'ARE-01',
      descricao: 'Areia Media',
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('+ Cadastrar Material')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ Cadastrar Material'))

    fireEvent.change(screen.getByLabelText(/Codigo/i), { target: { value: 'ARE-01' } })
    fireEvent.change(screen.getByLabelText(/Descricao Completa/i), {
      target: { value: 'Areia Media' },
    })
    fireEvent.change(screen.getByLabelText(/Categoria \*/i), {
      target: { value: 'cat-1' },
    })
    fireEvent.change(screen.getByLabelText(/Unidade de Compra \*/i), {
      target: { value: 'un-sc' },
    })
    fireEvent.change(screen.getByLabelText(/Unidade de Estoque\/Uso \*/i), {
      target: { value: 'un-kg' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar Material' }))

    await waitFor(() => {
      expect(client.createMaterial).toHaveBeenCalled()
      expect(screen.getByText(/Material cadastrado com sucesso/i)).toBeInTheDocument()
    })
  })

  it('deve permitir desativar e reativar situacao de um material', async () => {
    vi.mocked(client.toggleMaterialSituacao).mockResolvedValueOnce({
      ...mockMateriais[0],
      ativo: false,
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Cimento CP-II 50kg')).toBeInTheDocument()
    })

    const botoesDesativar = screen.getAllByRole('button', { name: 'Desativar' })
    fireEvent.click(botoesDesativar[0])

    await waitFor(() => {
      expect(client.toggleMaterialSituacao).toHaveBeenCalledWith('mat-1', false)
      expect(screen.getByText(/Situacao do material alterada com sucesso/i)).toBeInTheDocument()
    })
  })

  it('nao deve exibir botoes de gerenciamento para perfis sem permissao (ex: MESTRE / ENCARREGADO)', async () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      usuario: {
        id: 'usr-2',
        nome: 'Encarregado',
        login: 'encarregado',
        perfil: 'ENCARREGADO',
        cargo: 'Encarregado',
      },
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Cimento CP-II 50kg')).toBeInTheDocument()
    })

    expect(screen.queryByText('+ Cadastrar Material')).not.toBeInTheDocument()
    expect(screen.queryByText('+ Nova Categoria')).not.toBeInTheDocument()
    expect(screen.queryByText('+ Nova Unidade')).not.toBeInTheDocument()
    expect(screen.queryByText('Editar')).not.toBeInTheDocument()
  })
})
