import { mulberry32, randInt } from '../rng'

/**
 * Strecken-Geometrie des Zahlen-Sprungs. Alles rechnet in Szenen-Einheiten
 * (su): Die Szene ist immer 100 su hoch, ein su entspricht also einem
 * Hundertstel der sichtbaren Spielhöhe. So skaliert dieselbe Strecke vom
 * 560-px-Handy bis zum Tablet, ohne dass sich die Physik ändert.
 *
 * Reine Funktionen ohne DOM — deshalb ohne Browser testbar.
 */

/** Höhe des Bodenstreifens. */
export const BODEN_H = 14
/** Körperhöhe des Läufers — bis hier reicht Funkels Kopf im Stand. */
export const FUNKEL_H = 21
/** Kantenlänge eines Antwort-Blocks. */
export const BLOCK_H = 15
/** Unterkante der Antwort-Blöcke über dem Boden. */
export const BLOCK_Y = 42
/** Absprunggeschwindigkeit in su/s. */
export const SPRUNG_V0 = 190
/** Schwerkraft in su/s². Scheitel ≈ 35 su → Kopf erreicht die Blöcke gut. */
export const GRAVITATION = 520

/** Wo Funkel auf dem Schirm steht, als Anteil der Szenenbreite. */
export const FUNKEL_SCHIRM_X = 0.3

export type HindernisArt = 'busch' | 'stein' | 'stamm'

export interface Strecke {
  /** Gesamtlänge der Runde — dahinter geht es nahtlos von vorn weiter. */
  laenge: number
  /** Welt-x der drei Antwort-Blöcke (Mittelpunkte), aufsteigend. */
  bloecke: number[]
  hindernisse: { x: number; art: HindernisArt }[]
  /** Sammel-Funken: x in Welt, y als Höhe über dem Boden. */
  funken: { x: number; y: number }[]
}

/**
 * Baut die Runde: drei Blöcke mit weiten Lücken, dazwischen Hindernisse und
 * Funken-Bögen. Die Länge wächst mit der Sichtweite, damit auf breiten
 * Schirmen nie zwei Kopien desselben Blocks gleichzeitig zu sehen sind.
 */
export function baueStrecke(seed: number, sichtweite: number, hindernisAnzahl: number): Strecke {
  const rng = mulberry32(seed >>> 0)
  const laenge = Math.max(430, Math.round(sichtweite) + 160)
  const drittel = laenge / 3

  const bloecke = [0, 1, 2].map((i) => Math.round(drittel * i + drittel * (0.55 + rng() * 0.2)))

  const arten: HindernisArt[] = ['busch', 'stein', 'stamm']
  const hindernisse: Strecke['hindernisse'] = []
  const funken: Strecke['funken'] = []

  for (let i = 0; i < 3; i++) {
    const von = bloecke[i]
    const bis = i === 2 ? bloecke[0] + laenge : bloecke[i + 1]
    const luecke = bis - von

    // Höchstens ein Hindernis je Lücke, mit sicherem Abstand zu den Blöcken.
    if (i < hindernisAnzahl) {
      hindernisse.push({
        x: Math.round(von + luecke * (0.38 + rng() * 0.24)) % laenge,
        art: arten[randInt(rng, 0, arten.length - 1)],
      })
    }

    // Ein Funken-Bogen je Lücke: drei Funken, der mittlere hängt höher —
    // genau die Bahn eines Sprungs. Liegt ein Hindernis darunter, lohnt
    // sich der Sprung doppelt.
    const bogenMitte = von + luecke * (0.38 + rng() * 0.24)
    const bogenHoehe = 24 + randInt(rng, 0, 8)
    funken.push(
      { x: Math.round(bogenMitte - 11) % laenge, y: bogenHoehe - 7 },
      { x: Math.round(bogenMitte) % laenge, y: bogenHoehe },
      { x: Math.round(bogenMitte + 11) % laenge, y: bogenHoehe - 7 },
    )
    // Und ein Boden-Funke fürs Durchlaufen, versetzt zum Bogen.
    funken.push({ x: Math.round(von + luecke * (0.72 + rng() * 0.14)) % laenge, y: 6 })
  }

  return { laenge, bloecke, hindernisse, funken }
}

/**
 * Kürzester vorzeichenbehafteter Abstand von der Läuferposition `s` zum
 * Weltpunkt `x` auf der Rundstrecke: positiv = liegt voraus.
 */
export function wrapDelta(x: number, s: number, laenge: number): number {
  let d = (x - s) % laenge
  if (d < -laenge / 2) d += laenge
  if (d > laenge / 2) d -= laenge
  return d
}

/** Höchster Punkt, den Funkels Kopf im Sprung erreicht. */
export function sprungScheitel(): number {
  return FUNKEL_H + (SPRUNG_V0 * SPRUNG_V0) / (2 * GRAVITATION)
}
