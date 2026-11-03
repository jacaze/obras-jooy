import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from './HomePage'
import * as apiClient from '../api/client'
import { AuthContext } from '../contexts/auth-context'
import type { UsuarioAuth } from '../types/auth'

function renderHomePage(usuarioLogado: UsuarioAuth | null = null) {
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
          token: usuarioLogado ? 'fake-token' : null,
          carregando: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('HomePage Component', () => {
  it('deve renderizar informacoes de status quando a API responder com sucesso', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValueOnce({
      status: 'UP',
      servico: 'obras-jooy-backend',
      versao: '1.0.0',
      timestamp: '2026-10-27T21:00:00.000Z',
    })

    renderHomePage()

    expect(screen.getByText('Obras Jooy - Almoxarifado')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Status do Back-end:')).toBeInTheDocument()
      expect(screen.getByText('obras-jooy-backend')).toBeInTheDocument()
    })
  })

  it('deve exibir mensagem de erro quando a chamada da API falhar', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockRejectedValueOnce(new Error('Conexao recusada'))

    renderHomePage()

    await waitFor(() => {
      expect(screen.getByText(/Falha na conexao com a API/)).toBeInTheDocument()
    })
  })

  it('deve exibir boas-vindas e botao de gestao quando usuario for ADMIN', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValueOnce({
      status: 'UP',
      servico: 'obras-jooy-backend',
      versao: '1.0.0',
      timestamp: '2026-10-27T21:00:00.000Z',
    })

    renderHomePage({
      id: 'admin-1',
      nome: 'Administrador Geral',
      login: 'admin',
      perfil: 'ADMIN',
      cargo: 'Engenheiro Chefe',
      ativo: true,
    })

    expect(screen.getByText(/Bem-vindo\(a\), Administrador Geral!/)).toBeInTheDocument()
    expect(screen.getByText(/Cargo:/)).toBeInTheDocument()
    expect(screen.getByText('Engenheiro Chefe')).toBeInTheDocument()
    expect(screen.getByText('Gerenciar Usuarios e Cargos')).toBeInTheDocument()
  })

  it('nao deve exibir botao de gestao de usuarios para perfil ALMOXARIFE', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValueOnce({
      status: 'UP',
      servico: 'obras-jooy-backend',
      versao: '1.0.0',
      timestamp: '2026-10-27T21:00:00.000Z',
    })

    renderHomePage({
      id: 'almox-1',
      nome: 'Joao Almoxarife',
      login: 'almox',
      perfil: 'ALMOXARIFE',
      cargo: 'Almoxarife',
      ativo: true,
    })

    expect(screen.getByText(/Bem-vindo\(a\), Joao Almoxarife!/)).toBeInTheDocument()
    expect(screen.queryByText('Gerenciar Usuarios e Cargos')).not.toBeInTheDocument()
  })

  it('deve exibir indicadores operacionais, fila de requisicoes pendentes e alertas de orcamento no dashboard', async () => {
    vi.spyOn(apiClient, 'fetchHealth').mockResolvedValueOnce({
      status: 'UP',
      servico: 'obras-jooy-backend',
      versao: '1.0.0',
      timestamp: '2026-10-27T21:00:00.000Z',
    })
    vi.spyOn(apiClient, 'getObras').mockResolvedValueOnce([
      {
        id: 'obra-1',
        codigo: 'JOOY-01',
        nome: 'Residencial Jooy Reserva',
        cidade: 'Campo Grande',
        ativa: true,
        criadaEm: '2026-10-27T00:00:00Z',
        _count: { areas: 8 },
      },
    ])
    vi.spyOn(apiClient, 'getRequisicoes').mockResolvedValueOnce([
      {
        id: 'req-1',
        numeroSequencial: 205,
        areaId: 'area-1',
        requisitanteId: 'enc-1',
        status: 'SOLICITADA',
        solicitadaEm: '2026-10-30T10:00:00Z',
        exportadaSienge: false,
        area: {
          id: 'area-1',
          obraId: 'obra-1',
          nome: '2o Pavimento',
          ordem: 2,
          ativa: true,
          criadaEm: '',
          obra: { id: 'obra-1', codigo: 'JOOY-01', nome: 'Residencial Jooy Reserva' },
        },
        requisitante: {
          id: 'enc-1',
          nome: 'Marcos Encarregado',
          login: 'marcos',
          cargo: { nome: 'Mestre de Obras' },
        },
        itens: [
          {
            id: 'item-1',
            requisicaoId: 'req-1',
            materialId: 'mat-1',
            quantidade: 25,
            material: {
              id: 'mat-1',
              codigo: 'MAT-004',
              descricao: 'Luva de Vaqueta Mista',
              unidadeConsumo: { sigla: 'PAR', descricao: 'Par' },
            } as any,
          },
        ],
      },
    ])
    vi.spyOn(apiClient, 'getFerramentas').mockResolvedValueOnce([
      {
        id: 'fer-1',
        codigo: 'FER-001',
        nome: 'Martelete 800W',
        status: 'EMPRESTADO',
        ativo: true,
        criadaEm: '',
        emprestadoPara: {
          id: 'enc-1',
          nome: 'Marcos Encarregado',
          login: 'marcos',
          perfil: 'ENCARREGADO',
        },
      },
      {
        id: 'fer-2',
        codigo: 'FER-004',
        nome: 'Furadeira 650W',
        status: 'COM_DEFEITO',
        ativo: true,
        criadaEm: '',
        emprestadoPara: null,
      },
    ])
    vi.spyOn(apiClient, 'getLimitesOrcamentoObra').mockResolvedValueOnce([
      {
        id: 'orc-1',
        obraId: 'obra-1',
        materialId: 'mat-1',
        quantidadeOrcada: 100,
        quantidadeConsumida: 120,
        saldoOrcamento: -20,
      },
    ])

    renderHomePage({
      id: 'eng-1',
      nome: 'Carlos Engenheiro',
      login: 'carlos.eng',
      perfil: 'ENGENHARIA',
      cargo: 'Engenheiro Residente',
      ativo: true,
    } as any)

    await waitFor(() => {
      expect(screen.getByText(/Painel Operacional e Executivo/i)).toBeInTheDocument()
      expect(screen.getByText('#205')).toBeInTheDocument()
      expect(screen.getByText('Marcos Encarregado')).toBeInTheDocument()
      expect(screen.getByText('Martelete 800W')).toBeInTheDocument()
      expect(screen.getByText(/1 item\(ns\) com estouro de orcamento/i)).toBeInTheDocument()
    })
  })
})
