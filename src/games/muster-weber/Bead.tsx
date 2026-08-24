export interface BeadSpec {
  farbe: string
  form: string
  gross: boolean
  /** Anzahl der Symbole im Feld – nur in der 3×3-Matrix ab Stufe 10 */
  anzahl: number
}

interface Props {
  spec: BeadSpec
  size?: number
}

/**
 * Eine Perle: Farbe, Form, Größe und Anzahl sind die vier Dimensionen.
 *
 * Gezeichnet wird alles in EIN SVG mit fester Zeichenfläche (100×100).
 * Damit skaliert die Perle vollständig über CSS mit — auf einem 360-px-Handy
 * passen sieben Perlen nebeneinander, ohne umzubrechen.
 */
export function Bead({ spec, size = 54 }: Props) {
  const anzahl = Math.max(1, spec.anzahl)
  const gross = spec.gross ? 1 : 0.62
  const zelle = 100 / anzahl
  const skala = (zelle / 100) * gross * 0.94
  // Kontur mitskalieren, sonst verschwindet sie bei kleinen Symbolen
  const strichbreite = 6 / Math.max(0.34, skala) / 12 + 3.5

  return (
    <span
      className="ww-bead"
      style={{ width: size, height: size }}
      role="img"
      aria-label={beschreibe(spec)}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
        {Array.from({ length: anzahl }).map((_, i) => (
          <g key={i} transform={`translate(${i * zelle + zelle / 2} 50) scale(${skala})`}>
            <g transform="translate(-50 -50)">
              <Shape form={spec.form} farbe={spec.farbe} strichbreite={strichbreite} />
            </g>
          </g>
        ))}
      </svg>
    </span>
  )
}

function Shape({
  form,
  farbe,
  strichbreite,
}: {
  form: string
  farbe: string
  strichbreite: number
}) {
  const common = {
    fill: farbe,
    stroke: '#2E4034',
    strokeWidth: strichbreite,
    strokeLinejoin: 'round' as const,
  }
  switch (form) {
    case 'quadrat':
      return <rect x="10" y="10" width="80" height="80" rx="12" {...common} />
    case 'stern':
      return <path d="M50 6 l12 27 30 3 -22 20 6 30 -26-15 -26 15 6-30 -22-20 30-3 z" {...common} />
    case 'herz':
      return (
        <path
          d="M50 88 C10 60 12 22 34 22 C44 22 50 30 50 34 C50 30 56 22 66 22 C88 22 90 60 50 88 Z"
          {...common}
        />
      )
    case 'dreieck':
      return <path d="M50 12 L90 82 L10 82 Z" {...common} />
    case 'kreis':
    default:
      return <circle cx="50" cy="50" r="42" {...common} />
  }
}

const FORM_NAMEN: Record<string, string> = {
  kreis: 'Kreis',
  quadrat: 'Quadrat',
  stern: 'Stern',
  herz: 'Herz',
  dreieck: 'Dreieck',
}

const FARB_NAMEN: Record<string, string> = {
  '#E4634F': 'roter',
  '#6FB5C9': 'blauer',
  '#F6BD41': 'gelber',
  '#7FB069': 'grüner',
  '#9A7FC9': 'lila',
}

export function beschreibe(spec: BeadSpec): string {
  const groesse = spec.gross ? '' : 'kleiner '
  const farbe = FARB_NAMEN[spec.farbe] ?? ''
  const form = FORM_NAMEN[spec.form] ?? 'Perle'
  const anzahl = spec.anzahl > 1 ? `${spec.anzahl} mal ` : ''
  return `${anzahl}${groesse}${farbe} ${form}`.trim()
}
