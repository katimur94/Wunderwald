import type { Child, ForestItem, InventoryItem } from '../db/types'
import { dayKey } from '../learning/session'

/**
 * Der Katalog des Wald-Shops.
 *
 * Objekte haben 2–3 Wachstumsstadien: Sie wachsen weiter, wenn das Kind an
 * Folgetagen spielt. Das ist der Wiederkomm-Anreiz — und es ist ehrlich:
 * gewachsen wird nur durch tatsächliches Wiederkommen, nicht durch Wartezeit.
 */

export type ForestCategory = 'pflanze' | 'baum' | 'haus' | 'wasser' | 'tier' | 'geschenk' | 'effekt'

/** Wo ein Objekt stehen darf. Ohne Angabe: überall. */
export type Zone = 'wiese' | 'bach' | 'huegel'
export const ZONEN: Zone[] = ['wiese', 'bach', 'huegel']

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
  /** Zonen, in denen das Objekt stehen darf. Fehlt die Angabe: alle. */
  zonen?: Zone[]
  /** Tiere reagieren aufs Antippen und wandern gelegentlich. */
  klang?: 'bird' | 'hop' | 'rustle'
}

export const FOREST_OBJECTS: ForestObject[] = [
  /* ---------- Wiese ---------- */
  { id: 'blume',      name: 'Blume',        kosten: 3,  kategorie: 'pflanze',  stadien: 2, tageProStadium: 2, darstellung: ['🌱', '🌷'],             freiAb: 0,  zonen: ['wiese', 'huegel'] },
  { id: 'busch',      name: 'Busch',        kosten: 5,  kategorie: 'pflanze',  stadien: 2, tageProStadium: 2, darstellung: ['🌱', '🌿'],             freiAb: 0,  zonen: ['wiese', 'huegel'] },
  { id: 'baum',       name: 'Baum',         kosten: 8,  kategorie: 'baum',     stadien: 3, tageProStadium: 2, darstellung: ['🌱', '🌳', '🌳'],       freiAb: 0,  zonen: ['wiese', 'huegel'] },
  { id: 'sonnenblume',name: 'Sonnenblume',  kosten: 9,  kategorie: 'pflanze',  stadien: 3, tageProStadium: 2, darstellung: ['🌱', '🌿', '🌻'],       freiAb: 10, zonen: ['wiese'] },
  { id: 'tanne',      name: 'Tanne',        kosten: 10, kategorie: 'baum',     stadien: 3, tageProStadium: 2, darstellung: ['🌱', '🌲', '🌲'],       freiAb: 20, zonen: ['wiese', 'huegel'] },
  { id: 'erdbeerbeet',name: 'Erdbeerbeet',  kosten: 11, kategorie: 'pflanze',  stadien: 2, tageProStadium: 3, darstellung: ['🌱', '🍓'],             freiAb: 20, zonen: ['wiese'] },
  { id: 'pilzhaus',   name: 'Pilzhaus',     kosten: 12, kategorie: 'haus',     stadien: 2, tageProStadium: 3, darstellung: ['🍄', '🏠'],             freiAb: 20 },
  { id: 'bank',       name: 'Bank',         kosten: 14, kategorie: 'haus',     stadien: 1, tageProStadium: 0, darstellung: ['🪑'],                   freiAb: 30 },
  { id: 'vogelhaus',  name: 'Vogelhaus',    kosten: 15, kategorie: 'haus',     stadien: 1, tageProStadium: 0, darstellung: ['🐦'],                   freiAb: 30, zonen: ['wiese', 'huegel'] },
  { id: 'schaukel',   name: 'Schaukel',     kosten: 16, kategorie: 'haus',     stadien: 1, tageProStadium: 0, darstellung: ['🛝'],                   freiAb: 40, zonen: ['wiese'] },
  { id: 'lagerfeuer', name: 'Lagerfeuer',   kosten: 18, kategorie: 'haus',     stadien: 1, tageProStadium: 0, darstellung: ['🔥'],                   freiAb: 50 },
  { id: 'bienenstock',name: 'Bienenstock',  kosten: 19, kategorie: 'haus',     stadien: 1, tageProStadium: 0, darstellung: ['🐝'],                   freiAb: 50, zonen: ['wiese'] },
  { id: 'hase',       name: 'Hase',         kosten: 20, kategorie: 'tier',     stadien: 1, tageProStadium: 0, darstellung: ['🐰'],                   freiAb: 40, zonen: ['wiese', 'huegel'], klang: 'hop' },
  { id: 'igel',       name: 'Igel',         kosten: 20, kategorie: 'tier',     stadien: 1, tageProStadium: 0, darstellung: ['🦔'],                   freiAb: 40, zonen: ['wiese', 'huegel'], klang: 'rustle' },
  { id: 'reh',        name: 'Reh',          kosten: 25, kategorie: 'tier',     stadien: 1, tageProStadium: 0, darstellung: ['🦌'],                   freiAb: 60, zonen: ['wiese', 'huegel'], klang: 'rustle' },

  /* ---------- Bachufer ---------- */
  { id: 'seerose',    name: 'Seerose',      kosten: 8,  kategorie: 'pflanze',  stadien: 2, tageProStadium: 2, darstellung: ['🌱', '🪷'],             freiAb: 20, zonen: ['bach'] },
  { id: 'teich',      name: 'Teich',        kosten: 15, kategorie: 'wasser',   stadien: 2, tageProStadium: 3, darstellung: ['💧', '🪷'],             freiAb: 30, zonen: ['bach', 'wiese'] },
  { id: 'bruecke',    name: 'Brücke',       kosten: 17, kategorie: 'haus',     stadien: 1, tageProStadium: 0, darstellung: ['🌉'],                   freiAb: 40, zonen: ['bach'] },
  { id: 'ente',       name: 'Ente',         kosten: 20, kategorie: 'tier',     stadien: 1, tageProStadium: 0, darstellung: ['🦆'],                   freiAb: 50, zonen: ['bach'], klang: 'bird' },

  /* ---------- Hügel ---------- */
  { id: 'laterne',    name: 'Laterne',      kosten: 13, kategorie: 'haus',     stadien: 1, tageProStadium: 0, darstellung: ['🏮'],                   freiAb: 30 },
  { id: 'fuchsbau',   name: 'Fuchsbau',     kosten: 22, kategorie: 'haus',     stadien: 1, tageProStadium: 0, darstellung: ['⛰️'],                   freiAb: 60, zonen: ['huegel'] },
  { id: 'eule',       name: 'Eule',         kosten: 24, kategorie: 'tier',     stadien: 1, tageProStadium: 0, darstellung: ['🦉'],                   freiAb: 60, zonen: ['huegel'], klang: 'bird' },

  /* ---------- Überall ---------- */
  { id: 'schmetterlinge', name: 'Schmetterlinge', kosten: 21, kategorie: 'effekt', stadien: 1, tageProStadium: 0, darstellung: ['🦋'],           freiAb: 50 },
  { id: 'regenbogen', name: 'Regenbogen',   kosten: 30, kategorie: 'geschenk', stadien: 1, tageProStadium: 0, darstellung: ['🌈'],                   freiAb: 80 },
]

/** Darf dieses Objekt in dieser Zone stehen? */
export function darfInZone(objectId: string, zone: Zone): boolean {
  const def = objectById(objectId)
  if (!def) return false
  return !def.zonen || def.zonen.includes(zone)
}

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

/* ------------------------------------------------------------------ */
/* Bereiche: der Wald wächst räumlich mit                              */
/* ------------------------------------------------------------------ */

export interface Bereich {
  zone: Zone
  name: string
  /** Erster Slot dieses Bereichs (global durchnummeriert) */
  von: number
  /** Anzahl Plätze */
  anzahl: number
  /** Ab wie vielen platzierten Objekten der Bereich aufgeht (0 = von Anfang an) */
  abObjekten: number
  /** Was Funkel beim Freischalten sagt */
  text: string
}

export const BEREICHE: Bereich[] = [
  { zone: 'wiese',  name: 'Lichtung',  von: 0,  anzahl: 24, abObjekten: 0,
    text: 'Das hier ist deine Lichtung. Pflanz los!' },
  { zone: 'bach',   name: 'Bachufer',  von: 24, anzahl: 8,  abObjekten: 12,
    text: 'Schau, das Bachufer ist frei geworden! Hier wächst anderes als auf der Wiese.' },
  { zone: 'huegel', name: 'Hügel',     von: 32, anzahl: 8,  abObjekten: 20,
    text: 'Der Hügel gehört jetzt auch dir! Von da oben sieht man den ganzen Wald.' },
]

/**
 * Reihenfolge der Streifen von oben nach unten — wie in einer echten
 * Landschaft: der Hügel oben, die Wiese in der Mitte, der Bach unten.
 * Bewusst nicht die umgekehrte Freischalt-Reihenfolge: die schaltet den
 * Bach vor dem Hügel frei und würde das Wasser über die Wiese legen.
 */
export const ANSICHT_VON_OBEN: Zone[] = ['huegel', 'wiese', 'bach']

/** Alle Plätze zusammen, wenn alles frei ist. */
export const GRID_SLOTS = BEREICHE.reduce((n, b) => n + b.anzahl, 0)
/** Die Lichtung allein — so groß startet jeder Wald. */
export const WIESE_SLOTS = BEREICHE[0].anzahl

export function zoneOfSlot(slot: number): Zone {
  for (const b of BEREICHE) {
    if (slot >= b.von && slot < b.von + b.anzahl) return b.zone
  }
  return 'wiese'
}

/** Bereiche, die bei so vielen platzierten Objekten offen sind. */
export function offeneBereiche(objektAnzahl: number): Bereich[] {
  return BEREICHE.filter((b) => objektAnzahl >= b.abObjekten)
}

/** Alle nutzbaren Slots beim aktuellen Ausbaustand. */
export function verfuegbareSlots(objektAnzahl: number): number[] {
  return offeneBereiche(objektAnzahl).flatMap((b) =>
    Array.from({ length: b.anzahl }, (_, i) => b.von + i),
  )
}

/** Der Bereich, der bei genau dieser Objektzahl neu aufgeht (sonst null). */
export function neuerBereich(objektAnzahl: number, bereitsGefeiert: string[]): Bereich | null {
  return (
    BEREICHE.find(
      (b) => b.abObjekten > 0 && objektAnzahl >= b.abObjekten && !bereitsGefeiert.includes(`bereich-${b.zone}`),
    ) ?? null
  )
}

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

/* ------------------------------------------------------------------ */
/* Set-Boni: bestimmte Kombinationen bringen einen Gast von selbst      */
/* ------------------------------------------------------------------ */

export interface SetBonus {
  id: string
  objectId: string
  text: string
  /** Trifft zu? Bekommt die Ids aller platzierten Objekte. */
  erfuellt: (ids: string[]) => boolean
}

function zaehle(ids: string[], predicate: (id: string) => boolean): number {
  return ids.filter(predicate).length
}

export const SET_BONI: SetBonus[] = [
  {
    id: 'set-wasser',
    objectId: 'ente',
    text: 'So viel Wasser! Eine Ente ist eingezogen.',
    erfuellt: (ids) =>
      zaehle(ids, (id) => {
        const o = objectById(id)
        return !!o && (o.kategorie === 'wasser' || o.zonen?.includes('bach') === true)
      }) >= 3,
  },
  {
    id: 'set-vogel',
    objectId: 'vogelhaus',
    text: 'Zwischen deinen Bäumen wohnt jetzt ein Vogel.',
    erfuellt: (ids) =>
      ids.includes('vogelhaus') && zaehle(ids, (id) => objectById(id)?.kategorie === 'baum') >= 2,
  },
  {
    id: 'set-schmetterlinge',
    objectId: 'schmetterlinge',
    text: 'So viele verschiedene Pflanzen — die Schmetterlinge sind da!',
    erfuellt: (ids) =>
      new Set(ids.filter((id) => objectById(id)?.kategorie === 'pflanze')).size >= 5,
  },
]

/** Das nächste noch nicht vergebene Geschenk oder Set — beides feiert gleich. */
export function pendingGift(child: Child): ForestGift | null {
  const erhalten = new Set(child.milestones ?? [])
  const nachAnzahl = FOREST_GIFTS.find(
    (g) => child.forest.length >= g.ab && !erhalten.has(g.id),
  )
  if (nachAnzahl) return nachAnzahl

  const ids = child.forest.map((f) => f.objectId)
  const set = SET_BONI.find((b) => !erhalten.has(b.id) && b.erfuellt(ids))
  return set ? { id: set.id, ab: 0, objectId: set.objectId, text: set.text } : null
}

/* ------------------------------------------------------------------ */
/* Gieß-Ritual: einmal am Tag, ohne Druck                              */
/* ------------------------------------------------------------------ */

/** Darf heute noch gegossen werden? */
export function darfGiessen(child: Child, heute: string): boolean {
  return (child.lastWatered ?? '') !== heute
}

/** Nur Pflanzen und Bäume, die noch wachsen können, lassen sich gießen. */
export function istGiessbar(item: ForestItem): boolean {
  const def = objectById(item.objectId)
  if (!def || def.stadien <= 1) return false
  return stageOf(item) < def.stadien - 1
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

/** Leuchten Laternen gerade? Schläft die Eule? */
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

/** Sterne bis zum nächsten Funkel-Level – für die Anzeige im Wald. */
export function starsToNextCompanionLevel(starsTotal: number): number {
  return 50 - (starsTotal % 50)
}

/**
 * Freie Plätze im Wald — nur in bereits freigeschalteten Bereichen und,
 * wenn ein Objekt angegeben ist, nur dort, wo es stehen darf.
 */
export function freeSlots(forest: ForestItem[], objectId?: string): number[] {
  const belegt = new Set(forest.map((f) => f.slot))
  return verfuegbareSlots(forest.length)
    .filter((i) => !belegt.has(i))
    .filter((i) => !objectId || darfInZone(objectId, zoneOfSlot(i)))
}

export function makeForestItem(objectId: string, slot: number, heute = dayKey()): ForestItem {
  return { slot, objectId, placedAt: Date.now(), growthDays: 0, lastGrowthDay: heute }
}

/* ------------------------------------------------------------------ */
/* Kiste: Objekte einlagern und kostenlos zurückholen                  */
/* ------------------------------------------------------------------ */

/** Ein Objekt vom Platz in die Kiste. Stadium bleibt erhalten. */
export function inKiste(
  forest: ForestItem[],
  inventory: InventoryItem[],
  slot: number,
): { forest: ForestItem[]; inventory: InventoryItem[] } {
  const item = forest.find((f) => f.slot === slot)
  if (!item) return { forest, inventory }
  return {
    forest: forest.filter((f) => f.slot !== slot),
    inventory: [...inventory, { objectId: item.objectId, growthDays: item.growthDays }],
  }
}

/** Ein Objekt aus der Kiste zurück auf einen freien Platz — kostet nichts. */
export function ausKiste(
  forest: ForestItem[],
  inventory: InventoryItem[],
  index: number,
  slot: number,
  heute: string,
): { forest: ForestItem[]; inventory: InventoryItem[] } {
  const eintrag = inventory[index]
  if (!eintrag) return { forest, inventory }
  return {
    forest: [
      ...forest,
      {
        slot,
        objectId: eintrag.objectId,
        placedAt: Date.now(),
        growthDays: eintrag.growthDays,
        lastGrowthDay: heute,
      },
    ],
    inventory: inventory.filter((_, i) => i !== index),
  }
}

/** Ein Objekt auf einen anderen freien Platz umsetzen — kostet nichts. */
export function verschiebe(forest: ForestItem[], vonSlot: number, nachSlot: number): ForestItem[] {
  if (forest.some((f) => f.slot === nachSlot)) return forest
  return forest.map((f) => (f.slot === vonSlot ? { ...f, slot: nachSlot } : f))
}

/* ------------------------------------------------------------------ */
/* Tiere wandern                                                        */
/* ------------------------------------------------------------------ */

export function istTier(objectId: string): boolean {
  return objectById(objectId)?.kategorie === 'tier'
}

/**
 * Beim Betreten des Waldes wechselt höchstens EIN Tier den Platz, und das
 * nur manchmal. Kein Timer im Hintergrund — Ruhe bleibt Ruhe.
 */
export function wandereTier(
  forest: ForestItem[],
  rnd: () => number,
  wahrscheinlichkeit = 0.3,
): { forest: ForestItem[]; vonSlot: number; nachSlot: number } | null {
  if (rnd() >= wahrscheinlichkeit) return null
  const tiere = forest.filter((f) => istTier(f.objectId))
  if (tiere.length === 0) return null

  const tier = tiere[Math.floor(rnd() * tiere.length)]
  const zone = zoneOfSlot(tier.slot)
  const belegt = new Set(forest.map((f) => f.slot))
  const ziele = verfuegbareSlots(forest.length).filter(
    (s) => !belegt.has(s) && zoneOfSlot(s) === zone && darfInZone(tier.objectId, zoneOfSlot(s)),
  )
  if (ziele.length === 0) return null

  const nachSlot = ziele[Math.floor(rnd() * ziele.length)]
  return { forest: verschiebe(forest, tier.slot, nachSlot), vonSlot: tier.slot, nachSlot }
}

/* ------------------------------------------------------------------ */
/* Waldtage — sanfte Serie, reißt nie ab                               */
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
