import { AnimatePresence, motion } from 'framer-motion'
import './SpeechBubble.css'

interface Props {
  text: string
  side?: 'right' | 'left' | 'top'
  compact?: boolean
}

/**
 * Funkels Sprechblase. Läuft IMMER parallel zur Sprachausgabe —
 * damit die App auch mit abgeschaltetem Ton vollständig nutzbar bleibt.
 */
export function SpeechBubble({ text, side = 'right', compact = false }: Props) {
  return (
    <AnimatePresence mode="wait">
      {text && (
        <motion.p
          key={text}
          className={`ww-bubble ww-bubble--${side} ${compact ? 'ww-bubble--compact' : ''}`}
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="status"
          aria-live="polite"
        >
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
