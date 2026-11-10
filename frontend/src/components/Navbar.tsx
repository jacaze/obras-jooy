import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { FEATURE_ORCAMENTO_ATIVO } from '../config/features'

export function Navbar() {
  const { usuario, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuMaisAberto, setMenuMaisAberto] = useState(false)
  const [menuGestaoAberto, setMenuGestaoAberto] = useState(false)
  const dropdownGestaoRef = useRef<HTMLDivElement>(null)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Fechar menu de gestão ao clicar fora ou apertar Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownGestaoRef.current && !dropdownGestaoRef.current.contains(e.target as Node)) {
        setMenuGestaoAberto(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenuGestaoAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  if (!usuario) {
    return null
  }

  const podeVerEstoque = usuario.perfil !== 'ENCARREGADO'
  const podeVerFerramentas = usuario.perfil !== 'ENCARREGADO'
  const podeVerOrcamento =
    FEATURE_ORCAMENTO_ATIVO &&
    (usuario.perfil === 'ADMIN' ||
      usuario.perfil === 'ENGENHARIA' ||
      usuario.perfil === 'ADMINISTRACAO')
  const podeVerUsuarios = usuario.perfil === 'ADMIN'
  const temItensGestao = podeVerEstoque || podeVerOrcamento || podeVerUsuarios

  const rotasGestao = [
    '/obras',
    '/materiais',
    ...(FEATURE_ORCAMENTO_ATIVO ? ['/orcamento', '/orcamento-obra'] : []),
    '/usuarios',
  ]
  const isGestaoAtiva = rotasGestao.some((r) => location.pathname.startsWith(r))

  return (
    <>
      {/* Top Header com estilo do Design System Obras */}
      <header className="sticky top-0 w-full z-40 bg-surface/85 backdrop-blur-xl border-b border-surface-container-high shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/" className="flex items-center gap-2 group text-decoration-none shrink-0">
              <span className="ob-icon-tile">
                <span className="material-symbols-outlined text-[20px]">domain</span>
              </span>
              <div className="flex flex-col">
                <span className="font-heading text-[18px] font-semibold text-on-surface tracking-tight leading-none">
                  Obras Jooy
                </span>
                <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-medium mt-0.5">
                  Almoxarifado &amp; Canteiro
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links usando ob-nav (flex-nowrap para não quebrar em 2 linhas) */}
            <nav className="hidden lg:flex ob-nav flex-nowrap whitespace-nowrap shrink-0" aria-label="Principal">
              <NavLink to="/" end>
                <span className="material-symbols-outlined">home</span>
                Início
              </NavLink>
              <NavLink to="/requisicoes">
                <span className="material-symbols-outlined">assignment</span>
                Requisições
              </NavLink>
              {podeVerEstoque && (
                <NavLink to="/estoque">
                  <span className="material-symbols-outlined">inventory_2</span>
                  Estoque
                </NavLink>
              )}
              {podeVerFerramentas && (
                <NavLink to="/ferramentas">
                  <span className="material-symbols-outlined">construction</span>
                  Ferramentas
                </NavLink>
              )}

              {/* Dropdown de Gestão para Obras, Materiais, Orçamento e Usuários */}
              {temItensGestao && (
                <div className="relative" ref={dropdownGestaoRef}>
                  <button
                    type="button"
                    onClick={() => setMenuGestaoAberto(!menuGestaoAberto)}
                    aria-expanded={menuGestaoAberto}
                    aria-haspopup="true"
                    aria-current={isGestaoAtiva ? 'page' : undefined}
                    className="ob-tab"
                  >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    <span>Gestão</span>
                    <span
                      className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                        menuGestaoAberto ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  {menuGestaoAberto && (
                    <div className="ob-menu is-open left-0 top-full mt-2 shadow-2xl z-50">
                      {podeVerEstoque && (
                        <>
                          <NavLink
                            to="/obras"
                            onClick={() => setMenuGestaoAberto(false)}
                            aria-current={location.pathname.startsWith('/obras') ? 'page' : undefined}
                          >
                            <span className="material-symbols-outlined">apartment</span>
                            <span>Obras &amp; Áreas</span>
                          </NavLink>
                          <NavLink
                            to="/materiais"
                            onClick={() => setMenuGestaoAberto(false)}
                            aria-current={location.pathname.startsWith('/materiais') ? 'page' : undefined}
                          >
                            <span className="material-symbols-outlined">category</span>
                            <span>Catálogo de Materiais</span>
                          </NavLink>
                        </>
                      )}
                      {podeVerOrcamento && (
                        <NavLink
                          to="/orcamento"
                          onClick={() => setMenuGestaoAberto(false)}
                          aria-current={location.pathname.startsWith('/orcamento') ? 'page' : undefined}
                        >
                          <span className="material-symbols-outlined">query_stats</span>
                          <span>Orçamento da Obra</span>
                        </NavLink>
                      )}
                      {podeVerUsuarios && (
                        <NavLink
                          to="/usuarios"
                          onClick={() => setMenuGestaoAberto(false)}
                          aria-current={location.pathname.startsWith('/usuarios') ? 'page' : undefined}
                        >
                          <span className="material-symbols-outlined">group</span>
                          <span>Usuários &amp; Cargos</span>
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* User Badge, Theme Toggle and Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              className="inline-flex items-center justify-center min-w-[48px] min-h-[48px] rounded-full border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-on-surface transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>

            <div className="hidden sm:flex flex-col text-right max-w-[200px]">
              <span className="text-sm font-semibold text-on-surface leading-tight truncate">
                {usuario.nome}
              </span>
              <span className="text-xs text-on-surface-variant truncate">
                {usuario.cargo} • <strong className="text-accent-text font-semibold">{usuario.perfil}</strong>
              </span>
            </div>

            <div className="w-9 h-9 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
              {usuario.nome.charAt(0).toUpperCase()}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="ob-btn ob-btn--outline ob-btn--sm min-h-[48px] px-3 text-xs"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom TabBar usando ob-tabbar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 ob-tabbar" aria-label="Principal">
        <NavLink to="/" end>
          <span className="material-symbols-outlined text-[24px]">home</span>
          <span>Início</span>
        </NavLink>

        <NavLink to="/requisicoes">
          <span className="material-symbols-outlined text-[24px]">assignment</span>
          <span>Requisições</span>
        </NavLink>

        {podeVerEstoque && (
          <NavLink to="/estoque">
            <span className="material-symbols-outlined text-[24px]">inventory_2</span>
            <span>Estoque</span>
          </NavLink>
        )}

        {podeVerFerramentas && (
          <NavLink to="/ferramentas">
            <span className="material-symbols-outlined text-[24px]">construction</span>
            <span>Ferram.</span>
          </NavLink>
        )}

        <button
          type="button"
          onClick={() => setMenuMaisAberto(!menuMaisAberto)}
          aria-label="Mais opções"
          className={`flex flex-col items-center justify-center min-w-[3.5rem] min-h-[48px] font-medium text-[11px] transition-colors active:scale-95 cursor-pointer ${
            menuMaisAberto ||
            ['/obras', '/materiais', '/orcamento', '/orcamento-obra', '/usuarios'].includes(
              location.pathname
            )
              ? 'text-on-surface font-bold'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">more_horiz</span>
          <span>Mais</span>
        </button>
      </nav>

      {/* Mobile "Mais" Sheet / Drawer */}
      {menuMaisAberto && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col justify-end"
          onClick={() => setMenuMaisAberto(false)}
        >
          <div
            className="w-full bg-surface-container-lowest rounded-t-3xl p-6 shadow-2xl border-t border-surface-container-high animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-surface-container-high rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-on-surface">Outros Módulos</h3>
              <button
                type="button"
                onClick={() => setMenuMaisAberto(false)}
                aria-label="Fechar menu"
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {podeVerOrcamento && (
                <Link
                  to="/orcamento"
                  onClick={() => setMenuMaisAberto(false)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface shadow-sm border border-surface-container-high hover:border-primary transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center">
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
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface shadow-sm border border-surface-container-high hover:border-primary transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">apartment</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-on-surface">Obras</div>
                      <div className="text-[11px] text-on-surface-variant">Torres &amp; Áreas</div>
                    </div>
                  </Link>

                  <Link
                    to="/materiais"
                    onClick={() => setMenuMaisAberto(false)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface shadow-sm border border-surface-container-high hover:border-primary transition-colors"
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
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface shadow-sm border border-surface-container-high hover:border-primary transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">group</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-on-surface">Usuários</div>
                    <div className="text-[11px] text-on-surface-variant">Permissões &amp; Cargos</div>
                  </div>
                </Link>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl border border-outline-variant bg-surface text-on-surface font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isDark ? 'light_mode' : 'dark_mode'}
                </span>
                <span>{isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuMaisAberto(false)
                  handleLogout()
                }}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-error-container text-on-error-container font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
export default Navbar
