import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Navbar } from './Navbar'
import { AuthContext } from '../contexts/auth-context'
import type { UsuarioAuth } from '../types/auth'

function renderNavbar(usuarioLogado: UsuarioAuth | null = null) {
  return render(
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
        <Navbar />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('Navbar Component', () => {
  it('nao deve renderizar nada se nao houver usuario logado', () => {
    const { container } = renderNavbar(null)
    expect(container).toBeEmptyDOMElement()
  })

  it('deve ocultar Ferramentas e Estoque para perfil ENCARREGADO', () => {
    renderNavbar({
      id: 'enc-1',
      nome: 'Marcos Encarregado',
      login: 'marcos',
      perfil: 'ENCARREGADO',
      cargo: 'Encarregado de Obras',
      ativo: true,
    })

    // Deve exibir Início e Requisições
    expect(screen.getAllByRole('link', { name: /Início/i })[0]).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Requisições/i })[0]).toBeInTheDocument()

    // NÃO deve exibir Ferramentas nem Estoque
    expect(screen.queryByRole('link', { name: /Ferramentas/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ferram\./i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Estoque/i })).not.toBeInTheDocument()
  })

  it('deve exibir Ferramentas e Estoque para perfil ALMOXARIFE', () => {
    renderNavbar({
      id: 'almox-1',
      nome: 'Joao Almoxarife',
      login: 'almox',
      perfil: 'ALMOXARIFE',
      cargo: 'Almoxarife Chefe',
      ativo: true,
    })

    expect(screen.getAllByRole('link', { name: /Início/i })[0]).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Requisições/i })[0]).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Estoque/i })[0]).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Ferramentas/i })[0]).toBeInTheDocument()
  })

  it('deve exibir Ferramentas e menu de Gestão para perfil ADMIN', () => {
    renderNavbar({
      id: 'admin-1',
      nome: 'Admin Master',
      login: 'admin',
      perfil: 'ADMIN',
      cargo: 'Diretor',
      ativo: true,
    })

    expect(screen.getAllByRole('link', { name: /Ferramentas/i })[0]).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gestão/i })).toBeInTheDocument()
  })
})
