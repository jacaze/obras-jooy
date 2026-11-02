import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { OrcamentoObraPage } from './OrcamentoObraPage'
import * as apiClient from '../api/client'
import type { PainelOrcamentoObraResponse } from '../types/orcamento'

const mockObras = [
  {
    id: 'obra-1',
    codigo: 'OBRA-01',
    nome: 'Residencial Jooy',
    cidade: 'Campo Grande',
    ativa: true,
    criadaEm: '2026-10-28T00:00:00Z',
  },
]

const mockMateriais = [
  {
    id: 'mat-1',
    codigo: 'MAT-001',
    descricao: 'Cimento CP-II F 32 50kg',
    categoriaId: 'cat-1',
    unidadeConsumoId: 'un-1',
    unidadeConsumo: { id: 'un-1', sigla: 'SC', descricao: 'Saco 50kg' },
    fatorConversao: 1,
    ativo: true,
  },
  {
    id: 'mat-2',
    codigo: 'MAT-004',
    descricao: 'Luva de Vaqueta Mista',
    categoriaId: 'cat-1',
    unidadeConsumoId: 'un-2',
    unidadeConsumo: { id: 'un-2', sigla: 'PAR', descricao: 'Par' },
    fatorConversao: 1,
    ativo: true,
  },
]

const mockPainelOrcamento: PainelOrcamentoObraResponse = {
  resumo: {
    totalItensOrcados: 2,
    totalUltrapassados: 1,
    totalEmAtencao: 0,
    totalDentroDoLimite: 1,
  },
  itens: [
    {
      id: 'orc-1',
      obraId: 'obra-1',
      materialId: 'mat-1',
      quantidadeOrcada: 100,
      observacao: 'Meta estrutural',
      criadoEm: '2026-11-01T10:00:00Z',
      atualizadoEm: '2026-11-01T10:00:00Z',
      obra: {
        id: 'obra-1',
        codigo: 'OBRA-01',
        nome: 'Residencial Jooy',
        cidade: 'Campo Grande',
        ativa: true,
      },
      material: {
        id: 'mat-1',
        codigo: 'MAT-001',
        descricao: 'Cimento CP-II F 32 50kg',
        unidadeConsumo: { id: 'un-1', sigla: 'SC', descricao: 'Saco 50kg' },
        categoria: { id: 'cat-1', nome: 'Cimentos' },
      },
      quantidadeEntregue: 90,
      quantidadePendente: 35,
      quantidadeConsumida: 125,
      saldoOrcamento: 0,
      excedente: 25,
      percentualConsumido: 125,
      statusOrcamento: 'ULTRAPASSADO',
    },
    {
      id: 'orc-2',
      obraId: 'obra-1',
      materialId: 'mat-2',
      quantidadeOrcada: 200,
      observacao: 'EPI da obra',
      criadoEm: '2026-11-01T10:00:00Z',
      atualizadoEm: '2026-11-01T10:00:00Z',
      obra: {
        id: 'obra-1',
        codigo: 'OBRA-01',
        nome: 'Residencial Jooy',
        cidade: 'Campo Grande',
        ativa: true,
      },
      material: {
        id: 'mat-2',
        codigo: 'MAT-004',
        descricao: 'Luva de Vaqueta Mista',
        unidadeConsumo: { id: 'un-2', sigla: 'PAR', descricao: 'Par' },
        categoria: { id: 'cat-1', nome: 'EPIs' },
      },
      quantidadeEntregue: 40,
      quantidadePendente: 10,
      quantidadeConsumida: 50,
      saldoOrcamento: 150,
      excedente: 0,
      percentualConsumido: 25,
      statusOrcamento: 'DENTRO_DO_LIMITE',
    },
  ],
}

function renderOrcamentoObraPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <OrcamentoObraPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('OrcamentoObraPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(apiClient, 'getObras').mockResolvedValue(mockObras)
    vi.spyOn(apiClient, 'getMateriais').mockResolvedValue(mockMateriais as any)
    vi.spyOn(apiClient, 'getOrcamentosObra').mockResolvedValue(mockPainelOrcamento)
  })

  it('deve exibir indicadores, painel de estouro da Engenharia e grafico comparativo de consumo', async () => {
    renderOrcamentoObraPage()

    expect(screen.getByText('Controle de Orcamento por Obra')).toBeInTheDocument()

    await waitFor(() => {
      expect(
        screen.getByText(/Controle da Engenharia: Materiais com Limite Ultrapassado \(1\)/i)
      ).toBeInTheDocument()
      expect(
        screen.getByText('Grafico Comparativo: Limite Orcado vs. Consumo Realizado')
      ).toBeInTheDocument()
      expect(screen.getByText('Excedeu +25 SC')).toBeInTheDocument()
      expect(screen.getByText('Restam 150 PAR')).toBeInTheDocument()
    })
  })

  it('deve abrir modal e cadastrar um novo limite de material para a obra', async () => {
    const createSpy = vi
      .spyOn(apiClient, 'createOrcamentoObra')
      .mockResolvedValue(mockPainelOrcamento.itens[1])

    renderOrcamentoObraPage()

    await waitFor(() => {
      expect(screen.getByText('Excedeu +25 SC')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Definir Limite de Material/i }))

    expect(screen.getByText('Definir Limite de Material por Obra')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Selecionar obra para orcamento'), {
      target: { value: 'obra-1' },
    })

    const inputMaterial = screen.getByPlaceholderText('Digite o codigo ou descricao do material...')
    fireEvent.change(inputMaterial, { target: { value: 'MAT-004' } })

    await waitFor(() => {
      expect(screen.getByText('Luva de Vaqueta Mista')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Luva de Vaqueta Mista'))

    fireEvent.change(screen.getByLabelText('Quantidade limite orcada'), {
      target: { value: '250' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Salvar Limite/i }))

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        obraId: 'obra-1',
        materialId: 'mat-2',
        quantidadeOrcada: 250,
        observacao: undefined,
      })
    })
  })
})
