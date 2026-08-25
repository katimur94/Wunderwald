/**
 * Adaptives Lernsystem — bewusst KEIN IQ-Test.
 *
 * Pro Kind und Welt gibt es eine Stufe 1..10. Die Stufe steuert die
 * Aufgabengeneratoren aller Spiele dieser Welt. Aufstiege passieren still,
 * Abstiege werden von Funkel aufmunternd begleitet.
 *
 * Alles hier sind pure Funktionen — deshalb testbar ohne DB und ohne DOM.
 */

import type { Progress, WorldId } from '../db/types'

export const MIN_LEVEL = 1
export const MAX_LEVEL = 10

/** Streak, ab der ein Aufstieg möglich wird. */
export const LEVEL_UP_STREAK = 4
/** Schnitt-Zeit, unter der ein Aufstieg möglich wird. */
export const LEVEL_UP_AVG_MS = 8000
/** Fehler in Folge, die zum Abstieg führen. */
export const LEVEL_DOWN_FAILS = 3
/** So viele Zeiten fließen in den Schnitt ein. */
export const TIME_WINDOW = 4

/** Startstufe aus dem Geburtsjahr. Danach zählt NUR noch Leistung, nie das Alter. */
export function startLevelForAge(age: number): number {
  if (age <= 4) return 1
  if (age >= 10) return 7
  // 5 → 2, 6 → 3, 7 → 4, 8 → 5, 9 → 6
  return age - 3
}

export function startLevelForBirthYear(
  birthYear: number | null,
  now: Date = new Date(),
): number {
  if (!birthYear) return MIN_LEVEL
  const age = now.getFullYear() - birthYear
  if (!Number.isFinite(age) || age < 0) return MIN_LEVEL
  return startLevelForAge(age)
}

export interface AttemptOutcome {
  correct: boolean
  usedHint: boolean
  timeMs: number
}

export interface AdaptResult {
  progress: Progress
  /** Stufe hat sich geändert: +1 / -1 / 0 */
  levelDelta: number
  /** Erreichter sichtbarer Meilenstein (nur bei Aufstieg auf gerade Stufen) */
  milestone: Milestone | null
}

function clampLevel(level: number): number {
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level))
}

export function averageTime(times: number[]): number {
  if (times.length === 0) return Infinity
  return times.reduce((a, b) => a + b, 0) / times.length
}

/**
 * Verrechnet einen Versuch mit dem bisherigen Fortschritt.
 *
 * - Richtig ohne Hilfe: xp += 10 + difficulty, streak++, failStreak = 0
 * - Richtig mit Hilfe:  xp += 5, streak bleibt
 * - Falsch:             failStreak++, streak = 0
 * - streak >= 4 UND Schnitt < 8 s → Stufe +1 (max 10), Streaks reset
 * - failStreak >= 3                → Stufe -1 (min 1), Streaks reset
 */
export function applyAttempt(prev: Progress, outcome: AttemptOutcome): AdaptResult {
  const difficulty = prev.level
  let { level, xp, streak, failStreak } = prev
  let recentTimes = [...(prev.recentTimes ?? [])]

  if (outcome.correct) {
    if (outcome.usedHint) {
      xp += 5
    } else {
      xp += 10 + difficulty
      streak += 1
      failStreak = 0
      recentTimes = [...recentTimes, outcome.timeMs].slice(-TIME_WINDOW)
    }
  } else {
    failStreak += 1
    streak = 0
  }

  let levelDelta = 0

  if (
    streak >= LEVEL_UP_STREAK &&
    recentTimes.length >= LEVEL_UP_STREAK &&
    averageTime(recentTimes) < LEVEL_UP_AVG_MS &&
    level < MAX_LEVEL
  ) {
    level = clampLevel(level + 1)
    levelDelta = 1
    streak = 0
    failStreak = 0
    recentTimes = []
    // XP-Rest bleibt bewusst erhalten — der Fortschrittsbalken springt nicht zurück.
  } else if (failStreak >= LEVEL_DOWN_FAILS && level > MIN_LEVEL) {
    level = clampLevel(level - 1)
    levelDelta = -1
    streak = 0
    failStreak = 0
    recentTimes = []
  } else if (failStreak >= LEVEL_DOWN_FAILS) {
    // Schon auf Stufe 1 — Zähler trotzdem zurücksetzen, sonst hängt das Kind fest.
    failStreak = 0
  }

  const progress: Progress = { ...prev, level, xp, streak, failStreak, recentTimes }
  const milestone = levelDelta > 0 ? milestoneFor(prev.worldId, level) : null
  return { progress, levelDelta, milestone }
}

/* ------------------------------------------------------------------ */
/* Meilensteine — alle 2 Stufen ein sichtbarer, gefeierter Titel        */
/* ------------------------------------------------------------------ */

export interface Milestone {
  id: string
  worldId: WorldId
  level: number
  title: string
  bonusStars: number
}

const MILESTONE_TITLES: Record<WorldId, string[]> = {
  // Index 0 → Stufe 2, Index 1 → Stufe 4, … Stufe 10
  zahlen: ['Zahlen-Entdecker', 'Zahlen-Kenner', 'Zahlen-Forscher', 'Zahlen-Meister', 'Zahlen-Magier'],
  buchstaben: ['Buchstaben-Entdecker', 'Silben-Kenner', 'Wort-Forscher', 'Lese-Meister', 'Wort-Magier'],
  logik: ['Muster-Entdecker', 'Muster-Kenner', 'Rätsel-Forscher', 'Rätsel-Meister', 'Logik-Magier'],
}

const MILESTONE_BONUS = [3, 5, 8, 10, 15]

export function milestoneFor(worldId: WorldId, level: number): Milestone | null {
  if (level % 2 !== 0) return null
  const idx = level / 2 - 1
  const title = MILESTONE_TITLES[worldId]?.[idx]
  if (!title) return null
  return { id: `${worldId}-${level}`, worldId, level, title, bonusStars: MILESTONE_BONUS[idx] ?? 5 }
}

/** Alle Meilensteine einer Welt — für den Fortschrittspfad im Welt-Screen. */
export function milestonesOf(worldId: WorldId): Milestone[] {
  return [2, 4, 6, 8, 10]
    .map((lvl) => milestoneFor(worldId, lvl))
    .filter((m): m is Milestone => m !== null)
}

/** Der zuletzt erreichte Titel — steht im Elternbereich und auf der Weltkarte. */
export function currentTitle(worldId: WorldId, level: number): string {
  const reached = milestonesOf(worldId).filter((m) => m.level <= level)
  return reached.length ? reached[reached.length - 1].title : 'Frisch im Wald'
}

/* ------------------------------------------------------------------ */
/* Klartext-Profil für Eltern — statt einer einzelnen Intelligenz-Zahl  */
/* ------------------------------------------------------------------ */

export const LEVEL_DESCRIPTIONS: Record<WorldId, Record<number, string>> = {
  zahlen: {
    1: 'Erkennt kleine Mengen bis 4 auf einen Blick und zählt sie mit.',
    2: 'Zählt sicher bis 6, ordnet Menge und Zahl zu und zerlegt kleine Zahlen.',
    3: 'Zählt sicher bis 20, vergleicht Mengen, erste Plusaufgaben bis 10.',
    4: 'Rechnet plus und minus bis 10 und zerlegt Zahlen in zwei Summanden.',
    5: 'Vergleicht Mengen sicher und rechnet im Zahlenraum bis 20 ohne Übergang.',
    6: 'Bündelt in Fünfern und Zehnern, rechnet mit Zehnerübergang bis 20.',
    7: 'Ergänzt zu vollen Zehnern („Zehnerfreunde") und findet fehlende Zahlen.',
    8: 'Kennt das kleine Einmaleins der 2er-, 5er- und 10er-Reihe.',
    9: 'Rechnet gemischt, löst Sachaufgaben und zerlegt in drei Summanden.',
    10: 'Rechnet mehrschrittig mit Klammern und vergleicht Größen („mehr als").',
  },
  buchstaben: {
    1: 'Hört erste Anlaute und Reime heraus und erkennt große Buchstaben.',
    2: 'Ordnet mehreren Bildern den richtigen Anfangsbuchstaben zu.',
    3: 'Erkennt häufige Anlaute sicher und findet Reimwörter aus drei Bildern.',
    4: 'Unterscheidet ähnlich klingende Laute wie B und P oder D und T.',
    5: 'Hört den letzten Laut eines Wortes und merkt, was sich NICHT reimt.',
    6: 'Findet fehlende Buchstaben und klatscht die Silben eines Wortes mit.',
    7: 'Verbindet Groß- und Kleinbuchstaben und zählt auch drei Silben sicher.',
    8: 'Setzt Wörter aus einzelnen Buchstaben zusammen, auch mit Ablenkern.',
    9: 'Liest kurze Wörter selbst und setzt zusammengesetzte Wörter zusammen.',
    10: 'Liest kurze Sätze und ergänzt fehlende Wörter sinnvoll.',
  },
  logik: {
    1: 'Setzt einfache Farbmuster fort und sortiert nach Art (Tiere, Obst).',
    2: 'Erkennt Muster auch dann, wenn sie aus Formen bestehen.',
    3: 'Führt dreiteilige Muster weiter und behält die Reihenfolge im Kopf.',
    4: 'Durchschaut Muster mit Wiederholungen wie AAB oder ABB.',
    5: 'Bezieht Merkmale ein: Was fliegt, was schwimmt, was ist groß?',
    6: 'Behält zwei Merkmale im Blick und merkt, wenn etwas nirgends passt.',
    7: 'Erkennt Zahlenreihen und rechnet den nächsten Schritt aus.',
    8: 'Durchschaut Reihen mit Sprüngen und sortiert nach Art UND Eigenschaft.',
    9: 'Löst kleine Denk-Matrizen, bei denen ein Feld fehlt.',
    10: 'Kombiniert mehrere Regeln, begründet seine Wahl und findet Oberbegriffe.',
  },
}

export function describeLevel(worldId: WorldId, level: number): string {
  return LEVEL_DESCRIPTIONS[worldId]?.[clampLevel(level)] ?? ''
}

export const WORLD_LABELS: Record<WorldId, string> = {
  zahlen: 'Zahlenland',
  buchstaben: 'Buchstabenwald',
  logik: 'Logik-Labor',
}
