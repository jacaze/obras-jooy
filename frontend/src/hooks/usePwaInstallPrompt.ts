import { useState, useEffect, useCallback } from 'react'

export type PlataformaDispositivo = 'ios' | 'android' | 'outro_mobile' | 'desktop'

export const CHAVE_BANNER_PWA_DISPENSADO = 'obras_pwa_banner_instalacao_dispensado'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

/**
 * Identifica a plataforma do dispositivo a partir do User-Agent do navegador.
 */
export function detectarPlataformaPorUserAgent(
  userAgent?: string,
  maxTouchPoints?: number
): PlataformaDispositivo {
  const ua =
    userAgent !== undefined
      ? userAgent
      : typeof navigator !== 'undefined'
        ? navigator.userAgent || ''
        : ''

  const touchPoints =
    maxTouchPoints !== undefined
      ? maxTouchPoints
      : typeof navigator !== 'undefined'
        ? navigator.maxTouchPoints || 0
        : 0

  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'ios'
  }

  // iPadOS 13+ pode reportar Macintosh no User-Agent mas possui tela touch multi-ponto
  if (/Macintosh/i.test(ua) && touchPoints > 1) {
    return 'ios'
  }

  if (/Android/i.test(ua)) {
    return 'android'
  }

  if (/webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
    return 'outro_mobile'
  }

  return 'desktop'
}

/**
 * Verifica se a aplicacao ja esta sendo executada instalada na tela inicial (modo standalone).
 */
export function verificarModoStandalone(): boolean {
  if (typeof window === 'undefined') return false

  try {
    // Propriedade especifica do Safari no iOS quando aberto pela Tela de Inicio
    if ((window.navigator as any)?.standalone === true) {
      return true
    }

    // Media query padrao W3C para PWAs instalados (Android, Chrome, Edge, iOS moderno)
    if (
      typeof window.matchMedia === 'function' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches)
    ) {
      return true
    }

    // Android Trusted Web Activity (TWA)
    if (typeof document !== 'undefined' && document.referrer.includes('android-app://')) {
      return true
    }
  } catch {
    // Ignorar erros em ambientes restritos
  }

  return false
}

function lerEstadoDispensado(): boolean {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(CHAVE_BANNER_PWA_DISPENSADO) === 'true'
    }
  } catch {
    // Ignorar se sessionStorage estiver bloqueado
  }
  return false
}

export function usePwaInstallPrompt() {
  const [plataforma, setPlataforma] = useState<PlataformaDispositivo>(() =>
    detectarPlataformaPorUserAgent()
  )
  const [isStandalone, setIsStandalone] = useState<boolean>(() => verificarModoStandalone())
  const [foiDispensado, setFoiDispensado] = useState<boolean>(() => lerEstadoDispensado())
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    setPlataforma(detectarPlataformaPorUserAgent())
    setIsStandalone(verificarModoStandalone())

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }

    function handleDisplayModeChange(e: MediaQueryListEvent) {
      if (e.matches) {
        setIsStandalone(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    let mediaQuery: MediaQueryList | null = null
    if (typeof window.matchMedia === 'function') {
      try {
        mediaQuery = window.matchMedia('(display-mode: standalone)')
        if (typeof mediaQuery.addEventListener === 'function') {
          mediaQuery.addEventListener('change', handleDisplayModeChange)
        }
      } catch {
        // Ignorar em navegadores antigos ou mocks de teste
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (mediaQuery && typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleDisplayModeChange)
      }
    }
  }, [])

  const dispensarBanner = useCallback(() => {
    setFoiDispensado(true)
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(CHAVE_BANNER_PWA_DISPENSADO, 'true')
      }
    } catch {
      // Ignorar erro de storage
    }
  }, [])

  const instalarNativo = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (choice.outcome === 'accepted') {
        setIsStandalone(true)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [deferredPrompt])

  const isMobile =
    plataforma === 'ios' || plataforma === 'android' || plataforma === 'outro_mobile'
  const deveExibirBanner = isMobile && !isStandalone && !foiDispensado

  return {
    plataforma,
    isMobile,
    isStandalone,
    foiDispensado,
    temPromptNativo: Boolean(deferredPrompt),
    deveExibirBanner,
    dispensarBanner,
    instalarNativo,
  }
}
