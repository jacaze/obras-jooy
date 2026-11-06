import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { EstoquePage } from './EstoquePage'
import * as apiClient from '../api/client'
import { AuthContext } from '../contexts/auth-context'

const mockAlmoxarife = {
  id: 'almox-id-01',
  nome: 'Maria Almoxarife',
  login: 'maria',
  perfil: 'ALMOXARIFE' as const,
  cargo: 'Almoxarife',
  ativo: true,
}

const mockObras = [
  {
    id: 'obra-1',
    codigo: 'OBRA-01',
    nome: 'Residencial Horizonte',
    cidade: 'Campo Grande',
    ativa: true,
    criadaEm: '2026-10-28T00:00:00Z',
  },
]

const mockLocais = [
  {
    id: 'local-1',
    obraId: 'obra-1',
    nome: 'Almoxarifado Central',
    ativo: true,
    criadoEm: '2026-10-28T00:00:00Z',
    obra: mockObras[0],
    _count: { saldos: 1, movimentacoes: 2 },
  },
]

const mockMateriais = [
  {
    id: 'mat-1',
    codigo: 'MAT-SIL-01',
    descricao: 'Silicone Tubo 280g',
    categoriaId: 'cat-1',
    categoria: { id: 'cat-1', nome: 'Quimicos e Vedacao', criadaEm: '2026-10-28T00:00:00Z' },
    unidadeCompraId: 'un-cx',
    unidadeConsumoId: 'un-un',
    unidadeCompra: { id: 'un-cx', sigla: 'CX', descricao: 'Caixa com 12', criadaEm: '2026-10-28T00:00:00Z' },
    unidadeConsumo: { id: 'un-un', sigla: 'UN', descricao: 'Unidade', criadaEm: '2026-10-28T00:00:00Z' },
    fatorConversao: 12,
    ehKit: false,
    exigeTesteQualidade: false,
    ativo: true,
    criadoEm: '2026-10-28T00:00:00Z',
  },
]

const mockSaldos = [
  {
    localId: 'local-1',
    materialId: 'mat-1',
    quantidade: 60,
    reservado: 10,
    disponivel: 50,
    versao: 2,
    atualizadoEm: '2026-10-30T10:00:00Z',
    local: {
      id: 'local-1',
      nome: 'Almoxarifado Central',
      ativo: true,
      obra: { id: 'obra-1', codigo: 'OBRA-01', nome: 'Residencial Horizonte' },
    },
    material: mockMateriais[0],
  },
]

const mockMovimentacoes = [
  {
    id: 'mov-1',
    localId: 'local-1',
    materialId: 'mat-1',
    tipo: 'ENTRADA_RECEB' as const,
    natureza: 'ENTRADA' as const,
    quantidade: 60,
    usuarioId: 'almox-id-01',
    observacao: 'Entrada NF 9012',
    ocorridaEm: '2026-10-30T09:00:00Z',
    registradaEm: '2026-10-30T09:00:00Z',
    local: {
      id: 'local-1',
      nome: 'Almoxarifado Central',
      obra: { id: 'obra-1', codigo: 'OBRA-01', nome: 'Residencial Horizonte' },
    },
    material: {
      id: 'mat-1',
      codigo: 'MAT-SIL-01',
      descricao: 'Silicone Tubo 280g',
      unidadeConsumo: { sigla: 'UN', descricao: 'Unidade' },
    },
    usuario: {
      id: 'almox-id-01',
      nome: 'Maria Almoxarife',
      login: 'maria',
    },
  },
]

function renderEstoquePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          usuario: mockAlmoxarife,
          token: 'token-almoxarife',
          carregando: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <EstoquePage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('EstoquePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(apiClient, 'getObras').mockResolvedValue(mockObras)
    vi.spyOn(apiClient, 'getLocaisEstoque').mockResolvedValue(mockLocais)
    vi.spyOn(apiClient, 'getMateriais').mockResolvedValue(mockMateriais)
    vi.spyOn(apiClient, 'getSaldosEstoque').mockResolvedValue(mockSaldos)
    vi.spyOn(apiClient, 'getMovimentacoesEstoque').mockResolvedValue(mockMovimentacoes)
    vi.spyOn(apiClient, 'getAreasObra').mockResolvedValue([])
  })

  it('deve listar saldos fisicos, reservados e disponiveis na aba principal', async () => {
    renderEstoquePage()

    expect(screen.getByText('Estoque Fisico e Livro-Razao (Kardex)')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('MAT-SIL-01')).toBeInTheDocument()
      expect(screen.getByText('Silicone Tubo 280g')).toBeInTheDocument()
      expect(screen.getByText('60 UN')).toBeInTheDocument()
      expect(screen.getByText('10 UN')).toBeInTheDocument()
      expect(screen.getByText('50 UN')).toBeInTheDocument()
    })
  })

  it('deve alternar para a aba Livro-Razao / Kardex e listar movimentacoes imutaveis', async () => {
    renderEstoquePage()

    await waitFor(() => {
      expect(screen.getByText('Silicone Tubo 280g')).toBeInTheDocument()
    })

    const abaKardex = screen.getByRole('tab', { name: /Livro-Razao \/ Kardex/i })
    fireEvent.click(abaKardex)

    await waitFor(() => {
      expect(screen.getByText('+ ENTRADA')).toBeInTheDocument()
      expect(screen.getByText('Entrada NF 9012')).toBeInTheDocument()
      expect(screen.getByText('+60 UN')).toBeInTheDocument()
    })
  })

  it('deve abrir modal de movimentacao e submeter entrada com conversao de unidade de compra', async () => {
    const registrarSpy = vi.spyOn(apiClient, 'registrarMovimentacaoEstoque').mockResolvedValue({
      movimentacao: mockMovimentacoes[0],
      saldo: mockSaldos[0],
    })

    renderEstoquePage()

    await waitFor(() => {
      expect(screen.getByText('Silicone Tubo 280g')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Lancar Movimentacao/i }))

    expect(screen.getByText('Lancar Movimentacao de Estoque')).toBeInTheDocument()

    // Com apenas 1 obra mockada ou obra fixa, o elemento exibe a obra fixada diretamente
    expect(screen.getAllByText(/OBRA-01 - Residencial Horizonte/i).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByDisplayValue('Selecione o material...'), {
      target: { value: 'mat-1' },
    })

    // Deve exibir opcao de conversao pela unidade de compra (CX)
    await waitFor(() => {
      expect(screen.getByText(/Converter entrada pela Unidade de Compra \(CX\)/i)).toBeInTheDocument()
    })

    const checkboxConversao = screen.getByRole('checkbox')
    fireEvent.click(checkboxConversao)

    const inputQtd = screen.getByDisplayValue('1')
    fireEvent.change(inputQtd, { target: { value: '5' } })

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Lancamento/i }))

    await waitFor(() => {
      expect(registrarSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          obraId: 'obra-1',
          localId: null,
          materialId: 'mat-1',
          tipo: 'ENTRADA_RECEB',
          quantidade: 5,
          usarUnidadeCompra: true,
        })
      )
    })
  })

  it('deve permitir cadastrar nova locacao de estoque e listar locacoes na aba Locacoes de Estoque', async () => {
    const createLocalSpy = vi.spyOn(apiClient, 'createLocalEstoque').mockResolvedValue({
      id: 'local-2',
      obraId: 'obra-1',
      nome: 'Deposito Bloco B',
      ativo: true,
      criadoEm: '2026-10-30T10:00:00Z',
    })

    renderEstoquePage()

    await waitFor(() => {
      expect(screen.getByText('Silicone Tubo 280g')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Nova Locacao \(Opcional\)/i }))

    expect(screen.getByText('Cadastrar Nova Locacao de Estoque')).toBeInTheDocument()

    // Com apenas 1 obra, ela ja vem selecionada por padrao
    fireEvent.change(screen.getByPlaceholderText('ex: Locacao 01 - Prateleira A'), {
      target: { value: 'Deposito Bloco B' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Salvar Locacao/i }))

    await waitFor(() => {
      expect(createLocalSpy).toHaveBeenCalledWith({
        obraId: 'obra-1',
        nome: 'Deposito Bloco B',
      })
    })
  })
})
