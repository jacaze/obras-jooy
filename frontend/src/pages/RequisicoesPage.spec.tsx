import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RequisicoesPage } from './RequisicoesPage'
import * as apiClient from '../api/client'
import { AuthContext } from '../contexts/auth-context'
import type { Requisicao } from '../types/requisicao'

const mockEncarregado = {
  id: 'enc-id-01',
  nome: 'Marcos Encarregado',
  login: 'marcos',
  perfil: 'ENCARREGADO' as const,
  cargo: 'Mestre de Obras',
  ativo: true,
}

const mockObras = [
  { id: 'obra-1', codigo: 'OBRA-01', nome: 'Edificio Horizonte', cidade: 'Campo Grande', ativa: true, criadaEm: '2026-10-28T00:00:00Z' },
]

const mockAreas = [
  { id: 'area-1', obraId: 'obra-1', nome: 'Pavimento 02', ordem: 2, ativa: true, criadaEm: '2026-10-28T00:00:00Z' },
]

const mockMateriais = [
  {
    id: 'mat-1',
    codigo: 'CIM-01',
    descricao: 'Cimento Votoran Todas as Obras',
    categoriaId: 'cat-1',
    unidadeConsumoId: 'un-1',
    unidadeConsumo: { id: 'un-1', sigla: 'SC', descricao: 'Saco 50kg' },
    fatorConversao: 1,
    ativo: true,
  },
]

const mockFerramentas = [
  { id: 'fer-1', codigo: 'MAR-01', nome: 'Martelete Perfurador SDS', status: 'DISPONIVEL' as const, ativo: true },
]

const mockRequisicoes: Requisicao[] = [
  {
    id: 'req-1',
    numeroSequencial: 101,
    areaId: 'area-1',
    requisitanteId: 'enc-id-01',
    status: 'SOLICITADA',
    codigoRetirada: null,
    chaveIdempotencia: 'idemp-1',
    observacao: 'Para inicio do reboco',
    solicitadaEm: '2026-10-30T10:00:00Z',
    area: mockAreas[0] as any,
    requisitante: {
      id: 'enc-id-01',
      nome: 'Marcos Encarregado',
      login: 'marcos',
      cargo: { nome: 'Mestre de Obras' },
    },
    itens: [
      {
        id: 'item-1',
        requisicaoId: 'req-1',
        materialId: 'mat-1',
        quantidade: 10,
        material: mockMateriais[0] as any,
      },
    ],
  },
  {
    id: 'req-2',
    numeroSequencial: 102,
    areaId: 'area-1',
    requisitanteId: 'enc-id-01',
    status: 'PRONTA',
    codigoRetirada: 'RET-892',
    chaveIdempotencia: 'idemp-2',
    observacao: 'Ferramenta para perfuracao',
    solicitadaEm: '2026-10-30T11:00:00Z',
    area: mockAreas[0] as any,
    requisitante: {
      id: 'enc-id-01',
      nome: 'Marcos Encarregado',
      login: 'marcos',
      cargo: { nome: 'Mestre de Obras' },
    },
    itens: [
      {
        id: 'item-2',
        requisicaoId: 'req-2',
        ferramentaId: 'fer-1',
        quantidade: 1,
        ferramenta: mockFerramentas[0] as any,
      },
    ],
  },
]

function renderRequisicoesPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          usuario: mockEncarregado,
          token: 'token-encarregado',
          carregando: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <RequisicoesPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('RequisicoesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(apiClient, 'getRequisicoes').mockResolvedValue(mockRequisicoes)
    vi.spyOn(apiClient, 'getObras').mockResolvedValue(mockObras)
    vi.spyOn(apiClient, 'getAreasObra').mockResolvedValue(mockAreas)
    vi.spyOn(apiClient, 'getMateriais').mockResolvedValue(mockMateriais as any)
    vi.spyOn(apiClient, 'getFerramentas').mockResolvedValue(mockFerramentas as any)
  })

  it('deve listar as requisicoes com status e detalhes do pedido', async () => {
    renderRequisicoesPage()

    expect(screen.getByText('Minhas Requisicoes de Obra')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
      expect(screen.getByText('#102')).toBeInTheDocument()
      expect(screen.getByText('Aguardando Almoxarifado')).toBeInTheDocument()
      expect(screen.getByText('Pronta para Retirada')).toBeInTheDocument()
    })

    // Deve exibir o codigo de retirada em destaque na requisicao pronta
    expect(screen.getByText('RET-892')).toBeInTheDocument()
  })

  it('deve abrir modal de nova requisicao e submeter pedido', async () => {
    const createReqSpy = vi.spyOn(apiClient, 'createRequisicao').mockResolvedValue({
      id: 'req-nova',
      numeroSequencial: 103,
      areaId: 'area-1',
      requisitanteId: 'enc-id-01',
      status: 'SOLICITADA',
      solicitadaEm: '2026-10-30T12:00:00Z',
      area: mockAreas[0] as any,
      requisitante: mockRequisicoes[0].requisitante,
      itens: [],
    })

    renderRequisicoesPage()

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Nova Requisicao/i }))

    expect(screen.getByText('Nova Requisicao de Obra')).toBeInTheDocument()

    // Selecionar obra
    fireEvent.change(screen.getByDisplayValue('Selecione a obra...'), {
      target: { value: 'obra-1' },
    })

    await waitFor(() => {
      expect(screen.getByText('Pavimento 02')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('Selecione a area...'), {
      target: { value: 'area-1' },
    })

    // Selecionar material
    fireEvent.change(screen.getByDisplayValue('Selecione o material...'), {
      target: { value: 'mat-1' },
    })

    // Preencher observacao
    fireEvent.change(screen.getByPlaceholderText('ex: Urgente para a concretagem do bloco norte'), {
      target: { value: 'Material para inicio da alvenaria' },
    })

    const btnEnviar = screen.getByRole('button', { name: /Enviar Requisicao/i })
    fireEvent.click(btnEnviar)

    await waitFor(() => {
      expect(createReqSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          areaId: 'area-1',
          observacao: 'Material para inicio da alvenaria',
          itens: [
            expect.objectContaining({
              materialId: 'mat-1',
              quantidade: 1,
            }),
          ],
        })
      )
    })
  })

  it('deve permitir cancelar uma requisicao no status SOLICITADA', async () => {
    const cancelarSpy = vi.spyOn(apiClient, 'cancelarRequisicao').mockResolvedValue({
      id: 'req-1',
      status: 'CANCELADA',
    })

    window.confirm = vi.fn().mockReturnValue(true)

    renderRequisicoesPage()

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    const btnCancelar = screen.getByRole('button', { name: 'Cancelar Requisicao' })
    fireEvent.click(btnCancelar)

    await waitFor(() => {
      expect(cancelarSpy).toHaveBeenCalledWith('req-1')
    })
  })
})
