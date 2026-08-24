import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let gespeichert: BeforeInstallPromptEvent | null = null

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Chrome/Edge zeigen sonst ihren eigenen Banner – wir bieten den Knopf im
    // Elternbereich an, damit Kinder nicht versehentlich installieren.
    e.preventDefault()
    gespeichert = e as BeforeInstallPromptEvent
    window.dispatchEvent(new CustomEvent('ww-installable'))
  })
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(gespeichert !== null)

  useEffect(() => {
    const an = () => setCanInstall(true)
    const aus = () => setCanInstall(false)
    window.addEventListener('ww-installable', an)
    window.addEventListener('appinstalled', aus)
    return () => {
      window.removeEventListener('ww-installable', an)
      window.removeEventListener('appinstalled', aus)
    }
  }, [])

  return {
    canInstall,
    async install() {
      if (!gespeichert) return
      await gespeichert.prompt()
      await gespeichert.userChoice
      gespeichert = null
      setCanInstall(false)
    },
  }
}
