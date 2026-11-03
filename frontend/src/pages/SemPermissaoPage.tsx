import { Link } from 'react-router-dom'

export function SemPermissaoPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center font-body text-on-surface">
      <div className="bg-surface-container-lowest border border-surface-container rounded-2xl p-8 max-w-md shadow-sm flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-error-container/40 text-error flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px]">lock</span>
        </div>
        <div className="text-sm font-bold uppercase tracking-wider text-error mb-1">
          Erro 403
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface mb-2">
          Acesso Nao Autorizado
        </h1>
        <p className="text-caption-1 text-on-surface-variant max-w-sm mb-6">
          Seu perfil de usuario nao possui permissao para acessar esta area do sistema.
        </p>
        <Link
          to="/"
          className="h-11 px-6 bg-primary text-on-primary rounded-xl font-headline text-headline flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-95 transition-all text-decoration-none"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Voltar para a Pagina Inicial
        </Link>
      </div>
    </main>
  )
}
export default SemPermissaoPage
