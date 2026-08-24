import { motion } from 'framer-motion'
import './Funkel.css'

export type FunkelState = 'idle' | 'spricht' | 'jubelt' | 'troestet' | 'muede'

interface Props {
  state?: FunkelState
  size?: number
  outfitId?: string | null
  className?: string
}

/**
 * Funkel, der Begleiter-Fuchs. Reines Inline-SVG — skaliert scharf,
 * lädt nichts nach und lässt sich pro Zustand animieren.
 */
export function Funkel({ state = 'idle', size = 120, outfitId = null, className = '' }: Props) {
  const jubelt = state === 'jubelt'
  const troestet = state === 'troestet'
  const muede = state === 'muede'
  const spricht = state === 'spricht'

  return (
    <motion.div
      className={`ww-funkel ww-funkel--${state} ${className}`}
      style={{ width: size, height: size }}
      animate={
        jubelt
          ? { y: [0, -16, 0, -9, 0], rotate: [0, -4, 4, -2, 0] }
          : muede
            ? { y: [0, 2, 0], rotate: 0 }
            : { y: [0, -4, 0], rotate: troestet ? -8 : 0 }
      }
      transition={
        jubelt
          ? { duration: 0.85, times: [0, 0.25, 0.5, 0.75, 1] }
          : { duration: muede ? 4.5 : 3.2, repeat: Infinity, ease: 'easeInOut' }
      }
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 120" width="100%" height="100%">
        {/* Schwanz – wippt im Leerlauf */}
        <motion.g
          style={{ originX: '0.72', originY: '0.78' }}
          animate={muede ? { rotate: 0 } : { rotate: [0, 9, 0, -6, 0] }}
          transition={{ duration: jubelt ? 0.6 : 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* buschiger Schwanz mit heller Spitze */}
          <path
            d="M82 96 Q112 96 116 68 Q119 42 98 34 Q104 54 94 68 Q84 80 82 96 Z"
            fill="#E4634F"
            stroke="#2E4034"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M98 34 Q119 42 116 68 Q108 60 106 46 Q104 38 98 34 Z"
            fill="#FBFDF8"
            stroke="#2E4034"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
        </motion.g>

        {/* Körper */}
        <ellipse cx="56" cy="86" rx="30" ry="24" fill="#E4634F" stroke="#2E4034" strokeWidth="4" />
        <ellipse cx="56" cy="94" rx="18" ry="14" fill="#FBFDF8" stroke="#2E4034" strokeWidth="3" />

        {/* Pfote – hebt sich beim Trösten */}
        <motion.ellipse
          cx="34"
          rx="9"
          ry="7"
          fill="#E4634F"
          stroke="#2E4034"
          strokeWidth="3.5"
          initial={{ cy: 98 }}
          animate={troestet ? { cy: [98, 84, 98] } : { cy: 98 }}
          transition={{ duration: 1.6, repeat: troestet ? Infinity : 0, ease: 'easeInOut' }}
        />
        <ellipse cx="78" cy="98" rx="9" ry="7" fill="#E4634F" stroke="#2E4034" strokeWidth="3.5" />

        {/* Kopf */}
        <g transform={troestet ? 'rotate(-9 58 44)' : undefined}>
          {/* Ohren – spitz, mit hellem Innenohr */}
          <path d="M33 28 L27 4 L52 20 Z" fill="#E4634F" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
          <path d="M83 28 L89 4 L64 20 Z" fill="#E4634F" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
          <path d="M35.5 25 L32 12 L45.5 21 Z" fill="#F6BD41" />
          <path d="M80.5 25 L84 12 L70.5 21 Z" fill="#F6BD41" />

          {/* Wangenbüschel */}
          <path d="M28 40 Q18 50 26 62 Q32 56 32 46 Z" fill="#E4634F" stroke="#2E4034" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M88 40 Q98 50 90 62 Q84 56 84 46 Z" fill="#E4634F" stroke="#2E4034" strokeWidth="3.5" strokeLinejoin="round" />

          {/* Gesicht */}
          <ellipse cx="58" cy="44" rx="31" ry="26" fill="#E4634F" stroke="#2E4034" strokeWidth="4" />

          {/* Schnauze – klein, nur um die Nase herum */}
          <path
            d="M58 44 Q38 46 40 58 Q46 68 58 68 Q70 68 76 58 Q78 46 58 44 Z"
            fill="#FBFDF8"
            stroke="#2E4034"
            strokeWidth="3"
            strokeLinejoin="round"
          />

          {/* Stirnfleck */}
          <path d="M58 20 Q50 30 52 42 Q58 38 64 42 Q66 30 58 20 Z" fill="#FBFDF8" opacity="0.55" />

          {/* Augen – blinzeln im Leerlauf, zu bei müde */}
          {muede ? (
            <>
              <path d="M40 42 q7 6 13 0" fill="none" stroke="#2E4034" strokeWidth="4" strokeLinecap="round" />
              <path d="M65 42 q7 6 13 0" fill="none" stroke="#2E4034" strokeWidth="4" strokeLinecap="round" />
            </>
          ) : (
            <>
              <motion.ellipse
                cx="46" cy="41" rx="5" fill="#2E4034"
                initial={{ ry: 6 }}
                animate={{ ry: [6, 6, 0.6, 6] }}
                transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.86, 0.92, 1] }}
              />
              <motion.ellipse
                cx="70" cy="41" rx="5" fill="#2E4034"
                initial={{ ry: 6 }}
                animate={{ ry: [6, 6, 0.6, 6] }}
                transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.86, 0.92, 1] }}
              />
              <circle cx="47.8" cy="38.8" r="1.8" fill="#FBFDF8" />
              <circle cx="71.8" cy="38.8" r="1.8" fill="#FBFDF8" />
            </>
          )}

          {/* Nase */}
          <path d="M52 52 Q58 48 64 52 Q58 60 52 52 Z" fill="#2E4034" />

          {/* Mund – wackelt beim Sprechen, lacht beim Jubeln */}
          {spricht ? (
            <motion.ellipse
              cx="58" cy="62" rx="6" fill="#2E4034"
              initial={{ ry: 3.4 }}
              animate={{ ry: [1.4, 4.6, 2.2, 4.6, 1.4] }}
              transition={{ duration: 0.55, repeat: Infinity }}
            />
          ) : jubelt ? (
            <path d="M50 58 q8 10 16 0" fill="#2E4034" stroke="#2E4034" strokeWidth="3" strokeLinejoin="round" />
          ) : troestet ? (
            <path d="M51 63 q7 -5 14 0" fill="none" stroke="#2E4034" strokeWidth="3.5" strokeLinecap="round" />
          ) : (
            <path d="M58 58 q0 5 -6 5 M58 58 q0 5 6 5" fill="none" stroke="#2E4034" strokeWidth="3.5" strokeLinecap="round" />
          )}

          {/* Outfits aus dem Wald-Shop */}
          <Outfit id={outfitId} />
        </g>

        {muede && (
          <motion.g
            animate={{ y: [-2, -14], opacity: [0.9, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <text x="92" y="26" fontSize="18" fill="#6FB5C9" fontFamily="sans-serif">z</text>
            <text x="100" y="16" fontSize="13" fill="#6FB5C9" fontFamily="sans-serif">z</text>
          </motion.g>
        )}
      </svg>
    </motion.div>
  )
}

/** Kleine sichtbare Veränderungen, die Funkel mit dem Level bekommt. */
function Outfit({ id }: { id: string | null }) {
  switch (id) {
    case 'halstuch':
      return (
        <path
          d="M34 66 Q58 80 82 66 L80 75 Q58 88 36 75 Z"
          fill="#6FB5C9"
          stroke="#2E4034"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      )
    case 'hut':
      return (
        <g>
          <path d="M30 22 L86 22 L80 8 L36 8 Z" fill="#2F6B4F" stroke="#2E4034" strokeWidth="3.5" strokeLinejoin="round" />
          <rect x="24" y="20" width="68" height="7" rx="3.5" fill="#7FB069" stroke="#2E4034" strokeWidth="3.5" />
        </g>
      )
    case 'laterne':
      return (
        <g>
          <rect x="90" y="52" width="16" height="18" rx="4" fill="#F6BD41" stroke="#2E4034" strokeWidth="3" />
          <path d="M92 52 q6 -10 12 0" fill="none" stroke="#2E4034" strokeWidth="3" />
        </g>
      )
    case 'krone':
      return (
        <path
          d="M36 18 L44 6 L52 16 L58 2 L64 16 L72 6 L80 18 Z"
          fill="#F6BD41"
          stroke="#2E4034"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      )
    case 'brille':
      return (
        <g fill="none" stroke="#2E4034" strokeWidth="3.5">
          <circle cx="46" cy="41" r="11" />
          <circle cx="70" cy="41" r="11" />
          <path d="M57 41 h2" strokeLinecap="round" />
          <path d="M35 39 l-8 -3" strokeLinecap="round" />
          <path d="M81 39 l8 -3" strokeLinecap="round" />
        </g>
      )
    case 'blatt':
      return (
        <path
          d="M80 18 Q96 10 98 24 Q88 32 80 18 Z"
          fill="#7FB069"
          stroke="#2E4034"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )
    default:
      return null
  }
}
