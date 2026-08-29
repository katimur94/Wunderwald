import { db } from '../db/db'
import { hashSeed, mulberry32, sample } from '../games/rng'
import { dayKey } from './session'
import type { WorldId } from '../db/types'

/**
 * Tagesabenteuer: drei kleine Aufgaben, die aus Datum + Kind-Id gezogen werden.
 * Gleicher Tag + gleiches Kind = gleiche Quests (seeded), aber jedes Kind
 * bekommt andere.
 */
export interface Quest {
  id: string
  label: string
  /** wie oft es passieren muss */
  target: number
  matches: (ev: QuestEvent) => boolean
}

export interface QuestEvent {
  gameId: string
  worldId: WorldId
  /** richtige Aufgaben in dieser Runde */
  correct: number
}

const POOL: Quest[] = [
  {
    id: 'zahlenland',
    label: 'Spiele 1× im Zahlenland',
    target: 1,
    matches: (e) => e.worldId === 'zahlen',
  },
  {
    id: 'buchstabenwald',
    label: 'Spiele 1× im Buchstabenwald',
    target: 1,
    matches: (e) => e.worldId === 'buchstaben',
  },
  {
    id: 'logiklabor',
    label: 'Spiele 1× im Logik-Labor',
    target: 1,
    matches: (e) => e.worldId === 'logik',
  },
  {
    id: 'paare',
    label: 'Finde 5 Paare',
    target: 1,
    matches: (e) => e.gameId === 'paar-finder' && e.correct >= 1,
  },
  {
    id: 'wort',
    label: 'Baue 1 Wort',
    target: 1,
    matches: (e) => e.gameId === 'wort-baukasten' && e.correct >= 1,
  },
  {
    id: 'bruecke',
    label: 'Baue eine Brücke fertig',
    target: 1,
    matches: (e) => e.gameId === 'rechen-bruecke' && e.correct >= 4,
  },
  {
    id: 'ernte',
    label: 'Ernte Früchte im Zahlenland',
    target: 1,
    matches: (e) => e.gameId === 'zahlen-ernte' && e.correct >= 3,
  },
  {
    id: 'muster',
    label: 'Webe 1 Muster zu Ende',
    target: 1,
    matches: (e) => e.gameId === 'muster-weber' && e.correct >= 3,
  },
  {
    id: 'sprung',
    label: 'Triff 3 Blöcke im Zahlen-Sprung',
    target: 1,
    matches: (e) => e.gameId === 'zahlen-sprung' && e.correct >= 3,
  },
  {
    id: 'volltreffer',
    label: 'Löse 5 Aufgaben richtig',
    target: 1,
    matches: (e) => e.correct >= 5,
  },
]

export const QUEST_BONUS_STARS = 5

/** Die drei Quests des Tages für dieses Kind. */
export function questsForDay(childId: string, day = dayKey()): Quest[] {
  const rng = mulberry32(hashSeed(`${day}|${childId}`))
  return sample(rng, POOL, 3)
}

export interface QuestState {
  day: string
  done: string[]
  claimed: boolean
}

export function emptyQuestState(day = dayKey()): QuestState {
  return { day, done: [], claimed: false }
}

/** Nach jeder Runde aufrufen. Gibt zurück, ob gerade alle drei fertig wurden. */
export async function markQuestProgress(childId: string, ev: QuestEvent): Promise<boolean> {
  const child = await db.children.get(childId)
  if (!child) return false
  const today = dayKey()
  const state: QuestState =
    child.quests && child.quests.day === today ? { ...child.quests } : emptyQuestState(today)

  const quests = questsForDay(childId, today)
  let changed = false
  for (const q of quests) {
    if (state.done.includes(q.id)) continue
    if (q.matches(ev)) {
      state.done.push(q.id)
      changed = true
    }
  }
  if (!changed) return false
  await db.children.update(childId, { quests: state })
  return state.done.length >= quests.length && !state.claimed
}

/** Bonus-Stern einlösen, wenn alle drei Tages-Sterne eingesammelt sind. */
export async function claimQuestBonus(childId: string): Promise<number> {
  const child = await db.children.get(childId)
  if (!child) return 0
  const today = dayKey()
  const state = child.quests
  if (!state || state.day !== today || state.claimed) return 0
  if (state.done.length < questsForDay(childId, today).length) return 0

  await db.children.update(childId, {
    quests: { ...state, claimed: true },
    stars: child.stars + QUEST_BONUS_STARS,
    starsTotal: child.starsTotal + QUEST_BONUS_STARS,
  })
  return QUEST_BONUS_STARS
}
