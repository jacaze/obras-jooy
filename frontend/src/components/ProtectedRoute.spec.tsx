import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AuthContext } from '../contexts/auth-context'
import type { UsuarioAuth } from '../types/auth'

function renderWithRouter(
  authValue: { usuario: UsuarioAuth | null; carregando: boolean },
  perfisPermitidos?: ('ADMIN' | 'ENGENHEIRO' | 'MESTRE' | 'ALMOXARIFE')[]
) {
  return render(
    <AuthContext.Provider
      value={{
        usuario: authValue.usuario,
        token: authValue.usuario ? 'token-123' : null,
        carregando: authValue.carregando,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={['/protegida']}>
        <Routes>
          <Route path="/login" element={<div>Tela de Login</div>} />
          <Route path="/sem-permissao" element={<div>Acesso Negado</div>} />
          <Route element={<ProtectedRoute perfisPermitidos={perfisPermitidos} />}>
            <Route path="/protegida" element={<div>Conteudo Secreto</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('ProtectedRoute Component', () => {
  it('deve exibir indicador de carregamento enquanto valida credenciais', () => {
    renderWithRouter({ usuario: null, carregando: true })
    expect(screen.getByText('Carregando credenciais...')).toBeInTheDocument()
  })

  it('deve redirecionar para /login se usuario nao estiver autenticado', () => {
    renderWithRouter({ usuario: null, carregando: false })
    expect(screen.getByText('Tela de Login')).toBeInTheDocument()
    expect(screen.queryByText('Conteudo Secreto')).not.toBeInTheDocument()
  })

  it('deve redirecionar para /sem-permissao se o perfil nao for permitido', () => {
    renderWithRouter(
      {
        usuario: {
          id: '1',
          nome: 'Joao',
          login: 'joao',
          perfil: 'ALMOXARIFE',
          cargo: 'Almoxarife',
          ativo: true,
        },
        carregando: false,
      },
      ['ADMIN']
    )

    expect(screen.getByText('Acesso Negado')).toBeInTheDocument()
    expect(screen.queryByText('Conteudo Secreto')).not.toBeInTheDocument()
  })

  it('deve renderizar conteudo protegido se o perfil for permitido', () => {
    renderWithRouter(
      {
        usuario: {
          id: '1',
          nome: 'Admin',
          login: 'admin',
          perfil: 'ADMIN',
          cargo: 'Engenheiro Chefe',
          ativo: true,
        },
        carregando: false,
      },
      ['ADMIN']
    )

    expect(screen.getByText('Conteudo Secreto')).toBeInTheDocument()
  })
})
