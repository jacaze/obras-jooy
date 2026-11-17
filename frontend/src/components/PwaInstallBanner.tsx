import { usePwaInstallPrompt } from '../hooks/usePwaInstallPrompt'

export function PwaInstallBanner() {
  const {
    plataforma,
    temPromptNativo,
    deveExibirBanner,
    dispensarBanner,
    instalarNativo,
  } = usePwaInstallPrompt()

  if (!deveExibirBanner) {
    return null
  }

  return (
    <aside
      role="region"
      aria-label="Aviso de instalacao do aplicativo mobile"
      className="w-full bg-surface-container-lowest border-b border-surface-container-high shadow-sm px-4 py-3 sm:px-6 z-30"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 border border-surface-container shrink-0 flex items-center justify-center shadow-sm mt-0.5">
            <img
              src="/logo-icon.png"
              alt="Icone Obras Jooy"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-container text-on-primary-container">
                <span className="material-symbols-outlined text-[13px]">install_mobile</span>
                App de Canteiro
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-on-surface tracking-tight">
                Instale o aplicativo Obras Jooy na Tela de Inicio
              </h2>
            </div>

            {plataforma === 'ios' ? (
              <div className="mt-1.5 text-xs text-on-surface-variant leading-relaxed space-y-1.5">
                <p>
                  Voce abriu pelo navegador do iPhone/iPad. Para usar em tela cheia e com modo
                  offline completo no canteiro, compartilhe para a sua Tela de Inicio:
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-medium text-on-surface">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container border border-surface-container-high">
                    <span className="material-symbols-outlined text-[15px]">ios_share</span>
                    1. Toque em <strong>Compartilhar</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container border border-surface-container-high">
                    <span className="material-symbols-outlined text-[15px]">add_box</span>
                    2. Selecione <strong>Adicionar a Tela de Inicio</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-1.5 text-xs text-on-surface-variant leading-relaxed space-y-1.5">
                <p>
                  Voce abriu pelo navegador do celular. Adicione o aplicativo a sua Tela de Inicio
                  para acesso rapido no canteiro e sincronizacao em segundo plano:
                </p>
                {!temPromptNativo && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-medium text-on-surface">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container border border-surface-container-high">
                      <span className="material-symbols-outlined text-[15px]">more_vert</span>
                      1. Toque no menu do navegador
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container border border-surface-container-high">
                      <span className="material-symbols-outlined text-[15px]">install_mobile</span>
                      2. Toque em <strong>Adicionar a tela inicial / Instalar app</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {temPromptNativo && (
            <button
              type="button"
              onClick={() => void instalarNativo()}
              className="ob-btn ob-btn--primary py-1.5 px-3.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Instalar Aplicativo
            </button>
          )}

          <button
            type="button"
            onClick={dispensarBanner}
            aria-label="Fechar aviso de instalacao"
            className="ob-btn ob-btn--ghost py-1.5 px-2.5 text-xs flex items-center gap-1"
          >
            <span>Agora nao</span>
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
