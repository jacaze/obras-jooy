import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { ObrasPage } from './ObrasPage'
import * as apiClient from '../api/client'
import { AuthContext } from '../contexts/auth-context'
import type { UsuarioAuth } from '../types/auth'

const mockEngenheiro: UsuarioAuth = {
  id: 'eng-1',
  nome: 'Carlos Engenheiro',
  login: 'eng.carlos',
  perfil: 'ENGENHARIA',
  cargo: 'Engenheiro Residente',
}

const mockAlmoxarife: UsuarioAuth = {
  id: 'almox-1',
  nome: 'Joao Almoxarife',
  login: 'joao.almox',
  perfil: 'ALMOXARIFE',
  cargo: 'Almoxarife',
}

const mockAdmin: UsuarioAuth = {
  id: 'admin-1',
  nome: 'Administrador Master',
  login: 'admin',
  perfil: 'ADMIN',
  cargo: 'Engenheiro Chefe',
}

const mockObras = [
  {
    id: 'obra-1',
    codigo: 'JOOY-01',
    nome: 'Residencial Jooy Reserva',
    cidade: 'Campo Grande',
    ativa: true,
    criadaEm: '2026-10-28T00:00:00Z',
    _count: { areas: 3 },
  },
]

const mockAreas = [
  { id: 'area-1', obraId: 'obra-1', nome: 'Subsolo 01', ordem: -1, ativa: true, criadaEm: '2026-10-28T00:00:00Z' },
  { id: 'area-2', obraId: 'obra-1', nome: 'Terreo / Acesso', ordem: 0, ativa: true, criadaEm: '2026-10-28T00:00:00Z' },
  { id: 'area-3', obraId: 'obra-1', nome: '1o Pavimento', ordem: 1, ativa: true, criadaEm: '2026-10-28T00:00:00Z' },
]

function renderObrasPage(usuarioLogado: UsuarioAuth = mockEngenheiro) {
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
          <ObrasPage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('ObrasPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(apiClient, 'getObras').mockResolvedValue(mockObras)
    vi.spyOn(apiClient, 'getAreasObra').mockResolvedValue(mockAreas)
  })

  it('deve listar dados da obra selecionada e seus pavimentos/areas', async () => {
    renderObrasPage(mockEngenheiro)

    expect(screen.getByText('Obras e Pavimentos')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('JOOY-01')).toBeInTheDocument()
      expect(screen.getByText('Residencial Jooy Reserva')).toBeInTheDocument()
      expect(screen.getByText('Subsolo 01')).toBeInTheDocument()
      expect(screen.getByText('Terreo / Acesso')).toBeInTheDocument()
      expect(screen.getByText('1o Pavimento')).toBeInTheDocument()
    })
  })

  it('deve permitir que perfil ENGENHARIA cadastre nova area na obra', async () => {
    const createAreaSpy = vi.spyOn(apiClient, 'createAreaObra').mockResolvedValue({
      id: 'area-4',
      obraId: 'obra-1',
      nome: '2o Pavimento',
      ordem: 2,
      ativa: true,
      criadaEm: '2026-10-28T00:00:00Z',
    })

    renderObrasPage(mockEngenheiro)

    await waitFor(() => {
      expect(screen.getByText('Subsolo 01')).toBeInTheDocument()
    })

    const btnNovaArea = screen.getByRole('button', { name: /\+ Nova Area/i })
    fireEvent.click(btnNovaArea)

    expect(screen.getByText('Cadastrar Nova Area')).toBeInTheDocument()

    const inputNome = screen.getByPlaceholderText('ex: 4o Pavimento ou Garagem')
    fireEvent.change(inputNome, { target: { value: '2o Pavimento' } })

    const form = inputNome.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(createAreaSpy).toHaveBeenCalledWith(
        'obra-1',
        expect.objectContaining({
          nome: '2o Pavimento',
        })
      )
    })
  })

  it('nao deve exibir botoes de criacao e gestao de areas para perfil ALMOXARIFE', async () => {
    renderObrasPage(mockAlmoxarife)

    await waitFor(() => {
      expect(screen.getByText('Subsolo 01')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /\+ Nova Area/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Desativar Area/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ Nova Obra/i })).not.toBeInTheDocument()
  })

  it('deve permitir que ADMIN cadastre uma nova obra', async () => {
    const createObraSpy = vi.spyOn(apiClient, 'createObra').mockResolvedValue({
      id: 'obra-2',
      codigo: 'JOOY-02',
      nome: 'Residencial Jooy Horizonte',
      cidade: 'Dourados',
      ativa: true,
      criadaEm: '2026-10-28T00:00:00Z',
      _count: { areas: 0 },
    })

    renderObrasPage(mockAdmin)

    await waitFor(() => {
      expect(screen.getByText('JOOY-01')).toBeInTheDocument()
    })

    const btnNovaObra = screen.getByRole('button', { name: /\+ Nova Obra/i })
    fireEvent.click(btnNovaObra)

    expect(screen.getByText('Cadastrar Nova Obra')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('ex: JOOY-02'), {
      target: { value: 'JOOY-02' },
    })
    fireEvent.change(screen.getByPlaceholderText('ex: Residencial Jooy Horizonte'), {
      target: { value: 'Residencial Jooy Horizonte' },
    })
    fireEvent.change(screen.getByPlaceholderText('ex: Campo Grande'), {
      target: { value: 'Dourados' },
    })

    const formObra = screen.getByPlaceholderText('ex: JOOY-02').closest('form')!
    fireEvent.submit(formObra)

    await waitFor(() => {
      expect(createObraSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: 'JOOY-02',
          nome: 'Residencial Jooy Horizonte',
          cidade: 'Dourados',
        }),
        expect.anything()
      )
    })
  })

  it('deve permitir que ADMIN desative ou ative uma area da obra', async () => {
    const toggleAreaSpy = vi.spyOn(apiClient, 'toggleAreaSituacao').mockResolvedValue({
      id: 'area-1',
      obraId: 'obra-1',
      nome: 'Subsolo 01',
      ordem: -1,
      ativa: false,
      criadaEm: '2026-10-28T00:00:00Z',
    })

    renderObrasPage(mockAdmin)

    await waitFor(() => {
      expect(screen.getByText('Subsolo 01')).toBeInTheDocument()
    })

    const btnDesativar = screen.getAllByRole('button', { name: /Desativar Area/i })[0]
    fireEvent.click(btnDesativar)

    await waitFor(() => {
      expect(toggleAreaSpy).toHaveBeenCalledWith('area-1', false)
    })
  })
})
