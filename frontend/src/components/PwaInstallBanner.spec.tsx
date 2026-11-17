import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { PwaInstallBanner } from './PwaInstallBanner'
import {
  detectarPlataformaPorUserAgent,
  CHAVE_BANNER_PWA_DISPENSADO,
} from '../hooks/usePwaInstallPrompt'

function mockUserAgent(ua: string, standalone = false) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: ua,
  })
  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value: standalone,
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: standalone && query.includes('standalone'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

describe('PwaInstallBanner e usePwaInstallPrompt (F08 - Deteccao Mobile via User-Agent)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('deve classificar corretamente o User-Agent entre ios, android e desktop', () => {
    expect(
      detectarPlataformaPorUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
      )
    ).toBe('ios')

    expect(
      detectarPlataformaPorUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        5
      )
    ).toBe('ios')

    expect(
      detectarPlataformaPorUserAgent(
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
      )
    ).toBe('android')

    expect(
      detectarPlataformaPorUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        0
      )
    ).toBe('desktop')
  })

  it('nao deve exibir o banner quando acessado por computador Desktop', () => {
    mockUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      false
    )

    const { container } = render(<PwaInstallBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('deve exibir o banner flutuante compacto no iPhone e expandir tutorial ao tocar em Como instalar', () => {
    mockUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      false
    )

    render(<PwaInstallBanner />)

    expect(screen.getByText(/Instale o aplicativo Obras Jooy/i)).toBeInTheDocument()
    const btnComoInstalar = screen.getByRole('button', { name: /Como instalar/i })
    expect(btnComoInstalar).toBeInTheDocument()

    // Ao clicar em Como instalar, exibe os passos de Compartilhar -> Adicionar a Tela de Inicio
    fireEvent.click(btnComoInstalar)
    expect(screen.getByText(/Compartilhar/i)).toBeInTheDocument()
    expect(screen.getByText(/Adicionar a Tela de Inicio/i)).toBeInTheDocument()
  })

  it('deve exibir o banner flutuante compacto no Android e expandir instrucoes do menu ao clicar em Como instalar', () => {
    mockUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36',
      false
    )

    render(<PwaInstallBanner />)

    expect(screen.getByText(/Instale o aplicativo Obras Jooy/i)).toBeInTheDocument()
    const btnComoInstalar = screen.getByRole('button', { name: /Como instalar/i })
    fireEvent.click(btnComoInstalar)

    expect(screen.getByText(/Adicionar a tela inicial \/ Instalar app/i)).toBeInTheDocument()
  })

  it('nao deve exibir o banner no celular quando ja estiver aberto pelo aplicativo instalado (standalone)', () => {
    mockUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      true
    )

    const { container } = render(<PwaInstallBanner />)
    expect(container.firstChild).toBeNull()
  })

  it('deve acionar o prompt nativo de instalacao no Android quando beforeinstallprompt estiver disponivel', async () => {
    mockUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36',
      false
    )

    render(<PwaInstallBanner />)

    const promptMock = vi.fn().mockResolvedValue(undefined)
    const eventoInstall = new Event('beforeinstallprompt') as any
    eventoInstall.prompt = promptMock
    eventoInstall.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })

    act(() => {
      window.dispatchEvent(eventoInstall)
    })

    const botaoInstalar = screen.getByRole('button', { name: /Instalar Aplicativo/i })
    expect(botaoInstalar).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(botaoInstalar)
    })

    expect(promptMock).toHaveBeenCalledTimes(1)
  })

  it('deve permitir dispensar o banner clicando no botao de fechar e persistir na sessao', () => {
    mockUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      false
    )

    render(<PwaInstallBanner />)

    const btnFechar = screen.getByRole('button', { name: /Fechar aviso de instalacao/i })
    fireEvent.click(btnFechar)

    expect(screen.queryByText(/Instale o aplicativo Obras Jooy/i)).not.toBeInTheDocument()
    expect(sessionStorage.getItem(CHAVE_BANNER_PWA_DISPENSADO)).toBe('true')
  })
})
