import type { Child, ForestItem } from '../db/types'
import { dayKey } from '../learning/session'

/**
 * Der Katalog des Wald-Shops.
 *
 * Objekte haben 2–3 Wachstumsstadien: Sie wachsen weiter, wenn das Kind an
 * Folgetagen spielt. Das ist der Wiederkomm-Anreiz — und es ist ehrlich:
 * gewachsen wird nur durch tatsächliches Wiederkommen, nicht durch Wartezeit.
 */

export type ForestCategory = 'pflanze' | 'baum' | 'haus' | 'wasser' | 'tier' | 'geschenk'

export interface ForestObject {
  id: string
  name: string
  kosten: number
  kategorie: ForestCategory
  /** Wie viele Wachstumsstadien (1 = wächst nicht) */
  stadien: number
  /** Nach wie vielen Spieltagen das nächste Stadium erreicht wird */
  tageProStadium: number
  /** Emoji je Stadium – Index 0 ist frisch gepflanzt */
  darstellung: string[]
  /** Ab wie vielen Sternen insgesamt im Shop sichtbar (0 = sofort) */
  freiAb: number
}

export const FOREST_OBJECTS: ForestObject[] = [
  { id: 'blume',   name: 'Blume',      kosten: 3,  kategorie: 'pflanze', stadien: 2, tageProStadium: 2, darstellung: ['🌱', '🌷'], freiAb: 0 },
  { id: 'busch',   name: 'Busch',      kosten: 5,  kategorie: 'pflanze', stadien: 2, tageProStadium: 2, darstellung: ['🌱', '🌿'], freiAb: 0 },
  { id: 'baum',    name: 'Baum',       kosten: 8,  kategorie: 'baum',    stadien: 3, tageProStadium: 2, darstellung: ['🌱', '🌳', '🌳'], freiAb: 0 },
  { id: 'tanne',   name: 'Tanne',      kosten: 10, kategorie: 'baum',    stadien: 3, tageProStadium: 2, darstellung: ['🌱', '🌲', '🌲'], freiAb: 20 },
  { id: 'pilzhaus',name: 'Pilzhaus',   kosten: 12, kategorie: 'haus',    stadien: 2, tageProStadium: 3, darstellung: ['🍄', '🏠'], freiAb: 20 },
  { id: 'teich',   name: 'Teich',      kosten: 15, kategorie: 'wasser',  stadien: 2, tageProStadium: 3, darstellung: ['💧', '🪷'], freiAb: 30 },
  { id: 'hase',    name: 'Hase',       kosten: 20, kategorie: 'tier',    stadien: 1, tageProStadium: 0, darstellung: ['🐰'], freiAb: 40 },
  { id: 'igel',    name: 'Igel',       kosten: 20, kategorie: 'tier',    stadien: 1, tageProStadium: 0, darstellung: ['🦔'], freiAb: 40 },
  { id: 'reh',     name: 'Reh',        kosten: 25, kategorie: 'tier',    stadien: 1, tageProStadium: 0, darstellung: ['🦌'], freiAb: 60 },
  { id: 'bank',    name: 'Bank',       kosten: 14, kategorie: 'haus',    stadien: 1, tageProStadium: 0, darstellung: ['🪑'], freiAb: 30 },
  { id: 'lagerfeuer', name: 'Lagerfeuer', kosten: 18, kategorie: 'haus', stadien: 1, tageProStadium: 0, darstellung: ['🔥'], freiAb: 50 },
  { id: 'regenbogen', name: 'Regenbogen', kosten: 30, kategorie: 'geschenk', stadien: 1, tageProStadium: 0, darstellung: ['🌈'], freiAb: 80 },
]

export function objectById(id: string): ForestObject | undefined {
  return FOREST_OBJECTS.find((o) => o.id === id)
}

/** Was im Shop angeboten wird — Neues erscheint mit wachsendem Sternkonto. */
export function shopFor(starsTotal: number): ForestObject[] {
  return FOREST_OBJECTS.filter((o) => starsTotal >= o.freiAb)
}

/* ------------------------------------------------------------------ */
/* Wachstum                                                            */
/* ------------------------------------------------------------------ */

export const GRID_SLOTS = 24

/** Aktuelles Stadium eines platzierten Objekts (0-basiert). */
export function stageOf(item: ForestItem): number {
  const def = objectById(item.objectId)
  if (!def || def.stadien <= 1) return 0
  const stufe = Math.floor(item.growthDays / Math.max(1, def.tageProStadium))
  return Math.min(def.stadien - 1, stufe)
}

export function emojiOf(item: ForestItem): string {
  const def = objectById(item.objectId)
  if (!def) return '❔'
  return def.darstellung[Math.min(stageOf(item), def.darstellung.length - 1)]
}

/** Wie groß das Objekt gezeichnet wird – Bäume werden mit jedem Stadium größer. */
export function scaleOf(item: ForestItem): number {
  const def = objectById(item.objectId)
  if (!def || def.stadien <= 1) return 1
  const stufe = stageOf(item)
  return 0.62 + (stufe / (def.stadien - 1)) * 0.38
}

/**
 * Gutschrift beim Laden: Hat das Kind heute noch nicht gespielt, bekommt
 * jedes Objekt einen Wachstums-Tag. Pro Tag zählt genau eine Gutschrift.
 */
export function growForest(forest: ForestItem[], heute = dayKey()): ForestItem[] {
  return forest.map((item) =>
    item.lastGrowthDay === heute
      ? item
      : { ...item, growthDays: item.growthDays + 1, lastGrowthDay: heute },
  )
}

/** Ob überhaupt etwas zu gießen war – für die Meldung von Funkel. */
export function needsGrowth(forest: ForestItem[], heute = dayKey()): boolean {
  return forest.some((i) => i.lastGrowthDay !== heute)
}

/* ------------------------------------------------------------------ */
/* Meilenstein-Geschenke                                               */
/* ------------------------------------------------------------------ */

export interface ForestGift {
  id: string
  ab: number
  objectId: string
  text: string
}

/** Bei 10, 25 und 50 Objekten zieht automatisch ein seltenes Tier ein. */
export const FOREST_GIFTS: ForestGift[] = [
  { id: 'forest-10', ab: 10, objectId: 'igel', text: 'Dein Wald ist so schön geworden — ein Igel hat sich eingenistet!' },
  { id: 'forest-25', ab: 25, objectId: 'reh',  text: 'Schau mal, ein Reh ist eingezogen! Es fühlt sich wohl bei dir.' },
  { id: 'forest-50', ab: 50, objectId: 'regenbogen', text: 'Über deinem Wald steht jetzt ein Regenbogen. Das schafft nicht jeder!' },
]

/** Das nächste noch nicht vergebene Geschenk, das jetzt fällig wäre. */
export function pendingGift(child: Child): ForestGift | null {
  const erhalten = new Set(child.milestones ?? [])
  return (
    FOREST_GIFTS.find((g) => child.forest.length >= g.ab && !erhalten.has(g.id)) ?? null
  )
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

/** Sterne bis zum nächsten Funkel-Level – für die Anzeige im Wald. */
export function starsToNextCompanionLevel(starsTotal: number): number {
  return 50 - (starsTotal % 50)
}

/** Freie Plätze im Wald. */
export function freeSlots(forest: ForestItem[]): number[] {
  const belegt = new Set(forest.map((f) => f.slot))
  return Array.from({ length: GRID_SLOTS }, (_, i) => i).filter((i) => !belegt.has(i))
}

export function makeForestItem(objectId: string, slot: number, heute = dayKey()): ForestItem {
  return { slot, objectId, placedAt: Date.now(), growthDays: 0, lastGrowthDay: heute }
}
