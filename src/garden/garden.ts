/**
 * Der Garten — die reine Logik. Alles hier sind pure Funktionen über dem
 * Zustand in der Datenbank, deshalb ohne DOM und ohne Uhr testbar (die
 * Zeit wird immer hereingereicht).
 *
 * Grundsätze:
 *  - Pflanzen wachsen in ECHTZEIT, aber nur mit Wasser. Wer nicht gießt,
 *    dessen Pflanze wartet mit hängenden Blättern. Sie stirbt nie.
 *  - Jede Pflege ist sofort sichtbar: Gießen, Jäten und Düngen geben einen
 *    kleinen Wachstumsschub, damit ein Kind noch in derselben Minute sieht,
 *    dass seine Arbeit etwas bewirkt.
 *  - Es gibt Ernte. Reife Pflanzen bringen Sterne — und damit neue Samen.
 */

import type { Child, ForestItem, Garden, GardenBed, InventoryItem } from '../db/types'
import { BESUCHER, DEKO, PFLANZEN, pflanzeById, type Pflanze } from './arten'

export const STUNDE = 3_600_000

/** Ab hier lässt eine Pflanze die Blätter hängen */
export const DURST_AB = 35
/** Darunter wächst nichts mehr */
export const WACHSTUM_AB = 15
/** Gießen bringt nur einen Schub, wenn die Pflanze wirklich durstig war */
export const SCHUB_AB = 70
export const SCHUB_GIESSEN = 0.04
export const SCHUB_JAETEN = 0.02
export const SCHUB_DUENGEN = 0.08
export const DUENGER_STUNDEN = 12
/** Reif — ab hier darf geerntet werden */
export const REIF = 1
/** Nach der Ernte fängt eine mehrjährige Pflanze hier wieder an */
export const NACH_ERNTE = 0.55

/** Beete, die ein neuer Garten hat, und wie er wächst */
export const BEETE_START = 6
export const BEETE_MAX = 12
/** Nach so vielen Ernten insgesamt kommen zwei Beete dazu */
export const BEETE_STUFEN = [3, 8, 15]

/** Wahrscheinlichkeit je Tag, dass in einem Beet Unkraut aufgeht */
export const UNKRAUT_PRO_TAG = 0.45
export const UNKRAUT_MAX = 3
/** Wahrscheinlichkeit je Tag, dass eine Schnecke kommt (nur an größeren Pflanzen) */
export const SCHNECKE_PRO_TAG = 0.14

export function leererGarten(): Garden {
  return { beds: [], decor: [], bedCount: BEETE_START, compost: 0, harvestsTotal: 0, visitors: [] }
}

/* ------------------------------------------------------------------ */
/* Zeit vergeht                                                        */
/* ------------------------------------------------------------------ */

export interface SimulationsErgebnis {
  garden: Garden
  /** Was seit dem letzten Besuch passiert ist — für Funkels Ansage */
  gereift: string[]
  durstig: string[]
  unkraut: number
  schnecken: number
}

/**
 * Lässt für ein Beet die Zeit von `bed.updatedAt` bis `now` vergehen.
 * Wachstum gibt es nur für die Stunden, in denen genug Wasser da war;
 * Unkraut und Schnecken kommen mit einer Wahrscheinlichkeit je Tag.
 */
export function simuliereBeet(bed: GardenBed, now: number, rnd: () => number): GardenBed {
  const art = pflanzeById(bed.speciesId)
  if (!art) return { ...bed, updatedAt: now }
  const dtH = Math.max(0, (now - bed.updatedAt) / STUNDE)
  if (dtH <= 0) return bed

  // Stunden, in denen die Pflanze noch über der Wachstumsgrenze war
  const wasserVorher = bed.water
  const bisTrocken = art.wasserProStunde > 0 ? Math.max(0, (wasserVorher - WACHSTUM_AB) / art.wasserProStunde) : dtH
  const stundenGewachsen = Math.min(dtH, bisTrocken)
  const water = Math.max(0, wasserVorher - art.wasserProStunde * dtH)

  const unkrautBremse = 1 / (1 + bed.weeds * 0.5)
  const duenger = bed.fertilizedUntil && bed.fertilizedUntil > bed.updatedAt ? 2 : 1
  let growth = bed.growth + (stundenGewachsen / art.stundenBisReif) * unkrautBremse * duenger

  // Schnecke knabbert — langsam, und nur bis zu einem gewissen Punkt
  if (bed.snail) growth -= Math.min(0.12, 0.008 * dtH)
  growth = Math.max(0, Math.min(REIF, growth))

  const tage = dtH / 24
  let weeds = bed.weeds
  if (weeds < UNKRAUT_MAX && rnd() < 1 - Math.pow(1 - UNKRAUT_PRO_TAG, tage)) weeds += 1
  let snail = bed.snail
  if (!snail && growth > 0.3 && growth < REIF && rnd() < 1 - Math.pow(1 - SCHNECKE_PRO_TAG, tage)) snail = true

  return { ...bed, water, growth, weeds, snail, updatedAt: now }
}

export function simuliereGarten(garden: Garden, now: number, rnd: () => number = Math.random): SimulationsErgebnis {
  const gereift: string[] = []
  const durstig: string[] = []
  let unkraut = 0
  let schnecken = 0
  const beds = garden.beds.map((bed) => {
    const neu = simuliereBeet(bed, now, rnd)
    const art = pflanzeById(bed.speciesId)
    if (art) {
      if (bed.growth < REIF && neu.growth >= REIF) gereift.push(art.name)
      if (neu.water < DURST_AB) durstig.push(art.name)
      if (neu.weeds > bed.weeds) unkraut += 1
      if (neu.snail && !bed.snail) schnecken += 1
    }
    return neu
  })
  return { garden: { ...garden, beds }, gereift, durstig, unkraut, schnecken }
}

/* ------------------------------------------------------------------ */
/* Pflege                                                              */
/* ------------------------------------------------------------------ */

export function istReif(bed: GardenBed): boolean {
  return bed.growth >= REIF
}

export function hatDurst(bed: GardenBed): boolean {
  return bed.water < DURST_AB
}

/** 0 = frisch, 1 = völlig vertrocknet — für die Zeichnung */
export function welke(bed: GardenBed): number {
  if (bed.water >= DURST_AB) return 0
  return Math.min(1, (DURST_AB - bed.water) / DURST_AB)
}

export interface Pflegeergebnis {
  bed: GardenBed
  /** Gab es einen sichtbaren Wachstumsschub? */
  schub: boolean
}

export function giessen(bed: GardenBed, now: number): Pflegeergebnis {
  const schub = bed.water < SCHUB_AB && bed.growth < REIF
  return {
    bed: {
      ...bed,
      water: 100,
      growth: Math.min(REIF, bed.growth + (schub ? SCHUB_GIESSEN : 0)),
      updatedAt: now,
    },
    schub,
  }
}

export function jaeten(bed: GardenBed, now: number): Pflegeergebnis {
  if (bed.weeds <= 0) return { bed, schub: false }
  return {
    bed: { ...bed, weeds: bed.weeds - 1, growth: Math.min(REIF, bed.growth + SCHUB_JAETEN), updatedAt: now },
    schub: bed.growth < REIF,
  }
}

export function schneckeVertreiben(bed: GardenBed, now: number): Pflegeergebnis {
  if (!bed.snail) return { bed, schub: false }
  return { bed: { ...bed, snail: false, updatedAt: now }, schub: false }
}

export function duengen(bed: GardenBed, now: number): Pflegeergebnis {
  return {
    bed: {
      ...bed,
      growth: Math.min(REIF, bed.growth + SCHUB_DUENGEN),
      fertilizedUntil: now + DUENGER_STUNDEN * STUNDE,
      updatedAt: now,
    },
    schub: bed.growth < REIF,
  }
}

export function pflanzen(slot: number, art: Pflanze, now: number): GardenBed {
  return {
    slot,
    speciesId: art.id,
    plantedAt: now,
    growth: 0,
    water: 100,
    updatedAt: now,
    weeds: 0,
    snail: false,
    harvests: 0,
  }
}

export interface Ernte {
  /** Das Beet danach — null, wenn die Pflanze abgeerntet ist */
  bed: GardenBed | null
  sterne: number
  text: string
}

export function ernten(bed: GardenBed, art: Pflanze, now: number): Ernte {
  const text = `${art.name} geerntet: ${art.ertrag}! Dafür gibt es ${art.sterne} Sterne.`
  if (!art.mehrjaehrig) return { bed: null, sterne: art.sterne, text }
  return {
    bed: { ...bed, growth: NACH_ERNTE, harvests: bed.harvests + 1, snail: false, updatedAt: now },
    sterne: art.sterne,
    text,
  }
}

/* ------------------------------------------------------------------ */
/* Beete und Ausbau                                                    */
/* ------------------------------------------------------------------ */

export function beeteFuer(harvestsTotal: number): number {
  const stufen = BEETE_STUFEN.filter((s) => harvestsTotal >= s).length
  return Math.min(BEETE_MAX, BEETE_START + stufen * 2)
}

export function freieBeete(garden: Garden): number[] {
  const belegt = new Set(garden.beds.map((b) => b.slot))
  return Array.from({ length: garden.bedCount }, (_, i) => i).filter((i) => !belegt.has(i))
}

/** Die nächste Ausbaustufe, falls gerade eine erreicht wurde. */
export function neueBeete(garden: Garden): { garden: Garden; dazu: number } {
  const soll = beeteFuer(garden.harvestsTotal)
  if (soll <= garden.bedCount) return { garden, dazu: 0 }
  return { garden: { ...garden, bedCount: soll }, dazu: soll - garden.bedCount }
}

/* ------------------------------------------------------------------ */
/* Besucher                                                            */
/* ------------------------------------------------------------------ */

/** Welche Tiere gerade Lust auf diesen Garten haben. */
export function moeglicheBesucher(garden: Garden): string[] {
  const arten = garden.beds
    .map((b) => ({ bed: b, art: pflanzeById(b.speciesId) }))
    .filter((x): x is { bed: GardenBed; art: Pflanze } => Boolean(x.art))
  const gewachsen = arten.filter((x) => x.bed.growth >= 0.5)
  const blumen = gewachsen.filter((x) => x.art.art === 'blume').length
  const gemuese = gewachsen.filter((x) => x.art.art === 'gemuese').length
  const obst = gewachsen.filter((x) => x.art.art === 'obst').length
  const baeume = gewachsen.filter((x) => x.art.art === 'baum').length
  const deko = new Set(garden.decor.map((d) => d.decorId))
  const out: string[] = []
  if (blumen >= 2) out.push('schmetterling')
  if (blumen >= 3 || (blumen >= 1 && deko.has('bienenstock'))) out.push('biene')
  if (deko.has('vogelhaus') || gewachsen.length >= 5) out.push('vogel')
  if (gemuese >= 3) out.push('hase')
  if (gemuese + obst >= 4) out.push('igel')
  if (deko.has('teich')) out.push('frosch')
  if (baeume >= 1) out.push('eichhoernchen')
  if (obst >= 2) out.push('marienkaefer')
  return out
}

/** Besucher, die neu dazugekommen sind, und der aktualisierte Garten. */
export function aktualisiereBesucher(garden: Garden): { garden: Garden; neu: string[] } {
  const moeglich = moeglicheBesucher(garden)
  const bisher = new Set(garden.visitors)
  const neu = moeglich.filter((id) => !bisher.has(id))
  // Wer einmal da war, bleibt im Buch — im Garten sieht man die, denen es gerade gefällt.
  const alle = [...new Set([...garden.visitors, ...neu])]
  return { garden: { ...garden, visitors: alle }, neu }
}

/* ------------------------------------------------------------------ */
/* Alter Wald → neuer Garten                                           */
/* ------------------------------------------------------------------ */

/** Wo alte Wald-Objekte landen: als Pflanze, als Deko — oder gar nicht. */
const WALD_ZU_PFLANZE: Record<string, string> = {
  blume: 'tulpe',
  busch: 'lavendel',
  baum: 'apfelbaum',
  sonnenblume: 'sonnenblume',
  tanne: 'kirschbaum',
  erdbeerbeet: 'erdbeere',
  seerose: 'rose',
}
const WALD_ZU_DEKO: Record<string, string> = {
  bank: 'bank',
  vogelhaus: 'vogelhaus',
  teich: 'teich',
  bienenstock: 'bienenstock',
  laterne: 'laterne',
  pilzhaus: 'gartenzwerg',
  bruecke: 'brunnen',
  lagerfeuer: 'laterne',
}

/**
 * Baut aus einem alten Wald einen Garten. Nichts geht verloren, was sich
 * übersetzen lässt: Pflanzen werden zu Beeten mit dem alten Wachstum, Häuser
 * zu Deko. Tiere, die es im Wald gab, sind als Besucher schon bekannt.
 */
export function ausWald(forest: ForestItem[], inventory: InventoryItem[] = [], now: number): Garden {
  const garden = leererGarten()
  const alle: { id: string; growthDays: number }[] = [
    ...forest.map((f) => ({ id: f.objectId, growthDays: f.growthDays })),
    ...inventory.map((i) => ({ id: i.objectId, growthDays: i.growthDays })),
  ]
  // Genug Beete, damit die alten Pflanzen Platz haben — bis zum Maximum.
  const pflanzenIds = alle.map((x) => WALD_ZU_PFLANZE[x.id]).filter(Boolean)
  garden.bedCount = Math.max(BEETE_START, Math.min(BEETE_MAX, Math.ceil(pflanzenIds.length / 2) * 2))
  let slot = 0
  for (const x of alle) {
    const pid = WALD_ZU_PFLANZE[x.id]
    if (pid && slot < garden.bedCount) {
      const bed = pflanzen(slot, pflanzeById(pid)!, now)
      bed.growth = Math.min(0.9, 0.2 + (x.growthDays ?? 0) * 0.12)
      bed.water = 80
      garden.beds.push(bed)
      slot += 1
      continue
    }
    const did = WALD_ZU_DEKO[x.id]
    if (did && !garden.decor.some((d) => d.decorId === did)) {
      garden.decor.push({ slot: garden.decor.length, decorId: did })
    }
  }
  const tiere: Record<string, string> = { hase: 'hase', igel: 'igel', ente: 'frosch', eule: 'vogel', reh: 'eichhoernchen', schmetterlinge: 'schmetterling' }
  for (const x of alle) {
    const b = tiere[x.id]
    if (b && !garden.visitors.includes(b)) garden.visitors.push(b)
  }
  return garden
}

/** Der Garten eines Kindes — angelegt, falls es noch keinen hat. */
export function gartenVon(child: Child, now = Date.now()): Garden {
  if (child.garden) return child.garden
  return ausWald(child.forest ?? [], child.inventory ?? [], now)
}

/* ------------------------------------------------------------------ */
/* Für Buch und Elternbereich                                          */
/* ------------------------------------------------------------------ */

/** Alles, was das Kind im Garten kennt: Pflanzen, Deko, Besucher. */
export function gesammelteSeiten(garden: Garden): Set<string> {
  return new Set([
    ...garden.beds.map((b) => b.speciesId),
    ...garden.decor.map((d) => d.decorId),
    ...garden.visitors,
    ...(garden.known ?? []),
  ])
}

/** Merkt sich eine Pflanze fürs Buch, auch wenn sie später abgeerntet ist. */
export function merkeBekannt(garden: Garden, id: string): Garden {
  const known = garden.known ?? []
  if (known.includes(id)) return garden
  return { ...garden, known: [...known, id] }
}

export const ALLE_SEITEN = PFLANZEN.length + DEKO.length + BESUCHER.length

/* ------------------------------------------------------------------ */
/* Ernte-Meilensteine                                                  */
/* ------------------------------------------------------------------ */

export interface ErnteMeilenstein {
  id: string
  ab: number
  bonus: number
  text: string
}

export const ERNTE_MEILENSTEINE: ErnteMeilenstein[] = [
  { id: 'ernte-1', ab: 1, bonus: 2, text: 'Deine allererste Ernte! Das feiern wir.' },
  { id: 'ernte-5', ab: 5, bonus: 4, text: 'Fünf Ernten! Du bist jetzt richtige Gärtnerin, richtiger Gärtner.' },
  { id: 'ernte-15', ab: 15, bonus: 8, text: 'Fünfzehn Ernten — dein Garten ist der schönste im ganzen Wald.' },
  { id: 'ernte-30', ab: 30, bonus: 12, text: 'Dreißig Ernten! Selbst Funkel staunt.' },
]

export function offenerMeilenstein(harvestsTotal: number, gefeiert: string[]): ErnteMeilenstein | null {
  return ERNTE_MEILENSTEINE.find((m) => harvestsTotal >= m.ab && !gefeiert.includes(m.id)) ?? null
}
