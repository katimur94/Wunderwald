import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import './Confetti.css'

const COLORS = ['#F6BD41', '#E4634F', '#7FB069', '#6FB5C9', '#9A7FC9']

interface Props {
  active: boolean
  count?: number
}

/**
 * Konfetti für Belohnungsmomente.
 * Bei `prefers-reduced-motion` wird daraus ein ruhiger Farbschimmer —
 * kein Flug, kein Wirbel.
 */
export function Confetti({ active, count = 26 }: Props) {
  const reduce = useReducedMotion()
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        color: COLORS[i % COLORS.length],
        delay: (i % 9) * 0.09,
        drift: ((i % 5) - 2) * 26,
        rot: (i % 2 ? 1 : -1) * (180 + (i % 5) * 60),
        size: 8 + (i % 4) * 3,
      })),
    [count],
  )

  if (!active) return null

  if (reduce) {
    return <div className="ww-confetti ww-confetti--calm" aria-hidden="true" />
  }

  return (
    <div className="ww-confetti" aria-hidden="true">
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="ww-confetti__bit"
          style={{ left: `${b.left}%`, background: b.color, width: b.size, height: b.size * 1.6 }}
          initial={{ y: -40, opacity: 0, rotate: 0 }}
          animate={{ y: '105vh', x: b.drift, opacity: [0, 1, 1, 0], rotate: b.rot }}
          transition={{ duration: 2.6, delay: b.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}
