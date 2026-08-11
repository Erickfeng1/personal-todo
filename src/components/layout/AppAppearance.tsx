import { useEffect } from 'react'
import { useSettings } from '../../hooks/useSettings'

const LIGHT_THEME_COLOR = '#f4f0e8'
const DARK_THEME_COLOR = '#121a17'

function updateThemeColor(isDark: boolean): void {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR)
}

export function AppAppearance() {
  const settings = useSettings()
  const theme = settings?.theme ?? 'system'

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') delete root.dataset.theme
    else root.dataset.theme = theme

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const syncThemeColor = () =>
      updateThemeColor(
        theme === 'dark' || (theme === 'system' && media.matches)
      )
    syncThemeColor()
    media.addEventListener('change', syncThemeColor)
    return () => media.removeEventListener('change', syncThemeColor)
  }, [theme])

  return null
}
