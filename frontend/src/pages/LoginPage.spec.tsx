import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { AuthContext } from '../contexts/auth-context'

describe('LoginPage Component', () => {
  it('deve renderizar campos de login e senha', () => {
    render(
      <AuthContext.Provider
        value={{
          usuario: null,
          token: null,
          carregando: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText('Obras Jooy')).toBeInTheDocument()
    expect(screen.getByLabelText('Login de Usuario')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar no Sistema' })).toBeInTheDocument()
  })

  it('deve chamar login ao submeter formulario com credenciais', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined)

    render(
      <AuthContext.Provider
        value={{
          usuario: null,
          token: null,
          carregando: false,
          login: mockLogin,
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    fireEvent.change(screen.getByLabelText('Login de Usuario'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'Admin@123456' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar no Sistema' }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'Admin@123456')
    })
  })

  it('deve exibir mensagem de erro quando login falhar', async () => {
    const mockLogin = vi.fn().mockRejectedValue({
      response: { data: { erro: 'Credenciais invalidas' } },
    })

    render(
      <AuthContext.Provider
        value={{
          usuario: null,
          token: null,
          carregando: false,
          login: mockLogin,
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    fireEvent.change(screen.getByLabelText('Login de Usuario'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'senha-errada' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Entrar no Sistema' }))

    await waitFor(() => {
      expect(screen.getByText('Credenciais invalidas')).toBeInTheDocument()
    })
  })

  it('deve permitir acesso rapido de demonstracao ao clicar em um perfil do MVP', async () => {
    const mockLogin = vi.fn().mockResolvedValue(undefined)

    render(
      <AuthContext.Provider
        value={{
          usuario: null,
          token: null,
          carregando: false,
          login: mockLogin,
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    const btnAdmin = screen.getByRole('button', { name: /Admin Geral/i })
    fireEvent.click(btnAdmin)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123456')
    })
  })

  it('deve exibir indicador de modo offline quando o navegador estiver desconectado', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    render(
      <AuthContext.Provider
        value={{
          usuario: null,
          token: null,
          carregando: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )

    expect(screen.getByText(/Modo Offline • Autenticacao Local/i)).toBeInTheDocument()
    expect(screen.getByText(/Dispositivo sem conexao com a internet/i)).toBeInTheDocument()
  })
})
