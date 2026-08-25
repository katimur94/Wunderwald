import type { WorldId } from '../db/types'
import type { Rng } from './rng'
import { pick } from './rng'
import { gamesOfWorld, getGame, type AnyGameModule } from './registry'
import type { GameComponentProps, GameModule, GameTask } from './types'

/**
 * Mix-Runde („Überraschung"): sechs Aufgaben, jede aus einem zufällig
 * gezogenen Spiel derselben Welt.
 *
 * Bewusst **kein** eigenes Spiel: Die Runde zieht die vorhandenen
 * Generatoren und rendert die vorhandenen Komponenten. Neue Spiele sind
 * automatisch dabei, ohne dass hier etwas nachgetragen werden muss.
 */

export interface MixData {
  /** Aus welchem Spiel diese Aufgabe stammt */
  quelle: string
  /** Die Aufgabe dieses Spiels, unverändert */
  inner: GameTask
}

export type MixTask = GameTask<MixData>

/**
 * Spiele, die sich mischen lassen. Ausgenommen sind Spiele, deren Runde aus
 * genau einem Brett besteht (Memory): Ein Brett ist eine ganze Runde, keine
 * einzelne Aufgabe, und es bräuchte zudem die volle Spielfläche.
 */
export function mischbareSpiele(worldId: WorldId): AnyGameModule[] {
  return gamesOfWorld(worldId).filter(
    (g) => !g.id.startsWith('mix-') && g.tasksPerRound === undefined && !g.fillsStage,
  )
}

function MixComponent(props: GameComponentProps<MixTask>) {
  const { quelle, inner } = props.task.data
  const modul = getGame(quelle)
  if (!modul) return null
  const Inner = modul.Component
  return <Inner {...props} task={inner as never} />
}

export function makeMixModule(worldId: WorldId): GameModule<MixTask> {
  return {
    id: `mix-${worldId}`,
    worldId,
    title: 'Überraschung',
    subtitle: 'Bunt gemischt aus dieser Welt',
    icon: (
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <path
          d="M40 8 L47 30 L69 37 L47 44 L40 66 L33 44 L11 37 L33 30 Z"
          fill="#F6BD41"
          stroke="#2E4034"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle cx="17" cy="16" r="5" fill="#7FB069" stroke="#2E4034" strokeWidth="3" />
        <circle cx="64" cy="62" r="6" fill="#E4634F" stroke="#2E4034" strokeWidth="3" />
      </svg>
    ),
    generateTask(difficulty: number, rng: Rng): MixTask {
      const pool = mischbareSpiele(worldId)
      const gezogen = pick(rng, pool)
      const inner = gezogen.generateTask(difficulty, rng)
      return { data: { quelle: gezogen.id, inner }, answer: inner.answer, speak: inner.speak }
    },
    Component: MixComponent,
    // Der Versuch wird auf das gezogene Spiel gebucht, nicht auf die Mix-Runde.
    attemptGameId: (task) => (task as MixTask).data.quelle,
  }
}
