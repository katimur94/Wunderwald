import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { sfx } from '../audio/AudioManager'
import './ChoiceRow.css'

interface Props<T extends string | number> {
  options: T[]
  onPick: (v: T) => void
  /** Wert, der gerade falsch getippt wurde – wackelt kurz */
  wrongValue?: T | null
  /** Lösung hervorheben (Funkel zeigt sie nach dem 2. Fehler) */
  highlight?: T | null
  /** Eigene Darstellung je Option */
  render?: (v: T) => ReactNode
  /** Optische Variante */
  variant?: 'zahl' | 'stein' | 'blatt' | 'perle'
  ariaLabel?: (v: T) => string
  disabled?: boolean
}

/**
 * Die Antwortreihe aller Auswahl-Spiele.
 * Ziele sind mindestens 64×64 px groß und stehen mindestens 12 px auseinander.
 */
export function ChoiceRow<T extends string | number>({
  options,
  onPick,
  wrongValue = null,
  highlight = null,
  render,
  variant = 'zahl',
  ariaLabel,
  disabled = false,
}: Props<T>) {
  return (
    <div className={`ww-choices ww-choices--${variant}`} role="group">
      {options.map((v, i) => {
        const isWrong = wrongValue !== null && wrongValue === v
        const isHi = highlight !== null && highlight === v
        return (
          <motion.button
            key={`${v}-${i}`}
            type="button"
            className={`ww-choice ${isHi ? 'ww-choice--hi' : ''}`}
            onClick={() => {
              if (disabled) return
              sfx('click')
              onPick(v)
            }}
            disabled={disabled}
            aria-label={ariaLabel?.(v) ?? String(v)}
            animate={
              isWrong
                ? { x: [0, -9, 9, -6, 6, 0], rotate: [0, -2, 2, -1, 1, 0] }
                : isHi
                  ? { scale: [1, 1.09, 1] }
                  : { x: 0, scale: 1 }
            }
            transition={isHi ? { duration: 0.9, repeat: Infinity } : { duration: 0.42 }}
          >
            {render ? render(v) : v}
          </motion.button>
        )
      })}
    </div>
  )
}
