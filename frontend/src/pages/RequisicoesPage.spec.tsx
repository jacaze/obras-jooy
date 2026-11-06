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

const mockAlmoxarife = {
  id: 'almox-id-01',
  nome: 'Maria Almoxarife',
  login: 'maria',
  perfil: 'ALMOXARIFE' as const,
  cargo: 'Almoxarife',
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
    exportadaSienge: false,
    area: { ...mockAreas[0], obra: mockObras[0] } as any,
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
        quantidadeEntregue: null,
        material: mockMateriais[0] as any,
      },
    ],
  },
  {
    id: 'req-2',
    numeroSequencial: 102,
    areaId: 'area-1',
    requisitanteId: 'enc-id-01',
    status: 'ATENDIDA',
    codigoRetirada: null,
    chaveIdempotencia: 'idemp-2',
    observacao: 'Concretagem pilar',
    retiradoPor: 'Carlos Pedreiro',
    atendidoEm: '2026-10-30T14:00:00Z',
    exportadaSienge: false,
    solicitadaEm: '2026-10-30T11:00:00Z',
    area: { ...mockAreas[0], obra: mockObras[0] } as any,
    requisitante: {
      id: 'enc-id-01',
      nome: 'Marcos Encarregado',
      login: 'marcos',
      cargo: { nome: 'Mestre de Obras' },
    },
    atendidoPor: {
      id: 'almox-id-01',
      nome: 'Maria Almoxarife',
      login: 'maria',
    },
    itens: [
      {
        id: 'item-2',
        requisicaoId: 'req-2',
        materialId: 'mat-1',
        quantidade: 10,
        quantidadeEntregue: 6,
        material: mockMateriais[0] as any,
      },
    ],
  },
]

function renderRequisicoesPage(usuarioLogado: any = mockEncarregado) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          usuario: usuarioLogado,
          token: 'token-teste',
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
    vi.spyOn(apiClient, 'getSaldosEstoque').mockResolvedValue([
      {
        localId: 'local-1',
        materialId: 'mat-1',
        quantidade: 50,
        reservado: 0,
        disponivel: 50,
        material: mockMateriais[0],
      } as any,
    ])
    vi.spyOn(apiClient, 'getLimitesOrcamentoObra').mockResolvedValue([
      {
        id: 'orc-1',
        obraId: 'obra-1',
        materialId: 'mat-1',
        quantidadeOrcada: 200,
      },
    ])
  })

  it('deve listar as requisicoes do Encarregado com historico de solicitada vs entregue e ocultar opcoes de almoxarife', async () => {
    renderRequisicoesPage(mockEncarregado)

    expect(screen.getByText('Minhas Requisicoes de Obra')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
      expect(screen.getByText('#102')).toBeInTheDocument()
      expect(screen.getByText('Pendente (Aguardando Almoxarifado)')).toBeInTheDocument()
      expect(screen.getByText('Atendida / Entregue')).toBeInTheDocument()
      expect(screen.getByText('Carlos Pedreiro')).toBeInTheDocument()
      expect(screen.getByText(/Solicitado: 10 SC \| Entregue: 6 SC/i)).toBeInTheDocument()
    })

    // Encarregado nao deve ver botao de exportar SIENGE nem botao de Atender
    expect(screen.queryByText(/Exportar para SIENGE/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Atender \/ Entregar Material/i)).not.toBeInTheDocument()

    // Testar filtro rapido "Ocultar ja atendidas"
    const chkOcultar = screen.getByLabelText(/Ocultar ja atendidas/i)
    fireEvent.click(chkOcultar)

    expect(screen.getByText('#101')).toBeInTheDocument()
    expect(screen.queryByText('#102')).not.toBeInTheDocument()
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

    renderRequisicoesPage(mockEncarregado)

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Nova Requisicao/i }))

    expect(screen.getByText('Nova Requisicao de Obra')).toBeInTheDocument()

    // Com apenas 1 obra mockada ou obra fixa, o elemento ja fixa a obra
    expect(screen.getAllByText(/OBRA-01 - Edificio Horizonte/i).length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('Pavimento 02')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('Selecione a area...'), {
      target: { value: 'area-1' },
    })

    // Selecionar material pelo SeletorItemPesquisavel (puxando itens em estoque)
    const inputBuscaMaterial = screen.getByPlaceholderText('Digite codigo ou descricao do material em estoque...')
    fireEvent.change(inputBuscaMaterial, { target: { value: 'CIM' } })

    await waitFor(() => {
      expect(screen.getByText('Cimento Votoran Todas as Obras')).toBeInTheDocument()
      expect(screen.getByText(/Disp: 50 \| Limite: 200/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cimento Votoran Todas as Obras'))

    expect(screen.getByText(/\[Disp: 50 \| Limite: 200\]/i)).toBeInTheDocument()

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

  it('deve permitir que ALMOXARIFE atenda uma requisicao ajustando quantidade entregue e informando quem retirou', async () => {
    const atenderSpy = vi.spyOn(apiClient, 'atenderRequisicao').mockResolvedValue({
      ...mockRequisicoes[0],
      status: 'ATENDIDA',
      retiradoPor: 'Jose da Silva - Pedreiro',
    })

    renderRequisicoesPage(mockAlmoxarife)

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Atender \/ Entregar Material/i }))

    expect(screen.getByText('Atender Requisicao #101')).toBeInTheDocument()

    // Ajustar quantidade entregue de 10 para 8
    const inputQtdEntregue = screen.getByLabelText(/Quantidade entregue para Cimento/i)
    fireEvent.change(inputQtdEntregue, { target: { value: '8' } })

    // Preencher quem retirou na obra
    const inputRetiradoPor = screen.getByPlaceholderText('ex: Jose da Silva - Pedreiro')
    fireEvent.change(inputRetiradoPor, { target: { value: 'Jose da Silva - Pedreiro' } })

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Entrega e Baixar Estoque/i }))

    await waitFor(() => {
      expect(atenderSpy).toHaveBeenCalledWith('req-1', {
        retiradoPor: 'Jose da Silva - Pedreiro',
        itens: [
          {
            itemId: 'item-1',
            quantidadeEntregue: 8,
          },
        ],
      })
    })
  })

  it('deve permitir que ALMOXARIFE exporte requisicoes atendidas para CSV do SIENGE', async () => {
    const exportarSpy = vi.spyOn(apiClient, 'exportarRequisicoesSienge').mockResolvedValue({
      csv: '\uFEFFNUMERO_REQUISICAO;CODIGO_OBRA\r\nREQ-102;OBRA-01',
      nomeArquivo: 'sienge-requisicoes-2026-10-31.csv',
      totalRequisicoes: 1,
      requisicaoIds: ['req-2'],
      exportadaEm: '2026-10-31T20:00:00Z',
    })

    renderRequisicoesPage(mockAlmoxarife)

    await waitFor(() => {
      expect(screen.getByText('Pendente Exportacao SIENGE')).toBeInTheDocument()
    })

    const btnExportar = screen.getByRole('button', { name: /Exportar para SIENGE \(CSV\)/i })
    fireEvent.click(btnExportar)

    await waitFor(() => {
      expect(exportarSpy).toHaveBeenCalledWith({ incluirJaExportadas: false })
      expect(screen.getByText(/sienge-requisicoes-2026-10-31\.csv gerado com sucesso/i)).toBeInTheDocument()
    })
  })

  it('deve permitir cancelar uma requisicao no status SOLICITADA', async () => {
    const cancelarSpy = vi.spyOn(apiClient, 'cancelarRequisicao').mockResolvedValue({
      id: 'req-1',
      status: 'CANCELADA',
    })

    window.confirm = vi.fn().mockReturnValue(true)

    renderRequisicoesPage(mockEncarregado)

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    const btnCancelar = screen.getByRole('button', { name: 'Cancelar Requisicao' })
    fireEvent.click(btnCancelar)

    await waitFor(() => {
      expect(cancelarSpy).toHaveBeenCalledWith('req-1')
    })
  })

  it('deve exibir alerta de estouro de orcamento da engenharia em tempo real no modal e aviso de saldo insuficiente', async () => {
    vi.spyOn(apiClient, 'getLimitesOrcamentoObra').mockResolvedValue([
      {
        id: 'orc-1',
        obraId: 'obra-1',
        materialId: 'mat-1',
        quantidadeOrcada: 30,
        quantidadeConsumida: 10,
        saldoOrcamento: 20,
      },
    ])

    renderRequisicoesPage(mockEncarregado)

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Nova Requisicao/i }))

    // Com apenas 1 obra mockada ou obra fixa, o elemento ja fixa a obra
    expect(screen.getAllByText(/OBRA-01 - Edificio Horizonte/i).length).toBeGreaterThan(0)

    await waitFor(() => {
      expect(screen.getByText('Pavimento 02')).toBeInTheDocument()
    })

    const inputBuscaMaterial = screen.getByPlaceholderText(
      'Digite codigo ou descricao do material em estoque...'
    )
    fireEvent.change(inputBuscaMaterial, { target: { value: 'CIM' } })

    await waitFor(() => {
      expect(screen.getByText('Cimento Votoran Todas as Obras')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Cimento Votoran Todas as Obras'))

    // Digitar 25 SC: saldo em estoque e 50 SC (ok), mas o saldo de orcamento restante e 20 SC (10 ja consumidos + 25 = 35 > 30 orcados)
    const inputQtd = screen.getByPlaceholderText('Qtd')
    fireEvent.change(inputQtd, { target: { value: '25' } })

    await waitFor(() => {
      expect(
        screen.getByText(/Alerta da Engenharia: Estouro de Orcamento Previsto/i)
      ).toBeInTheDocument()
    })

    // Digitar 60 SC: excede tambem o saldo fisico disponivel no estoque da obra (50 SC)
    fireEvent.change(inputQtd, { target: { value: '60' } })

    await waitFor(() => {
      expect(
        screen.getByText(/Saldo fisico insuficiente no estoque da obra/i)
      ).toBeInTheDocument()
    })
  })
})
