import { useLocation } from 'react-router-dom'
import { useUpdatePrompt } from '../pwa/useUpdatePrompt'
import './UpdateBar.css'

/** Auf diesen Pfaden darf der Update-Balken erscheinen – nie im Spiel. */
function isCalmScreen(pathname: string) {
  if (pathname.includes('/spiel/')) return false
  return (
    pathname === '/' ||
    pathname.startsWith('/kinder') ||
    pathname.startsWith('/eltern') ||
    pathname.startsWith('/onboarding')
  )
}

export function UpdateBar() {
  const { needsRefresh, update, dismiss } = useUpdatePrompt()
  const { pathname } = useLocation()

  if (!needsRefresh || !isCalmScreen(pathname)) return null

  return (
    <div className="ww-updatebar" role="status">
      <span>Neue Version verfügbar</span>
      <div className="ww-updatebar__actions">
        <button type="button" className="ww-updatebar__btn" onClick={update}>
          Neu laden
        </button>
        <button
          type="button"
          className="ww-updatebar__btn ww-updatebar__btn--ghost"
          onClick={dismiss}
          aria-label="Hinweis schließen"
        >
          Später
        </button>
      </div>
    </div>
  )
}
