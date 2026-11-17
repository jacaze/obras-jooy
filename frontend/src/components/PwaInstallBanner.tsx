import { useState } from 'react'
import { usePwaInstallPrompt } from '../hooks/usePwaInstallPrompt'

export function PwaInstallBanner() {
  const {
    plataforma,
    temPromptNativo,
    deveExibirBanner,
    dispensarBanner,
    instalarNativo,
  } = usePwaInstallPrompt()

  const [tutorialAberto, setTutorialAberto] = useState(false)

  if (!deveExibirBanner) {
    return null
  }

  return (
    <aside
      role="region"
      aria-label="Aviso de instalacao do aplicativo mobile"
      className="fixed top-3 inset-x-3 z-50 max-w-md mx-auto rounded-2xl bg-surface-container-lowest/95 backdrop-blur-md border border-surface-container-high shadow-xl px-3.5 py-2.5"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-white p-1 border border-surface-container shrink-0 flex items-center justify-center shadow-sm">
            <img
              src="/logo-icon.png"
              alt="Icone Obras Jooy"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-on-surface tracking-tight truncate">
              Instale o aplicativo Obras Jooy
            </h2>
            <p className="text-[11px] text-on-surface-variant truncate">
              Tela cheia e modo offline no canteiro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {temPromptNativo ? (
            <button
              type="button"
              onClick={() => void instalarNativo()}
              className="ob-btn ob-btn--primary py-1 px-3 text-xs font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              Instalar Aplicativo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTutorialAberto((prev) => !prev)}
              aria-expanded={tutorialAberto}
              className="ob-btn ob-btn--primary py-1 px-3 text-xs font-semibold flex items-center gap-1"
            >
              <span>{tutorialAberto ? 'Ocultar' : 'Como instalar'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={dispensarBanner}
            aria-label="Fechar aviso de instalacao"
            className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      </div>

      {tutorialAberto && !temPromptNativo && (
        <div className="mt-2.5 pt-2.5 border-t border-surface-container text-[11px] text-on-surface-variant space-y-1.5">
          {plataforma === 'ios' ? (
            <div className="flex flex-col gap-1.5 text-on-surface">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                  ios_share
                </span>
                <span>
                  1. Toque no icone <strong>Compartilhar</strong> na barra do Safari
                </span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                  add_box
                </span>
                <span>
                  2. Role a lista e selecione <strong>Adicionar a Tela de Inicio</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 text-on-surface">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                  more_vert
                </span>
                <span>1. Toque no menu do navegador (tres pontos)</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
                <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
                  install_mobile
                </span>
                <span>
                  2. Selecione <strong>Adicionar a tela inicial / Instalar app</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
