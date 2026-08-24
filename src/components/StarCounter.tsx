import { motion } from 'framer-motion'
import './StarCounter.css'

interface Props {
  stars: number
  size?: 's' | 'm' | 'l'
  bump?: boolean
}

/** Der Stern-Zähler: Guthaben des Kindes, immer sichtbar auf der Weltkarte. */
export function StarCounter({ stars, size = 'm', bump = false }: Props) {
  return (
    <motion.span
      className={`ww-stars ww-stars--${size}`}
      animate={bump ? { scale: [1, 1.22, 1] } : { scale: 1 }}
      transition={{ duration: 0.45 }}
      aria-label={`${stars} Sterne`}
    >
      <span className="ww-stars__icon" aria-hidden="true">⭐</span>
      <span className="ww-stars__num">{stars}</span>
    </motion.span>
  )
}
