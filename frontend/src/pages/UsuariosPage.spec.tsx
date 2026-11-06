import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { UsuariosPage } from './UsuariosPage'
import * as apiClient from '../api/client'
import { AuthContext } from '../contexts/auth-context'

const mockAdmin = {
  id: 'admin-id',
  nome: 'Admin Master',
  login: 'admin',
  perfil: 'ADMIN' as const,
  cargo: 'Engenheiro Chefe',
  ativo: true,
}

const mockCargos = [
  { id: 'cargo-1', nome: 'Almoxarife', ativo: true, criadoEm: '2026-10-28T00:00:00Z' },
  { id: 'cargo-2', nome: 'Engenheiro Residente', ativo: true, criadoEm: '2026-10-28T00:00:00Z' },
]

const mockUsuarios = [
  {
    id: 'user-1',
    nome: 'Carlos Almoxarife',
    login: 'carlos',
    perfil: 'ALMOXARIFE' as const,
    ativo: true,
    cargoId: 'cargo-1',
    cargo: mockCargos[0],
    criadoEm: '2026-10-28T00:00:00Z',
  },
]

function renderUsuariosPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          usuario: mockAdmin,
          token: 'token-admin',
          carregando: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <UsuariosPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('UsuariosPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(apiClient, 'getUsuarios').mockResolvedValue(mockUsuarios)
    vi.spyOn(apiClient, 'getCargos').mockResolvedValue(mockCargos)
  })

  it('deve listar os usuarios e cargos carregados', async () => {
    renderUsuariosPage()

    expect(screen.getByText('Painel Administrativo')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Carlos Almoxarife')).toBeInTheDocument()
      expect(screen.getByText('carlos')).toBeInTheDocument()
    })
  })

  it('deve abrir modal de criacao de usuario e permitir cadastro', async () => {
    const createUsuarioSpy = vi.spyOn(apiClient, 'createUsuario').mockResolvedValue({
      id: 'user-2',
      nome: 'Mariana Engenheira',
      login: 'mariana',
      perfil: 'ALMOXARIFE',
      cargoId: 'cargo-2',
      ativo: true,
      criadoEm: '2026-10-28T00:00:00Z',
    })

    renderUsuariosPage()

    await waitFor(() => {
      expect(screen.getByText('Carlos Almoxarife')).toBeInTheDocument()
    })

    const btnNovo = screen.getByRole('button', { name: /\+ Novo Usuario/i })
    fireEvent.click(btnNovo)

    expect(screen.getByText('Cadastrar Novo Usuario')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('ex: Carlos Alberto de Souza'), {
      target: { value: 'Mariana Engenheira' },
    })
    fireEvent.change(screen.getByPlaceholderText('ex: carlos.souza'), {
      target: { value: 'mariana' },
    })
    fireEvent.change(screen.getByPlaceholderText('Defina a senha inicial'), {
      target: { value: 'Mariana@123' },
    })

    // Aguardar e selecionar cargo existente
    await waitFor(() => {
      expect(screen.getByText('Engenheiro Residente')).toBeInTheDocument()
    })

    const selectCargo = screen.getByDisplayValue('Selecione o cargo...')
    fireEvent.change(selectCargo, { target: { value: 'cargo-2' } })

    const formUsuario = screen.getByRole('button', { name: 'Salvar Usuario' }).closest('form')!
    fireEvent.submit(formUsuario)

    await waitFor(() => {
      expect(createUsuarioSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: 'Mariana Engenheira',
          login: 'mariana',
          senha: 'Mariana@123',
          cargoId: 'cargo-2',
        }),
        expect.anything()
      )
    })
  })

  it('deve abrir modal de novo cargo inline ao clicar no botao', async () => {
    const createCargoSpy = vi.spyOn(apiClient, 'createCargo').mockResolvedValue({
      id: 'cargo-3',
      nome: 'Tecnico em Seguranca',
      ativo: true,
      criadoEm: '2026-10-28T00:00:00Z',
    })

    renderUsuariosPage()

    await waitFor(() => {
      expect(screen.getByText('Carlos Almoxarife')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Novo Usuario/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ Novo Cargo/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /\+ Novo Cargo/i }))

    expect(screen.getByText('Cadastrar Novo Cargo')).toBeInTheDocument()

    const inputCargo = screen.getByPlaceholderText('ex: Mestre de Obras')
    fireEvent.change(inputCargo, {
      target: { value: 'Tecnico em Seguranca' },
    })

    const formCargo = inputCargo.closest('form')!
    fireEvent.submit(formCargo)

    await waitFor(() => {
      expect(createCargoSpy).toHaveBeenCalledWith('Tecnico em Seguranca', expect.anything())
    })
  })

  it('deve permitir resetar a senha de um usuario', async () => {
    const resetSpy = vi.spyOn(apiClient, 'resetarSenhaUsuario').mockResolvedValue({
      mensagem: 'Senha atualizada com sucesso',
    })

    renderUsuariosPage()

    await waitFor(() => {
      expect(screen.getByText('Carlos Almoxarife')).toBeInTheDocument()
    })

    const btnReset = screen.getByRole('button', { name: /Resetar Senha/i })
    fireEvent.click(btnReset)

    expect(screen.getByText(/Resetar Senha de Acesso/i)).toBeInTheDocument()

    const inputReset = screen.getByPlaceholderText('Nova senha temporaria')
    fireEvent.change(inputReset, {
      target: { value: 'NovaSenha@99' },
    })

    const formReset = inputReset.closest('form')!
    fireEvent.submit(formReset)

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith('user-1', 'NovaSenha@99')
    })
  })

  it('deve alternar para a aba de cargos e permitir desativar cargo', async () => {
    const toggleCargoSpy = vi.spyOn(apiClient, 'toggleCargoSituacao').mockResolvedValue({
      id: 'cargo-1',
      nome: 'Almoxarife',
      ativo: false,
      criadoEm: '2026-10-28T00:00:00Z',
    })

    renderUsuariosPage()

    await waitFor(() => {
      expect(screen.getByText('Carlos Almoxarife')).toBeInTheDocument()
    })

    const abaCargos = screen.getByRole('button', { name: /Gerenciamento de Cargos/i })
    fireEvent.click(abaCargos)

    await waitFor(() => {
      expect(screen.getByText('Almoxarife')).toBeInTheDocument()
    })

    const btnDesativarCargo = screen.getAllByRole('button', { name: /Desativar Cargo/i })[0]
    fireEvent.click(btnDesativarCargo)

    await waitFor(() => {
      expect(toggleCargoSpy).toHaveBeenCalledWith('cargo-1', false)
    })
  })

  it('deve abrir modal de edicao de usuario e atualizar dados com sucesso', async () => {
    const updateUsuarioSpy = vi.spyOn(apiClient, 'updateUsuario').mockResolvedValue({
      id: 'user-1',
      nome: 'Carlos Silva Atualizado',
      login: 'carlos.silva',
      perfil: 'ADMIN',
      cargoId: 'cargo-2',
      ativo: true,
      cargo: mockCargos[1],
      criadoEm: '2026-10-28T00:00:00Z',
    })

    renderUsuariosPage()

    await waitFor(() => {
      expect(screen.getByText('Carlos Almoxarife')).toBeInTheDocument()
    })

    const btnEditar = screen.getByRole('button', { name: 'Editar' })
    fireEvent.click(btnEditar)

    expect(screen.getByText('Editar Dados do Usuario')).toBeInTheDocument()

    const inputNome = screen.getByDisplayValue('Carlos Almoxarife')
    fireEvent.change(inputNome, { target: { value: 'Carlos Silva Atualizado' } })

    const inputLogin = screen.getByDisplayValue('carlos')
    fireEvent.change(inputLogin, { target: { value: 'carlos.silva' } })

    const formEdit = screen.getByRole('button', { name: 'Salvar Alteracoes' }).closest('form')!
    fireEvent.submit(formEdit)

    await waitFor(() => {
      expect(updateUsuarioSpy).toHaveBeenCalledWith('user-1', {
        nome: 'Carlos Silva Atualizado',
        login: 'carlos.silva',
        perfil: 'ALMOXARIFE',
        cargoId: 'cargo-1',
        obraId: null,
      })
    })
  })

  it('deve abrir modal de confirmacao e excluir usuario com sucesso', async () => {
    const deleteUsuarioSpy = vi.spyOn(apiClient, 'deleteUsuario').mockResolvedValue(undefined)

    renderUsuariosPage()

    await waitFor(() => {
      expect(screen.getByText('Carlos Almoxarife')).toBeInTheDocument()
    })

    const btnExcluir = screen.getByRole('button', { name: 'Excluir' })
    fireEvent.click(btnExcluir)

    expect(screen.getByText('Confirmar Exclusao de Usuario')).toBeInTheDocument()
    expect(screen.getByText(/Regra de integridade:/i)).toBeInTheDocument()

    const btnConfirmar = screen.getByRole('button', { name: 'Confirmar Exclusao' })
    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(deleteUsuarioSpy).toHaveBeenCalledWith('user-1')
    })
  })

  it('deve exibir mensagem de erro clara quando a exclusao for bloqueada por ferramentas ou solicitacoes vinculadas (409 Conflict)', async () => {
    vi.spyOn(apiClient, 'deleteUsuario').mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          erro: 'Nao e possivel excluir o usuario pois ele possui historico de ferramentas vinculadas. Desative o usuario caso ele nao deva mais acessar o sistema.',
        },
      },
    })

    renderUsuariosPage()

    await waitFor(() => {
      expect(screen.getByText('Carlos Almoxarife')).toBeInTheDocument()
    })

    const btnExcluir = screen.getByRole('button', { name: 'Excluir' })
    fireEvent.click(btnExcluir)

    const btnConfirmar = screen.getByRole('button', { name: 'Confirmar Exclusao' })
    fireEvent.click(btnConfirmar)

    await waitFor(() => {
      expect(
        screen.getByText(/Nao e possivel excluir o usuario pois ele possui historico de ferramentas vinculadas/i)
      ).toBeInTheDocument()
    })
  })

  it('deve desabilitar os botoes de desativar e excluir para o proprio usuario logado', async () => {
    vi.spyOn(apiClient, 'getUsuarios').mockResolvedValue([
      {
        id: mockAdmin.id,
        nome: mockAdmin.nome,
        login: mockAdmin.login,
        perfil: mockAdmin.perfil,
        ativo: true,
        cargoId: 'cargo-1',
        cargo: mockCargos[0],
        criadoEm: '2026-10-28T00:00:00Z',
      },
    ])

    renderUsuariosPage()

    await waitFor(() => {
      expect(screen.getByText('Admin Master')).toBeInTheDocument()
      expect(screen.getByText('(Voce)')).toBeInTheDocument()
    })

    const btnDesativar = screen.getByRole('button', { name: 'Desativar' })
    expect(btnDesativar).toBeDisabled()

    const btnExcluir = screen.getByRole('button', { name: 'Excluir' })
    expect(btnExcluir).toBeDisabled()
  })
})
