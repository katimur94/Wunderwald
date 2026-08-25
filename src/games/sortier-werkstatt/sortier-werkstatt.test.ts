import { describe, expect, it } from 'vitest'
import { generateTask, TISCH, type SortTask } from './sortier-werkstatt'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'
import { gehoertZu, kategorieById, KOMBI_RUNDEN } from '../../learning/sortier-daten'

/** Alle Körbe der Aufgabe als echte Kategorien (der Tisch ist keine). */
function kategorien(t: SortTask) {
  return t.data.koerbe.map((k) => {
    const ausPool = kategorieById(k.id)
    if (ausPool) return ausPool
    // Kombi-Körbe stehen nicht im Haupt-Pool
    return KOMBI_RUNDEN.flatMap((r) => r.koerbe).find((x) => x.id === k.id)!
  })
}

describe('Sortier-Werkstatt – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<SortTask>(generateTask, {
      optionsOf: (t) => t.data.optionen,
      minOptions: () => 2,
      extra: (t, lvl) => {
        const where = `Stufe ${lvl}`
        expect(t.data.frage.length, where).toBeGreaterThan(3)
        expect(t.data.dinge.length, where).toBe(6)
        const ids = t.data.dinge.map((o) => o.id)
        expect(new Set(ids).size, `${where}: doppelte Objekt-Kennung`).toBe(ids.length)
        const emojis = t.data.dinge.map((o) => o.emoji)
        expect(new Set(emojis).size, `${where}: dasselbe Ding zweimal`).toBe(emojis.length)
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('gibt jedem Ding genau einen richtigen Korb', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(lvl * 4211 + i))
        const koerbe = kategorien(t)
        for (const ding of t.data.dinge) {
          const where = `Stufe ${lvl}, Durchlauf ${i}, ${ding.name}`
          const passende = koerbe.filter((k) => gehoertZu(ding, k))
          if (ding.ziel === TISCH) {
            // Ein Ding für den Tisch darf in KEINEN Korb passen.
            expect(passende.length, `${where} passt doch in einen Korb`).toBe(0)
          } else {
            expect(passende.length, `${where} passt in ${passende.length} Körbe`).toBe(1)
            expect(passende[0].id, where).toBe(ding.ziel)
          }
          // Das Ziel gehört zu den angebotenen Zielen
          expect(t.data.optionen, where).toContain(ding.ziel)
        }
      }
    }
  })

  it('nennt jedes Ding beim Namen, mit Artikel', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 30; i++) {
        for (const ding of generateTask(lvl, mulberry32(i)).data.dinge) {
          expect(ding.mitArtikel, ding.name).toMatch(/^(der|die|das) /)
        }
      }
    }
  })

  it('stellt auf Stufe 1 bis 3 zwei und auf Stufe 4 drei Körbe hin', () => {
    for (const [lvl, anzahl] of [[1, 2], [2, 2], [3, 2], [4, 3]] as const) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('art')
        expect(t.data.koerbe.length, `Stufe ${lvl}`).toBe(anzahl)
        expect(t.data.mitTisch).toBe(false)
        t.data.koerbe.forEach((k) => expect(k.deckel, k.id).toBeTruthy())
      }
    }
  })

  it('nimmt auf Stufe 1 weit auseinanderliegende Körbe', () => {
    for (let i = 0; i < 100; i++) {
      const t = generateTask(1, mulberry32(i))
      const ids = t.data.koerbe.map((k) => k.id).sort().join('/')
      // Werkzeuge gegen Instrumente wäre für den Anfang zu nah beieinander.
      expect(ids).not.toBe('instrumente/werkzeuge')
    }
  })

  it('sortiert auf Stufe 5 nach Merkmal statt nach Art', () => {
    for (let i = 0; i < 100; i++) {
      const t = generateTask(5, mulberry32(i))
      expect(t.data.mode).toBe('merkmal')
      kategorien(t).forEach((k) => expect(k.art, k.id).toBe('merkmal'))
    }
  })

  it('stellt auf Stufe 6 den Fragezeichen-Tisch dazu, mit genau einem Ding darauf', () => {
    for (let i = 0; i < 100; i++) {
      const t = generateTask(6, mulberry32(i))
      expect(t.data.mode).toBe('ohnePlatz')
      expect(t.data.mitTisch).toBe(true)
      expect(t.data.optionen).toContain(TISCH)
      const aufDenTisch = t.data.dinge.filter((o) => o.ziel === TISCH)
      expect(aufDenTisch.length, `Durchlauf ${i}`).toBe(1)
    }
  })

  it('fragt auf Stufe 7 und 8 nach zwei Merkmalen zugleich', () => {
    for (const [lvl, anzahl] of [[7, 2], [8, 3]] as const) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('zweiMerkmale')
        expect(t.data.koerbe.length, `Stufe ${lvl}`).toBe(anzahl)
        // Alle Körbe stammen aus derselben Runde — sonst wäre die Frage falsch.
        const runde = KOMBI_RUNDEN.find((r) => r.koerbe.some((k) => k.id === t.data.koerbe[0].id))!
        t.data.koerbe.forEach((k) =>
          expect(runde.koerbe.map((x) => x.id), `Stufe ${lvl}`).toContain(k.id),
        )
      }
    }
  })

  it('verdeckt auf Stufe 9 und 10 genau einen Deckel und bietet drei zur Wahl', () => {
    for (const [lvl, anzahl] of [[9, 2], [10, 3]] as const) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('oberbegriff')
        expect(t.data.koerbe.length, `Stufe ${lvl}`).toBe(anzahl)
        const verdeckt = t.data.koerbe.filter((k) => k.deckel === null)
        expect(verdeckt.length, `Stufe ${lvl}`).toBe(1)
        expect(t.data.deckelAntwort).toBe(verdeckt[0].id)

        const auswahl = t.data.deckelAuswahl!
        expect(auswahl.length).toBe(3)
        expect(new Set(auswahl.map((x) => x.id)).size).toBe(3)
        expect(auswahl.filter((x) => x.id === t.data.deckelAntwort).length).toBe(1)
        // Die falschen Deckel gehören zu keinem sichtbaren Korb — sonst wäre
        // die Antwort schon durch Hinsehen zu erraten.
        const sichtbar = t.data.koerbe.filter((k) => k.deckel !== null).map((k) => k.id)
        auswahl
          .filter((x) => x.id !== t.data.deckelAntwort)
          .forEach((x) => expect(sichtbar, x.id).not.toContain(x.id))
      }
    }
  })

  it('erzeugt auf einer Stufe nicht immer dieselbe Runde', () => {
    const gesehen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const t = generateTask(4, mulberry32(i))
      gesehen.add(t.data.koerbe.map((k) => k.id).join('/'))
    }
    expect(gesehen.size).toBeGreaterThan(4)
  })
})

describe('Sortier-Werkstatt – Vorlesetexte', () => {
  it('sagt auf jeder Stufe, worum es geht', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 40; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.speak.length, `Stufe ${lvl}`).toBeGreaterThan(15)
      }
    }
  })
})
