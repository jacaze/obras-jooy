import { useState } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Navbar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuMaisAberto, setMenuMaisAberto] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (!usuario) {
    return null
  }

  const podeVerEstoque = usuario.perfil !== 'ENCARREGADO'
  const podeVerOrcamento =
    usuario.perfil === 'ADMIN' ||
    usuario.perfil === 'ENGENHARIA' ||
    usuario.perfil === 'ADMINISTRACAO'
  const podeVerUsuarios = usuario.perfil === 'ADMIN'

  function estiloLinkDesktop({ isActive }: { isActive: boolean }) {
    return `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
      isActive
        ? 'bg-primary text-on-primary shadow-sm'
        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
    }`
  }

  function estiloTabMobile({ isActive }: { isActive: boolean }) {
    return `flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors active:scale-95 ${
      isActive ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
    }`
  }

  return (
    <>
      {/* Top iOS Navigation Header */}
      <header className="sticky top-0 w-full z-40 bg-surface/85 backdrop-blur-xl border-b border-surface-container shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group text-decoration-none">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[18px]">domain</span>
              </div>
              <div className="flex flex-col">
                <span className="font-title-3 text-[17px] font-bold text-on-surface tracking-tight leading-none">
                  Obras Jooy
                </span>
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">
                  Almoxarifado & Canteiro
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              <NavLink to="/" end className={estiloLinkDesktop}>
                <span className="material-symbols-outlined text-[18px]">home</span>
                Início
              </NavLink>
              <NavLink to="/requisicoes" className={estiloLinkDesktop}>
                <span className="material-symbols-outlined text-[18px]">assignment</span>
                Requisições
              </NavLink>
              {podeVerEstoque && (
                <>
                  <NavLink to="/estoque" className={estiloLinkDesktop}>
                    <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                    Estoque
                  </NavLink>
                  <NavLink to="/obras" className={estiloLinkDesktop}>
                    <span className="material-symbols-outlined text-[18px]">apartment</span>
                    Obras
                  </NavLink>
                  <NavLink to="/materiais" className={estiloLinkDesktop}>
                    <span className="material-symbols-outlined text-[18px]">category</span>
                    Materiais
                  </NavLink>
                  <NavLink to="/ferramentas" className={estiloLinkDesktop}>
                    <span className="material-symbols-outlined text-[18px]">construction</span>
                    Ferramentas
                  </NavLink>
                </>
              )}
              {podeVerOrcamento && (
                <NavLink to="/orcamento" className={estiloLinkDesktop}>
                  <span className="material-symbols-outlined text-[18px]">query_stats</span>
                  Orçamento
                </NavLink>
              )}
              {podeVerUsuarios && (
                <NavLink to="/usuarios" className={estiloLinkDesktop}>
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  Usuários
                </NavLink>
              )}
            </nav>
          </div>

          {/* User Badge and Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-on-surface leading-tight">
                {usuario.nome}
              </span>
              <span className="text-xs text-on-surface-variant">
                {usuario.cargo} • <strong className="text-primary font-semibold">{usuario.perfil}</strong>
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs shadow-sm">
              {usuario.nome.charAt(0).toUpperCase()}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom TabBar (Stitch Native iOS Design) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-surface/90 backdrop-blur-xl border-t border-surface-container shadow-[0_-1px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-1">
          <NavLink to="/" end className={estiloTabMobile}>
            <span className="material-symbols-outlined text-[24px]">home</span>
            <span className="text-[11px] font-medium mt-0.5">Início</span>
          </NavLink>

          <NavLink to="/requisicoes" className={estiloTabMobile}>
            <span className="material-symbols-outlined text-[24px]">assignment</span>
            <span className="text-[11px] font-medium mt-0.5">Requisições</span>
          </NavLink>

          {podeVerEstoque && (
            <NavLink to="/estoque" className={estiloTabMobile}>
              <span className="material-symbols-outlined text-[24px]">inventory_2</span>
              <span className="text-[11px] font-medium mt-0.5">Estoque</span>
            </NavLink>
          )}

          <NavLink to="/ferramentas" className={estiloTabMobile}>
            <span className="material-symbols-outlined text-[24px]">construction</span>
            <span className="text-[11px] font-medium mt-0.5">Ferramentas</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMenuMaisAberto(!menuMaisAberto)}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors active:scale-95 ${
              menuMaisAberto ||
              ['/obras', '/materiais', '/orcamento', '/orcamento-obra', '/usuarios'].includes(
                location.pathname
              )
                ? 'text-primary font-semibold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">more_horiz</span>
            <span className="text-[11px] font-medium mt-0.5">Mais</span>
          </button>
        </div>
      </nav>

      {/* Mobile "Mais" Sheet / Drawer */}
      {menuMaisAberto && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end">
          <div
            className="w-full bg-surface rounded-t-3xl p-6 shadow-2xl border-t border-surface-container animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-3 font-bold text-on-surface">Outros Módulos</h3>
              <button
                type="button"
                onClick={() => setMenuMaisAberto(false)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {podeVerOrcamento && (
                <Link
                  to="/orcamento"
                  onClick={() => setMenuMaisAberto(false)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container hover:bg-surface-container-low"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">query_stats</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-on-surface">Orçamento</div>
                    <div className="text-[11px] text-on-surface-variant">Limites de Obra</div>
                  </div>
                </Link>
              )}

              {podeVerEstoque && (
                <>
                  <Link
                    to="/obras"
                    onClick={() => setMenuMaisAberto(false)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container hover:bg-surface-container-low"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">apartment</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-on-surface">Obras</div>
                      <div className="text-[11px] text-on-surface-variant">Torres & Áreas</div>
                    </div>
                  </Link>

                  <Link
                    to="/materiais"
                    onClick={() => setMenuMaisAberto(false)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container hover:bg-surface-container-low"
                  >
                    <div className="w-9 h-9 rounded-xl bg-surface-container-high text-on-surface flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">category</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-on-surface">Catálogo</div>
                      <div className="text-[11px] text-on-surface-variant">Conversão Insumos</div>
                    </div>
                  </Link>
                </>
              )}

              {podeVerUsuarios && (
                <Link
                  to="/usuarios"
                  onClick={() => setMenuMaisAberto(false)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-container-lowest shadow-sm border border-surface-container hover:bg-surface-container-low"
                >
                  <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">group</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-on-surface">Usuários</div>
                    <div className="text-[11px] text-on-surface-variant">Permissões & Cargos</div>
                  </div>
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setMenuMaisAberto(false)
                handleLogout()
              }}
              className="w-full py-3 px-4 rounded-xl bg-error-container text-on-error-container font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Encerrar Sessão
            </button>
          </div>
        </div>
      )}
    </>
  )
}
export default Navbar
