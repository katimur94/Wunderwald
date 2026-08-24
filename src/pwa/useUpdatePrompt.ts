import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * Meldet, wenn ein neuer Service Worker bereitsteht.
 * Der Balken wird bewusst NUR auf ruhigen Screens angezeigt (Kind-Auswahl,
 * Elternbereich) – niemals mitten in einem Spiel.
 */
let applyUpdate: (reload?: boolean) => Promise<void> = async () => {}
let listeners: Array<(v: boolean) => void> = []
let ready = false
let registered = false

function setReady(v: boolean) {
  ready = v
  listeners.forEach((l) => l(v))
}

function ensureRegistered() {
  if (registered) return
  registered = true
  try {
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh() {
        setReady(true)
      },
    })
  } catch {
    /* Kein Service-Worker-Support – App läuft trotzdem. */
  }
}

export function useUpdatePrompt() {
  const [needsRefresh, setNeedsRefresh] = useState(ready)

  useEffect(() => {
    ensureRegistered()
    const listener = (v: boolean) => setNeedsRefresh(v)
    listeners.push(listener)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  return {
    needsRefresh,
    update: () => {
      setReady(false)
      void applyUpdate(true)
    },
    dismiss: () => setReady(false),
  }
}
