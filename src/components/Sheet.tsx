import { useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import './Sheet.css'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  /** Rechts neben der Überschrift, z. B. der Stern-Zähler */
  aside?: ReactNode
}

/**
 * Die von unten einfahrende Leiste (Shop, Outfits).
 * Schließt per ✕, per Tippen daneben und per Escape — Kinder tippen
 * erfahrungsgemäß irgendwohin, nicht auf das kleine Kreuz.
 */
export function Sheet({ title, onClose, children, aside }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <motion.div
        className="ww-sheet__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        className="ww-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="ww-sheet__griff" aria-hidden="true" />
        <div className="ww-sheet__head">
          <h2>{title}</h2>
          {aside}
          <button type="button" className="ww-iconbtn" onClick={onClose} aria-label="Schließen">
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {children}
      </motion.div>
    </>
  )
}
