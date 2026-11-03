import { useEffect, useState } from 'react'

const KEY = 'obras-theme'

export type Theme = 'light' | 'dark'

function matchesDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark') {
      return stored
    }
  } catch {
    // Ignore storage errors
  }
  return matchesDark() ? 'dark' : 'light'
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const isDark = theme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Ignore storage errors
    }
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const stored = localStorage.getItem(KEY)
        if (!stored) {
          setThemeState(e.matches ? 'dark' : 'light')
        }
      } catch {
        // Ignore
      }
    }

    mediaQuery.addEventListener?.('change', handleChange)
    return () => mediaQuery.removeEventListener?.('change', handleChange)
  }, [])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return { theme, toggleTheme, setTheme, isDark: theme === 'dark' }
}
