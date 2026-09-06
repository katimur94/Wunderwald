import './Uhr.css'

interface Props {
  stunde: number
  minute: number
  size?: number
  /** Ziffern 1–12 anzeigen (Anfängerstufen) */
  ziffern?: boolean
  className?: string
}

/**
 * Analoge Uhr als Inline-SVG — für die Wissensbank und den Zeit-Turm.
 * Der Stundenzeiger wandert mit den Minuten weiter, so wie bei einer
 * echten Uhr: Um halb vier steht er zwischen der 3 und der 4.
 */
export function Uhr({ stunde, minute, size = 120, ziffern = true, className = '' }: Props) {
  const h = ((stunde % 12) + minute / 60) * 30
  const m = minute * 6
  const r = 50
  const zeiger = (winkel: number, laenge: number, dicke: number, farbe: string) => {
    const rad = ((winkel - 90) * Math.PI) / 180
    return (
      <line
        x1={r}
        y1={r}
        x2={r + Math.cos(rad) * laenge}
        y2={r + Math.sin(rad) * laenge}
        stroke={farbe}
        strokeWidth={dicke}
        strokeLinecap="round"
      />
    )
  }
  return (
    <svg
      className={`ww-uhr ${className}`}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Uhr zeigt ${stunde} Uhr ${minute}`}
    >
      <circle cx={r} cy={r} r={47} fill="#FBFDF8" stroke="#2E4034" strokeWidth="4" />
      {Array.from({ length: 60 }, (_, i) => {
        const rad = (i * 6 * Math.PI) / 180
        const gross = i % 5 === 0
        const innen = gross ? 38 : 41
        return (
          <line
            key={i}
            x1={r + Math.cos(rad) * innen}
            y1={r + Math.sin(rad) * innen}
            x2={r + Math.cos(rad) * 44}
            y2={r + Math.sin(rad) * 44}
            stroke="#2E4034"
            strokeWidth={gross ? 2.4 : 1}
          />
        )
      })}
      {ziffern &&
        Array.from({ length: 12 }, (_, i) => {
          const z = i + 1
          const rad = ((z * 30 - 90) * Math.PI) / 180
          return (
            <text
              key={z}
              x={r + Math.cos(rad) * 31}
              y={r + Math.sin(rad) * 31 + 3.5}
              textAnchor="middle"
              fontSize="10"
              fontFamily="Fredoka, sans-serif"
              fontWeight="600"
              fill="#2E4034"
            >
              {z}
            </text>
          )
        })}
      {zeiger(h, 20, 5, '#2E4034')}
      {zeiger(m, 32, 3.5, '#E4634F')}
      <circle cx={r} cy={r} r={3.2} fill="#2E4034" />
    </svg>
  )
}
