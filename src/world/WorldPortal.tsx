import type { CSSProperties } from 'react'
import './WorldPortal.css'

type PortalId = 'zahlen' | 'buchstaben' | 'logik' | 'entdecker' | 'wald'

interface Props {
  worldId: PortalId
  /** Anzeigetext – darf weiche Trennstriche (\u00AD) enthalten */
  title: string
  onClick: () => void
  style?: CSSProperties
}

/** Weiche Trennstriche gehören nicht in Vorlese- oder Screenreader-Texte. */
function plain(text: string) {
  return text.replace(/\u00AD/g, '')
}

/**
 * Die vier Ziele auf der Weltkarte. Jedes Portal ist eigenständig gezeichnet —
 * keine Icon-Font, kein Bild-Asset.
 */
export function WorldPortal({ worldId, title, onClick, style }: Props) {
  return (
    <button
      type="button"
      className={`ww-portal ww-portal--${worldId}`}
      onClick={onClick}
      style={style}
      aria-label={plain(title)}
    >
      <span className="ww-portal__art" aria-hidden="true">
        {worldId === 'zahlen' && <ZahlenPortal />}
        {worldId === 'buchstaben' && <BuchstabenPortal />}
        {worldId === 'logik' && <LogikPortal />}
        {worldId === 'entdecker' && <EntdeckerPortal />}
        {worldId === 'wald' && <GartenPortal />}
      </span>
      <span className="ww-portal__title">{title}</span>
    </button>
  )
}

/** Zahlen-Torbogen */
function ZahlenPortal() {
  return (
    <svg viewBox="0 0 120 100" width="100%" height="100%">
      <path
        d="M22 96 L22 52 A38 38 0 0 1 98 52 L98 96"
        fill="#FFF0CB"
        stroke="#2E4034"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M14 96 L106 96" stroke="#2E4034" strokeWidth="6" strokeLinecap="round" />
      {[
        ['3', 33, 44], ['1', 52, 28], ['7', 72, 30], ['5', 90, 48],
      ].map(([t, x, y]) => (
        <text
          key={t as string}
          x={x as number}
          y={y as number}
          fontSize="20"
          fontFamily="Fredoka, sans-serif"
          fontWeight="600"
          fill="#D99F22"
          stroke="#2E4034"
          strokeWidth="1.2"
          textAnchor="middle"
        >
          {t}
        </text>
      ))}
      <circle cx="60" cy="70" r="15" fill="#F6BD41" stroke="#2E4034" strokeWidth="4" />
      <text x="60" y="78" fontSize="20" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">
        2
      </text>
    </svg>
  )
}

/** Buchstaben-Bäume */
function BuchstabenPortal() {
  return (
    <svg viewBox="0 0 120 100" width="100%" height="100%">
      <path d="M14 96 L106 96" stroke="#2E4034" strokeWidth="6" strokeLinecap="round" />
      <rect x="26" y="58" width="9" height="38" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <circle cx="30.5" cy="46" r="24" fill="#7FB069" stroke="#2E4034" strokeWidth="5" />
      <text x="30.5" y="55" fontSize="26" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">A</text>

      <rect x="86" y="62" width="8" height="34" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <circle cx="90" cy="52" r="20" fill="#63914F" stroke="#2E4034" strokeWidth="5" />
      <text x="90" y="60" fontSize="22" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#FBFDF8" textAnchor="middle">B</text>

      <rect x="57" y="70" width="7" height="26" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <circle cx="60.5" cy="64" r="16" fill="#8FBF78" stroke="#2E4034" strokeWidth="5" />
      <text x="60.5" y="71" fontSize="18" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">C</text>
    </svg>
  )
}

/** Baumhaus mit Zahnrädern */
function LogikPortal() {
  return (
    <svg viewBox="0 0 120 100" width="100%" height="100%">
      <path d="M14 96 L106 96" stroke="#2E4034" strokeWidth="6" strokeLinecap="round" />
      <rect x="52" y="56" width="14" height="40" fill="#8E6842" stroke="#2E4034" strokeWidth="4" />
      {/* Haus */}
      <rect x="30" y="40" width="60" height="34" rx="6" fill="#C6A9E6" stroke="#2E4034" strokeWidth="5" />
      <path d="M24 42 L60 16 L96 42 Z" fill="#9A7FC9" stroke="#2E4034" strokeWidth="5" strokeLinejoin="round" />
      <rect x="52" y="52" width="16" height="22" rx="3" fill="#FFF0CB" stroke="#2E4034" strokeWidth="4" />
      {/* Zahnräder */}
      <Gear cx={36} cy={54} r={9} fill="#F6BD41" />
      <Gear cx={84} cy={58} r={7} fill="#6FB5C9" />
    </svg>
  )
}

function Gear({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2
    const x = cx + Math.cos(a) * (r + 3.5)
    const y = cy + Math.sin(a) * (r + 3.5)
    return <circle key={i} cx={x} cy={y} r={2.4} fill={fill} stroke="#2E4034" strokeWidth="1.6" />
  })
  return (
    <g>
      {teeth}
      <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#2E4034" strokeWidth="3.5" />
      <circle cx={cx} cy={cy} r={r * 0.34} fill="#FBFDF8" stroke="#2E4034" strokeWidth="2.4" />
    </g>
  )
}

/** Rennwagen auf der Wiese mit Zielflagge */
function EntdeckerPortal() {
  return (
    <svg viewBox="0 0 120 100" width="100%" height="100%">
      <path d="M6 96 Q40 82 60 90 Q86 100 114 86 L114 96 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      {/* Zielflagge */}
      <rect x="92" y="22" width="4" height="52" fill="#8E6842" stroke="#2E4034" strokeWidth="2.5" />
      <path d="M96 22 L120 22 L120 44 L96 44 Z" fill="#FBFDF8" stroke="#2E4034" strokeWidth="3" />
      {[0, 1, 2].map((i) =>
        [0, 1].map((j) =>
          (i + j) % 2 === 0 ? (
            <rect key={`${i}${j}`} x={96 + i * 8} y={22 + j * 11} width="8" height="11" fill="#2E4034" />
          ) : null,
        ),
      )}
      {/* Straße */}
      <path d="M10 82 Q60 60 110 82" fill="none" stroke="#8E8E8E" strokeWidth="14" strokeLinecap="round" />
      <path d="M10 82 Q60 60 110 82" fill="none" stroke="#FBFDF8" strokeWidth="2" strokeDasharray="6 8" />
      {/* Kart */}
      <g transform="translate(30 40)">
        <rect x="6" y="18" width="48" height="18" rx="7" fill="#E4634F" stroke="#2E4034" strokeWidth="4" />
        <path d="M14 18 L20 6 L42 6 L48 18 Z" fill="#F6BD41" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="31" cy="8" r="7" fill="#FFF0CB" stroke="#2E4034" strokeWidth="3" />
        <circle cx="16" cy="37" r="7" fill="#2E4034" />
        <circle cx="16" cy="37" r="3" fill="#FBFDF8" />
        <circle cx="46" cy="37" r="7" fill="#2E4034" />
        <circle cx="46" cy="37" r="3" fill="#FBFDF8" />
        <path d="M0 26 L-10 22 M0 30 L-12 30" stroke="#6FB5C9" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Der eigene Garten: Beet, Sonnenblume, Gießkanne */
function GartenPortal() {
  return (
    <svg viewBox="0 0 120 100" width="100%" height="100%">
      <path d="M6 96 Q40 84 60 90 Q86 98 114 86 L114 96 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      {/* Beet */}
      <path d="M14 78 Q60 66 106 78 L106 90 Q60 80 14 90 Z" fill="#8E6842" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      {/* Sonnenblume */}
      <path d="M60 78 L60 40" stroke="#4C7B45" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 62 Q46 58 44 48 Q56 50 60 62 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="3" strokeLinejoin="round" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2
        return (
          <ellipse
            key={i}
            cx={60 + Math.cos(a) * 15}
            cy={34 + Math.sin(a) * 15}
            rx="6"
            ry="4"
            transform={`rotate(${(a * 180) / Math.PI} ${60 + Math.cos(a) * 15} ${34 + Math.sin(a) * 15})`}
            fill="#F6BD41"
            stroke="#2E4034"
            strokeWidth="2.5"
          />
        )
      })}
      <circle cx="60" cy="34" r="9" fill="#8E6842" stroke="#2E4034" strokeWidth="3" />
      {/* Tulpe und Möhre */}
      <path d="M30 78 L30 60" stroke="#4C7B45" strokeWidth="4" strokeLinecap="round" />
      <path d="M22 60 L24 46 L30 52 L36 46 L38 60 Z" fill="#E4634F" stroke="#2E4034" strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 66 L86 82 L94 82 Z" fill="#F08A3C" stroke="#2E4034" strokeWidth="3" strokeLinejoin="round" />
      <path d="M90 66 L84 56 M90 66 L90 54 M90 66 L96 56" stroke="#4C7B45" strokeWidth="3" strokeLinecap="round" />
      {/* Gießkanne */}
      <g transform="translate(6 18)">
        <rect x="8" y="10" width="22" height="18" rx="4" fill="#6FB5C9" stroke="#2E4034" strokeWidth="3" />
        <path d="M30 16 L42 8 M40 6 L46 12" stroke="#2E4034" strokeWidth="3" strokeLinecap="round" />
        <path d="M8 14 Q0 18 8 24" fill="none" stroke="#2E4034" strokeWidth="3" />
        <circle cx="48" cy="18" r="1.8" fill="#6FB5C9" />
        <circle cx="52" cy="24" r="1.8" fill="#6FB5C9" />
        <circle cx="46" cy="26" r="1.8" fill="#6FB5C9" />
      </g>
    </svg>
  )
}

/** Der frühere Wald-Torbogen bleibt für alte Verweise erhalten. */
export function WaldPortal() {
  return (
    <svg viewBox="0 0 120 100" width="100%" height="100%">
      <path d="M6 96 Q40 80 60 88 Q86 98 114 84 L114 96 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      <rect x="55" y="56" width="10" height="34" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <circle cx="60" cy="42" r="26" fill="#2F6B4F" stroke="#2E4034" strokeWidth="5" />
      <circle cx="34" cy="54" r="15" fill="#3C7E5D" stroke="#2E4034" strokeWidth="4" />
      <circle cx="86" cy="54" r="15" fill="#3C7E5D" stroke="#2E4034" strokeWidth="4" />
      <path
        d="M60 26 l5.5 11.5 12.5 1.6 -9.2 8.7 2.4 12.5 -11.2-6.2 -11.2 6.2 2.4-12.5 -9.2-8.7 12.5-1.6 z"
        fill="#F6BD41"
        stroke="#2E4034"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="22" cy="86" rx="7" ry="5" fill="#E4634F" stroke="#2E4034" strokeWidth="3" />
      <ellipse cx="100" cy="88" rx="6" ry="4.5" fill="#9A7FC9" stroke="#2E4034" strokeWidth="3" />
    </svg>
  )
}
