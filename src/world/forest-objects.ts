import type { Child } from '../db/types'

/**
 * Was vom Wald geblieben ist: Funkels Level und Outfits, die Tagesstimmung,
 * das Gieß-Tagebuch und die Gartentage. Der Emoji-Wald selbst ist seit
 * Schema 4 Geschichte — an seine Stelle trat der Garten (garden/garden.ts),
 * der alte Wälder beim ersten Öffnen übersetzt.
 */

/* ------------------------------------------------------------------ */
/* Gieß-Tagebuch: für den Elternbereich                                 */
/* ------------------------------------------------------------------ */

/** So viele Gießtage werden aufgehoben — zwei Wochen sind mehr als genug. */
export const GIESS_TAGEBUCH = 14

/** Wurde heute schon gegossen? (Der Garten erlaubt Gießen immer — das hier zählt nur die Tage.) */
export function darfGiessen(child: Child, heute: string): boolean {
  const tage = child.wateredDays ?? []
  return tage[tage.length - 1] !== heute
}

/** Trägt den heutigen Gießtag ein und wirft die ältesten Einträge weg. */
export function merkeGiesstag(tage: string[] | undefined, heute: string): string[] {
  const bisher = tage ?? []
  if (bisher[bisher.length - 1] === heute) return bisher
  return [...bisher, heute].slice(-GIESS_TAGEBUCH)
}

/** Wie oft wurde in den letzten `tage` Tagen gegossen? (für den Elternbereich) */
export function giesstageSeit(child: Child, seitDayKey: string): number {
  return (child.wateredDays ?? []).filter((t) => t >= seitDayKey).length
}

/* ------------------------------------------------------------------ */
/* Tagesstimmung — reine Optik, kein Einfluss aufs Spiel               */
/* ------------------------------------------------------------------ */

export type Tageszeit = 'morgen' | 'tag' | 'abend' | 'nacht'

export function tageszeitVon(stunde: number): Tageszeit {
  if (stunde >= 6 && stunde < 10) return 'morgen'
  if (stunde >= 10 && stunde < 17) return 'tag'
  if (stunde >= 17 && stunde < 21) return 'abend'
  return 'nacht'
}

export function aktuelleTageszeit(now: Date = new Date()): Tageszeit {
  return tageszeitVon(now.getHours())
}

/** Leuchten Laternen gerade? */
export function istDunkel(zeit: Tageszeit): boolean {
  return zeit === 'abend' || zeit === 'nacht'
}

/* ------------------------------------------------------------------ */
/* Funkel-Outfits                                                      */
/* ------------------------------------------------------------------ */

export interface Outfit {
  id: string
  name: string
  /** Funkel-Level, ab dem es im Shop steht (Level = starsTotal / 50 + 1) */
  abLevel: number
}

export const OUTFITS: Outfit[] = [
  { id: 'halstuch', name: 'Halstuch', abLevel: 2 },
  { id: 'blatt', name: 'Blatt am Ohr', abLevel: 3 },
  { id: 'hut', name: 'Hut', abLevel: 4 },
  { id: 'brille', name: 'Brille', abLevel: 5 },
  { id: 'laterne', name: 'Laterne', abLevel: 6 },
  { id: 'krone', name: 'Krone', abLevel: 8 },
]

/** Funkels Level steigt mit den insgesamt gesammelten Sternen (alle 50). */
export function companionLevel(starsTotal: number): number {
  return Math.floor(starsTotal / 50) + 1
}

export function unlockedOutfits(starsTotal: number): Outfit[] {
  const lvl = companionLevel(starsTotal)
  return OUTFITS.filter((o) => o.abLevel <= lvl)
}

/** Sterne bis zum nächsten Funkel-Level – für die Anzeige im Garten. */
export function starsToNextCompanionLevel(starsTotal: number): number {
  return 50 - (starsTotal % 50)
}

/* ------------------------------------------------------------------ */
/* Gartentage — sanfte Serie, reißt nie ab                             */
/* ------------------------------------------------------------------ */

export const WALDTAG_BELOHNUNG = 5
export const WALDTAG_INTERVALL = 5

export interface Waldtag {
  forestDays: number
  lastVisitDay: string
  /** Sterne, die dieser Besuch bringt (0 = keine) */
  bonus: number
}

/** Beim Betreten: war das Kind heute schon da? Wenn nicht, zählt der Tag. */
export function besucheHeute(child: Child, heute: string): Waldtag | null {
  if ((child.lastVisitDay ?? '') === heute) return null
  const forestDays = (child.forestDays ?? 0) + 1
  return {
    forestDays,
    lastVisitDay: heute,
    bonus: forestDays % WALDTAG_INTERVALL === 0 ? WALDTAG_BELOHNUNG : 0,
  }
}
