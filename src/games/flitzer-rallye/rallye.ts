/**
 * Flitzer-Rallye — die reine Logik ohne DOM: Strecke, Fragen-Adapter, Tore,
 * Gegner und Platzierung. Alles hier ist deterministisch aus Seed und Stufe
 * und deshalb ohne Browser testbar. Das Zeichnen steht in renderer.ts, die
 * Steuerung in flitzer-rallye.tsx.
 */

import type { WorldId } from '../../db/types'
import { mulberry32, pick, randInt, shuffle, type Rng } from '../rng'
import type { GameTask, TaskContext } from '../types'
import { generateTask as zahlenAufgabe } from '../zahlen-sprung/zahlen-sprung'
import { generateTask as buchstabenAufgabe } from '../buchstaben-fang/buchstaben-fang'
import { frageGedaechtnis, optionName, zieheWissensFrage, type WissensFrage } from '../../learning/wissen'
import { ALPHABET } from '../../learning/wordlist'

/* ------------------------------------------------------------------ */
/* Maße der Welt                                                       */
/* ------------------------------------------------------------------ */

/** Länge eines Streckenstücks in Welt-Einheiten */
export const SEG_LEN = 200
/** Halbe Straßenbreite */
export const ROAD_W = 2200
/** Kamerahöhe über der Straße */
export const CAM_H = 1150
/** Sichtweite in Streckenstücken */
export const DRAW_DIST = 130
/** Länge der Rundstrecke in Stücken — wiederholt sich nahtlos */
export const LOOP_SEGS = 1600
/** Mittelpunkte der drei Spuren in Straßenbreiten (−1 … 1) */
export const SPUREN = [-0.66, 0, 0.66] as const
/** Abstand zum nächsten Tor, wenn eine neue Frage kommt (in Stücken) */
export const TOR_ABSTAND = 105
/** Nach einer falschen Antwort steht dasselbe Tor wieder hier */
export const TOR_ABSTAND_NOCHMAL = 70
/** Ziellinie nach dem letzten Tor */
export const ZIEL_ABSTAND = 30

export type SpriteArt =
  | 'baum'
  | 'tanne'
  | 'busch'
  | 'blume'
  | 'pilz'
  | 'stein'
  | 'schild'
  | 'hase'
  | 'reh'
  | 'zaun'
  | 'laterne'

export interface Sprite {
  art: SpriteArt
  /** Seitlicher Versatz in Straßenbreiten: −1 = linker Straßenrand, kleiner = weiter draußen */
  offset: number
}

export interface Segment {
  index: number
  /** Krümmung: negativ links, positiv rechts */
  curve: number
  /** Höhe am Anfang und am Ende des Stücks */
  y1: number
  y2: number
  sprites: Sprite[]
}

/* ------------------------------------------------------------------ */
/* Strecke                                                             */
/* ------------------------------------------------------------------ */

function easeIn(a: number, b: number, p: number) {
  return a + (b - a) * p * p
}
function easeOut(a: number, b: number, p: number) {
  return a + (b - a) * (1 - (1 - p) * (1 - p))
}
function easeInOut(a: number, b: number, p: number) {
  return a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5)
}

/**
 * Baut die Rundstrecke: Geraden, sanfte S-Kurven und Hügel, dazu Bäume,
 * Blumen und ein paar Tiere am Rand. Kurven und Hügel werden mit der Stufe
 * kräftiger — Stufe 1 fährt fast geradeaus, Stufe 10 windet sich.
 */
export function baueRennstrecke(seed: number, stufe: number): Segment[] {
  const rng = mulberry32(seed)
  const lvl = Math.min(10, Math.max(1, stufe))
  const staerke = 0.35 + (lvl / 10) * 0.75
  const segments: Segment[] = []

  const add = (curve: number, y: number) => {
    const n = segments.length
    const y1 = n === 0 ? 0 : segments[n - 1].y2
    segments.push({ index: n, curve, y1, y2: y, sprites: [] })
  }

  function abschnitt(enter: number, hold: number, leave: number, curve: number, hoehe: number) {
    const start = segments.length ? segments[segments.length - 1].y2 : 0
    const total = enter + hold + leave
    for (let i = 0; i < enter; i++) {
      add(easeIn(0, curve, i / enter), easeInOut(start, start + hoehe, i / total))
    }
    for (let i = 0; i < hold; i++) {
      add(curve, easeInOut(start, start + hoehe, (enter + i) / total))
    }
    for (let i = 0; i < leave; i++) {
      add(easeOut(curve, 0, i / leave), easeInOut(start, start + hoehe, (enter + hold + i) / total))
    }
  }

  // Start: eine Gerade, damit die ersten Tore auf ebener Straße stehen.
  abschnitt(0, 40, 0, 0, 0)
  let hoeheBisher = 0
  while (segments.length < LOOP_SEGS - 80) {
    const wurf = rng()
    const richtung = rng() < 0.5 ? -1 : 1
    if (wurf < 0.3) {
      abschnitt(randInt(rng, 10, 20), randInt(rng, 10, 30), randInt(rng, 10, 20), 0, 0)
    } else if (wurf < 0.7) {
      const kurve = richtung * (1.5 + rng() * 3) * staerke
      abschnitt(randInt(rng, 15, 30), randInt(rng, 20, 45), randInt(rng, 15, 30), kurve, 0)
    } else {
      // Hügel: hoch und wieder runter, nie ins Bodenlose.
      const ziel = randInt(rng, -1200, 1600) * staerke
      const delta = ziel - hoeheBisher
      hoeheBisher = ziel
      const kurve = rng() < 0.4 ? richtung * (1 + rng() * 2) * staerke : 0
      abschnitt(randInt(rng, 15, 25), randInt(rng, 15, 30), randInt(rng, 15, 25), kurve, delta)
    }
  }
  // Zum Schluss zurück auf Ausgangshöhe und Kurve 0, damit die Runde nahtlos schließt.
  const rest = LOOP_SEGS - segments.length
  abschnitt(Math.floor(rest / 3), rest - 2 * Math.floor(rest / 3), Math.floor(rest / 3), 0, -hoeheBisher)
  while (segments.length < LOOP_SEGS) add(0, 0)
  segments.length = LOOP_SEGS
  segments[LOOP_SEGS - 1].y2 = 0

  // Randbepflanzung
  for (let i = 0; i < LOOP_SEGS; i++) {
    const s = segments[i]
    if (i % 4 === 0) {
      const seite = rng() < 0.5 ? -1 : 1
      s.sprites.push({ art: pick(rng, ['baum', 'baum', 'tanne', 'busch']), offset: seite * (1.25 + rng() * 1.6) })
    }
    if (i % 7 === 3) {
      const seite = rng() < 0.5 ? -1 : 1
      s.sprites.push({ art: pick(rng, ['blume', 'blume', 'pilz', 'stein']), offset: seite * (1.15 + rng() * 0.5) })
    }
    if (i % 30 === 15) {
      const seite = rng() < 0.5 ? -1 : 1
      s.sprites.push({ art: 'zaun', offset: seite * 1.18 })
    }
    if (i % 90 === 45) {
      const seite = rng() < 0.5 ? -1 : 1
      s.sprites.push({ art: pick(rng, ['hase', 'reh', 'schild', 'laterne']), offset: seite * (1.3 + rng() * 0.4) })
    }
  }
  return segments
}

/** Streckenstück zu einer Position, mit Umbruch am Rundenende. */
export function segmentAt(segments: Segment[], z: number): Segment {
  const n = segments.length
  const idx = ((Math.floor(z / SEG_LEN) % n) + n) % n
  return segments[idx]
}

/** Höhe der Straße an einer Position — für Kamera und Sprites. */
export function hoeheAt(segments: Segment[], z: number): number {
  const s = segmentAt(segments, z)
  const p = (((z % SEG_LEN) + SEG_LEN) % SEG_LEN) / SEG_LEN
  return s.y1 + (s.y2 - s.y1) * p
}

/* ------------------------------------------------------------------ */
/* Fragen: aus drei Welten eine Form                                   */
/* ------------------------------------------------------------------ */

export interface RallyeData {
  /** Welt, aus der die Frage stammt — dort wird der Versuch gebucht */
  quelle: WorldId
  /** Text auf dem Schild */
  frage: string
  /** Bild über dem Schild: ein Emoji oder eine Zählmenge (mehrere Emojis) */
  bild?: string
  /** Analoge Uhr statt Bild */
  uhr?: { stunde: number; minute: number }
  /** Beschriftung der drei Tore von links nach rechts */
  optionen: string[]
  /** Vorlesename je Option, falls sie ein Emoji ist */
  namen?: Record<string, string>
  /** Grundtempo der Runde, aus der eigenen Stufe */
  tempo: number
  /** Seed für die Strecke — gleich für alle Aufgaben einer Runde */
  streckeSeed: number
}

export type RallyeTask = GameTask<RallyeData>

/** Wie schnell das Auto auf freier Strecke fährt — in Welt-Einheiten je Sekunde. */
export function grundTempo(stufe: number): number {
  return 5200 + Math.min(10, Math.max(1, stufe)) * 260
}

/** Auf drei Antworten kürzen: Lösung bleibt, die ersten beiden Ablenker bleiben. */
export function aufDrei<T>(optionen: T[], loesung: T, rng: Rng): T[] {
  const ablenker = optionen.filter((o) => o !== loesung).slice(0, 2)
  return shuffle(rng, [loesung, ...ablenker])
}

function ausZahlenland(stufe: number, rng: Rng): Omit<RallyeData, 'tempo' | 'streckeSeed'> & { answer: string; speak: string } {
  const t = zahlenAufgabe(stufe, rng)
  const d = t.data
  const bild = d.menge ? d.menge.emoji.repeat(d.menge.anzahl) : undefined
  return {
    quelle: 'zahlen',
    frage: d.schild,
    bild,
    optionen: d.bloecke.map(String),
    answer: String(t.answer),
    speak: t.speak.replace(/Spring zum Block/g, 'Fahr durch das Tor').replace(/zum richtigen Block/g, 'durch das richtige Tor'),
  }
}

function ausBuchstabenwald(stufe: number, rng: Rng): Omit<RallyeData, 'tempo' | 'streckeSeed'> & { answer: string; speak: string } {
  const t = buchstabenAufgabe(stufe, rng)
  const d = t.data
  const answer = String(t.answer)
  // Stufe 1 kennt nur zwei Blätter — ein Tor braucht aber immer drei.
  const aufgefuellt = [...d.options]
  for (const l of shuffle(rng, ALPHABET)) {
    if (aufgefuellt.length >= 3) break
    if (!aufgefuellt.includes(l) && l !== answer) aufgefuellt.push(l)
  }
  const optionen = aufDrei(aufgefuellt, answer, rng)
  if (d.mode === 'lesen') {
    // Das Wort steht auf dem Schild, die Bilder stehen an den Toren.
    return { quelle: 'buchstaben', frage: d.wort, optionen, answer, speak: t.speak }
  }
  const frage =
    d.mode === 'luecke'
      ? (d.luecke ?? d.frage)
      : d.mode === 'grossKlein'
        ? `Groß: ${d.wort}`
        : d.mode === 'endlaut'
          ? `${d.wort} endet mit …`
          : `${d.wort} beginnt mit …`
  return {
    quelle: 'buchstaben',
    frage,
    bild: d.emoji,
    optionen,
    answer,
    speak: t.speak.replace(/Fang den/g, 'Fahr durch das Tor mit dem'),
  }
}

function ausWissen(
  stufe: number,
  rng: Rng,
  ctx?: TaskContext,
): Omit<RallyeData, 'tempo' | 'streckeSeed'> & { answer: string; speak: string } {
  const gedaechtnis = ctx?.childId ? frageGedaechtnis(ctx.childId) : undefined
  const f: WissensFrage = zieheWissensFrage(stufe, rng, gedaechtnis)
  return {
    quelle: 'entdecker',
    frage: f.frage,
    bild: f.bild,
    uhr: f.uhr,
    optionen: f.optionen,
    namen: f.namen,
    answer: f.antwort,
    speak: f.speak,
  }
}

/** Eine Frage aus drei Welten in einer Form — Rallye und Ballon-Platzer teilen sie sich. */
export type GemischteFrage = Omit<RallyeData, 'tempo' | 'streckeSeed'> & { answer: string; speak: string }

/**
 * Lost gewichtet eine Welt und zieht die Frage auf der Stufe dieser Welt
 * (aus dem Kontext); Wissensfragen laufen auf der eigenen Stufe.
 */
export function zieheGemischteFrage(difficulty: number, rng: Rng, ctx?: TaskContext): GemischteFrage {
  const eigene = Math.min(10, Math.max(1, Math.round(difficulty)))
  const stufeVon = (w: WorldId) => Math.min(10, Math.max(1, Math.round(ctx?.levels?.[w] ?? eigene)))
  const wurf = rng()
  return wurf < 0.36
    ? ausZahlenland(stufeVon('zahlen'), rng)
    : wurf < 0.6
      ? ausBuchstabenwald(stufeVon('buchstaben'), rng)
      : ausWissen(eigene, rng, ctx)
}

/**
 * Zieht eine Renn-Aufgabe: Frage aus drei Welten, Tempo aus der eigenen Stufe.
 */
export function generateTask(difficulty: number, rng: Rng, ctx?: TaskContext): RallyeTask {
  const eigene = Math.min(10, Math.max(1, Math.round(difficulty)))
  const { answer, speak, ...data } = zieheGemischteFrage(difficulty, rng, ctx)
  return {
    data: {
      ...data,
      tempo: grundTempo(eigene),
      streckeSeed: Math.floor(rng() * 0x7fffffff),
    },
    answer,
    speak,
  }
}

/** Was Funkel sagt, wenn er die Optionen nennt (Emojis bekommen Namen). */
export function optionenText(d: RallyeData): string {
  return d.optionen.map((o) => d.namen?.[o] ?? o).join(', ')
}

export { optionName }

/* ------------------------------------------------------------------ */
/* Spuren und Tore                                                     */
/* ------------------------------------------------------------------ */

/** In welcher Spur steht das Auto bei dieser Querposition? */
export function spurVon(x: number): number {
  if (x < -0.33) return 0
  if (x > 0.33) return 2
  return 1
}

/* ------------------------------------------------------------------ */
/* Gegner: Vorsprung statt Physik                                      */
/* ------------------------------------------------------------------ */

export interface Gegner {
  name: string
  emoji: string
  farbe: string
  /** Vorsprung in Streckenstücken: positiv = vor dem Kind */
  vorsprung: number
  /** Spur (−0.66, 0, 0.66) */
  x: number
}

export const GEGNER_VORLAGEN: Omit<Gegner, 'vorsprung' | 'x'>[] = [
  { name: 'Igel', emoji: '🦔', farbe: '#B98A5E' },
  { name: 'Frosch', emoji: '🐸', farbe: '#7FB069' },
  { name: 'Eule', emoji: '🦉', farbe: '#9A7FC9' },
  { name: 'Hase', emoji: '🐰', farbe: '#6FB5C9' },
  { name: 'Bär', emoji: '🐻', farbe: '#8E6842' },
  { name: 'Biene', emoji: '🐝', farbe: '#F6BD41' },
]

export const VORSPRUNG_START = [9, 18, 28]
export const VORSPRUNG_RICHTIG = -13
export const VORSPRUNG_FALSCH = 5
export const VORSPRUNG_MAX = 48
export const VORSPRUNG_MIN = -60

/** Drei Gegner, die nicht das Tier des Kindes sind. */
export function starteGegner(rng: Rng, eigenesEmoji: string): Gegner[] {
  const pool = GEGNER_VORLAGEN.filter((g) => g.emoji !== eigenesEmoji)
  const drei = shuffle(rng, pool).slice(0, 3)
  const spuren = shuffle(rng, [...SPUREN])
  return drei.map((g, i) => ({ ...g, vorsprung: VORSPRUNG_START[i], x: spuren[i] }))
}

/** Nach einer Antwort: Gegner fallen zurück oder ziehen davon. */
export function gegnerNachAntwort(gegner: Gegner[], richtig: boolean): Gegner[] {
  const delta = richtig ? VORSPRUNG_RICHTIG : VORSPRUNG_FALSCH
  return gegner.map((g) => ({
    ...g,
    vorsprung: Math.max(VORSPRUNG_MIN, Math.min(VORSPRUNG_MAX, g.vorsprung + delta)),
  }))
}

/** Platz 1 … 4: wie viele Gegner noch vor dem Kind liegen, plus eins. */
export function platzierung(gegner: Gegner[]): number {
  return 1 + gegner.filter((g) => g.vorsprung > 0).length
}

export function platzText(platz: number): string {
  return platz === 1 ? '1. Platz' : platz === 2 ? '2. Platz' : platz === 3 ? '3. Platz' : '4. Platz'
}

export function platzSymbol(platz: number): string {
  return platz === 1 ? '🏆' : platz === 2 ? '🥈' : platz === 3 ? '🥉' : '🎗️'
}

/* ------------------------------------------------------------------ */
/* Funken auf der Straße                                               */
/* ------------------------------------------------------------------ */

export interface Funke {
  z: number
  x: number
  weg: boolean
}

/** Streut Funken zwischen zwei Positionen — in einer Spur, nie im Tor. */
export function streueFunken(rng: Rng, vonZ: number, bisZ: number): Funke[] {
  const out: Funke[] = []
  let z = vonZ + SEG_LEN * 12
  while (z < bisZ - SEG_LEN * 14) {
    const x = pick(rng, SPUREN)
    const n = randInt(rng, 3, 5)
    for (let i = 0; i < n; i++) out.push({ z: z + i * SEG_LEN * 2.5, x, weg: false })
    z += SEG_LEN * randInt(rng, 26, 40)
  }
  return out
}
