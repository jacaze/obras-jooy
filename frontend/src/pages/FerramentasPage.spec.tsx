import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { FerramentasPage } from './FerramentasPage'
import * as client from '../api/client'
import * as authHook from '../hooks/useAuth'

vi.mock('../api/client')
vi.mock('../hooks/useAuth')

const mockFerramentas = [
  {
    id: 'fer-1',
    codigo: 'MART-01',
    nome: 'Martelete Rompedor 800W',
    status: 'DISPONIVEL' as const,
    emprestadoParaId: null,
    ativo: true,
    criadaEm: '2026-10-29T10:00:00Z',
    emprestadoPara: null,
  },
  {
    id: 'fer-2',
    codigo: 'SERRA-01',
    nome: 'Serra Circular Manual',
    status: 'EMPRESTADO' as const,
    emprestadoParaId: 'usr-mestre',
    ativo: true,
    criadaEm: '2026-10-29T10:00:00Z',
    emprestadoPara: {
      id: 'usr-mestre',
      nome: 'Carlos Mestre',
      login: 'carlos.mestre',
      perfil: 'ENCARREGADO',
    },
  },
]

const mockUsuarios = [
  {
    id: 'usr-mestre',
    nome: 'Carlos Mestre',
    login: 'carlos.mestre',
    perfil: 'ENCARREGADO' as const,
    cargoId: 'cargo-1',
    ativo: true,
    criadoEm: '',
    cargo: { id: 'cargo-1', nome: 'Mestre de Obras' },
  },
]

describe('FerramentasPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
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

    vi.mocked(client.getFerramentas).mockResolvedValue(mockFerramentas)
    vi.mocked(client.getUsuarios).mockResolvedValue(mockUsuarios as any)
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <FerramentasPage />
      </QueryClientProvider>
    )
  }

  it('deve listar ferramentas com codigo, status e solicitante', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Martelete Rompedor 800W')).toBeInTheDocument()
      expect(screen.getByText('MART-01')).toBeInTheDocument()
      expect(screen.getAllByText('Disponível').length).toBeGreaterThanOrEqual(1)

      expect(screen.getByText('Serra Circular Manual')).toBeInTheDocument()
      expect(screen.getAllByText('Emprestado').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Carlos Mestre')).toBeInTheDocument()
    })
  })

  it('deve permitir abrir modal e cadastrar nova ferramenta', async () => {
    vi.mocked(client.createFerramenta).mockResolvedValueOnce({
      id: 'fer-3',
      codigo: 'NIV-01',
      nome: 'Nivel Laser',
      status: 'DISPONIVEL',
      ativo: true,
      criadaEm: '',
      emprestadoPara: null,
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('+ Nova Ferramenta')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ Nova Ferramenta'))

    expect(screen.getByRole('heading', { name: 'Nova Ferramenta' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Código \/ Identificação/i), {
      target: { value: 'NIV-01' },
    })
    fireEvent.change(screen.getByLabelText(/Nome da Ferramenta/i), {
      target: { value: 'Nivel Laser' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Ferramenta' }))

    await waitFor(() => {
      expect(client.createFerramenta).toHaveBeenCalledWith({
        codigo: 'NIV-01',
        nome: 'Nivel Laser',
      })
    })
  })

  it('deve permitir abrir modal de edicao de ferramenta', async () => {
    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Martelete Rompedor 800W')).toBeInTheDocument()
    })

    const botoesEditar = screen.getAllByRole('button', { name: 'Editar' })
    fireEvent.click(botoesEditar[0])

    expect(screen.getByRole('heading', { name: /Editar Ferramenta/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Martelete Rompedor 800W')).toBeInTheDocument()
  })

  it('deve permitir registrar o emprestimo de uma ferramenta disponivel para um usuario ativo exigindo flag de teste na saida', async () => {
    vi.mocked(client.registrarEmprestimoFerramenta).mockResolvedValueOnce({
      ...mockFerramentas[0],
      status: 'EMPRESTADO',
      emprestadoParaId: 'usr-mestre',
      emprestadoPara: mockFerramentas[1].emprestadoPara,
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Martelete Rompedor 800W')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Emprestar' }))

    expect(
      screen.getByRole('heading', { name: /Registrar Emprestimo de Ferramenta/i })
    ).toBeInTheDocument()

    const selectUsuario = screen.getByLabelText(/Usuario Solicitante/i)
    fireEvent.change(selectUsuario, { target: { value: 'usr-mestre' } })

    const btnConfirmar = screen.getByRole('button', { name: /Confirmar Emprestimo/i })
    expect(btnConfirmar).toBeDisabled()

    const checkboxTesteSaida = screen.getByLabelText(/Ferramenta testada na entrega/i)
    fireEvent.click(checkboxTesteSaida)
    expect(btnConfirmar).not.toBeDisabled()

    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(client.registrarEmprestimoFerramenta).toHaveBeenCalledWith('fer-1', {
        usuarioId: 'usr-mestre',
        areaId: null,
        testadoNaSaida: true,
        previsaoDevolucao: null,
        observacaoSaida: null,
      })
    })
  })

  it('deve permitir registrar a devolucao de uma ferramenta emprestada exigindo flag de teste no retorno e informando se houve defeito', async () => {
    vi.mocked(client.registrarDevolucaoFerramenta).mockResolvedValueOnce({
      ...mockFerramentas[1],
      status: 'COM_DEFEITO',
      emprestadoParaId: null,
      emprestadoPara: null,
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Serra Circular Manual')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Devolver' }))

    expect(
      screen.getByRole('heading', { name: /Registrar Devolucao de Ferramenta/i })
    ).toBeInTheDocument()

    const btnConfirmarDev = screen.getByRole('button', { name: /Confirmar Devolucao/i })
    expect(btnConfirmarDev).toBeDisabled()

    const checkboxTesteRetorno = screen.getByLabelText(/Ferramenta testada no retorno/i)
    fireEvent.click(checkboxTesteRetorno)
    expect(btnConfirmarDev).not.toBeDisabled()

    const radioComDefeito = screen.getByLabelText(/Devolvida com defeito \/ avaria/i)
    fireEvent.click(radioComDefeito)

    fireEvent.click(btnConfirmarDev)

    await waitFor(() => {
      expect(client.registrarDevolucaoFerramenta).toHaveBeenCalledWith('fer-2', {
        testadoNoRetorno: true,
        comDefeito: true,
        observacaoDevolucao: null,
      })
    })
  })

  it('nao deve exibir botoes de Emprestar ou Devolver para perfil ENGENHARIA (exclusivo ALMOXARIFE e ADMIN)', async () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      usuario: {
        id: 'usr-eng',
        nome: 'Paula Engenharia',
        login: 'eng.paula',
        perfil: 'ENGENHARIA',
        cargo: 'Engenheira Civil',
      },
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Martelete Rompedor 800W')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Emprestar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Devolver' })).not.toBeInTheDocument()
  })

  it('deve permitir liberar ferramenta com defeito de volta para disponivel', async () => {
    vi.mocked(client.getFerramentas).mockResolvedValueOnce([
      ...mockFerramentas,
      {
        id: 'fer-3',
        codigo: 'BET-01',
        nome: 'Betoneira 400L',
        status: 'COM_DEFEITO',
        emprestadoParaId: null,
        ativo: true,
        criadaEm: '2026-10-29T10:00:00Z',
        emprestadoPara: null,
      },
    ])
    vi.mocked(client.updateFerramenta).mockResolvedValueOnce({
      id: 'fer-3',
      codigo: 'BET-01',
      nome: 'Betoneira 400L',
      status: 'DISPONIVEL',
      emprestadoParaId: null,
      ativo: true,
      criadaEm: '2026-10-29T10:00:00Z',
      emprestadoPara: null,
    })

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Betoneira 400L')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Liberar Conserto/i }))

    await waitFor(() => {
      expect(client.updateFerramenta).toHaveBeenCalledWith('fer-3', { status: 'DISPONIVEL' })
    })
  })
})
