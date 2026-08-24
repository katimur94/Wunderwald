import { milestonesOf } from '../learning/adaptivity'
import type { WorldId } from '../db/types'
import './ProgressPath.css'

interface Props {
  worldId: WorldId
  level: number
}

/**
 * Meilenstein-Kette der Welt. Zeigt bewusst KEINE Stufenzahl —
 * Kinder sehen Titel und einen Weg, keine Bewertung.
 */
export function ProgressPath({ worldId, level }: Props) {
  const stones = milestonesOf(worldId)
  const pct = Math.min(100, Math.max(0, ((level - 1) / 9) * 100))

  return (
    <div className={`ww-path ww-path--${worldId}`} aria-label="Dein Weg in dieser Welt">
      <div className="ww-path__line">
        <div className="ww-path__fill" style={{ width: `${pct}%` }} />
      </div>
      <ol className="ww-path__stones">
        {stones.map((m) => {
          const reached = level >= m.level
          return (
            <li key={m.id} className={`ww-path__stone ${reached ? 'ww-path__stone--on' : ''}`}>
              <span className="ww-path__mark" aria-hidden="true">
                {reached ? '★' : '·'}
              </span>
              <span className="ww-path__label">{m.title.split('-')[1] ?? m.title}</span>
              <span className="ww-sr">{m.title}{reached ? ' – erreicht' : ''}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
