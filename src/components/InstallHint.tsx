import { useEffect, useState } from 'react'
import { useApp } from '../store/useApp'
import './InstallHint.css'

export function isIos(): boolean {
  const ua = navigator.userAgent
  const iOsUa = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ meldet sich als Mac – über Touch-Punkte erkennbar.
  const iPadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  return iOsUa || iPadOs
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // Safari-eigene Property
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/**
 * iOS zeigt keinen automatischen Installations-Prompt. Deshalb hier eine
 * einmalige, wegklickbare Karte mit der Anleitung.
 */
export function InstallHint() {
  const { family, saveSettings } = useApp()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!family) return
    if (family.settings?.installHintDismissed) return
    setShow(isIos() && !isStandalone())
  }, [family])

  if (!show) return null

  return (
    <aside className="ww-installhint">
      <div className="ww-installhint__body">
        <strong>Wunderwald auf den Home-Bildschirm legen</strong>
        <p className="ww-hint">
          Tippen Sie unten in Safari auf <span aria-hidden="true">􀈂</span>{' '}
          <strong>Teilen</strong> und dann auf <strong>„Zum Home-Bildschirm“</strong>. Danach
          startet Wunderwald wie eine echte App — auch ohne Internet.
        </p>
      </div>
      <button
        type="button"
        className="ww-installhint__close"
        aria-label="Hinweis nicht mehr anzeigen"
        onClick={() => {
          setShow(false)
          void saveSettings({ installHintDismissed: true })
        }}
      >
        ✕
      </button>
    </aside>
  )
}
