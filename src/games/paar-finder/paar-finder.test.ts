import { describe, expect, it } from 'vitest'
import { generateTask } from './paar-finder'
import { checkDeterminism } from '../generator-contract'
import { mulberry32 } from '../rng'

const PAARE_PRO_STUFE: Record<number, number> = {
  1: 3, 2: 4, 3: 6, 4: 8, 5: 8, 6: 6, 7: 10, 8: 6, 9: 12, 10: 12,
}

describe('Paar-Finder – Generator', () => {
  it('erzeugt auf jeder Stufe ein vollständiges, eindeutiges Brett', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(lvl * 1000 + i))
        const where = `Stufe ${lvl}, Durchlauf ${i}`
        const { karten, paare } = t.data

        expect(paare, where).toBe(PAARE_PRO_STUFE[lvl])
        expect(karten.length, where).toBe(paare * 2)

        // Jede Karten-Id kommt genau einmal vor
        const ids = karten.map((k) => k.id)
        expect(new Set(ids).size, `${where}: doppelte Karten-Id`).toBe(ids.length)

        // Jede Paar-Id kommt genau zweimal vor
        const paarIds = karten.map((k) => k.paarId)
        const zaehler = new Map<string, number>()
        paarIds.forEach((p) => zaehler.set(p, (zaehler.get(p) ?? 0) + 1))
        expect(zaehler.size, `${where}: falsche Anzahl Paare`).toBe(paare)
        for (const [p, n] of zaehler) {
          expect(n, `${where}: Paar ${p} kommt ${n}× vor`).toBe(2)
        }

        expect(t.speak.length, where).toBeGreaterThan(5)
        expect(t.data.freiVersuche, where).toBe(paare + 4)
      }
    }
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('zeigt bei Bild-Memory nie dasselbe Motiv in zwei verschiedenen Paaren', () => {
    // Sonst wären vier Karten identisch und es gäbe mehrere richtige Antworten.
    for (const lvl of [1, 2, 3, 4, 5, 7, 9, 10]) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const motivZuPaar = new Map<string, Set<string>>()
        for (const k of t.data.karten) {
          if (!motivZuPaar.has(k.text)) motivZuPaar.set(k.text, new Set())
          motivZuPaar.get(k.text)!.add(k.paarId)
        }
        for (const [motiv, paare] of motivZuPaar) {
          expect(paare.size, `Stufe ${lvl}: Motiv ${motiv} in ${paare.size} Paaren`).toBe(1)
        }
      }
    }
  })

  it('paart auf Stufe 6 Bild und Anlaut eindeutig', () => {
    for (let i = 0; i < 150; i++) {
      const t = generateTask(6, mulberry32(i))
      const buchstaben = t.data.karten.filter((k) => k.text.length === 1 && /[A-ZÄÖÜ]/.test(k.text))
      expect(buchstaben).toHaveLength(t.data.paare)
      // Jeder Buchstabe kommt nur einmal vor – sonst passt ein Bild zu zwei Karten
      const texte = buchstaben.map((k) => k.text)
      expect(new Set(texte).size, texte.join(',')).toBe(texte.length)
    }
  })

  it('paart auf Stufe 8 Rechnung und Ergebnis eindeutig', () => {
    for (let i = 0; i < 150; i++) {
      const t = generateTask(8, mulberry32(i))
      const terme = t.data.karten.filter((k) => k.text.includes('+'))
      const werte = t.data.karten.filter((k) => !k.text.includes('+'))
      expect(terme).toHaveLength(t.data.paare)
      expect(werte).toHaveLength(t.data.paare)

      // Jedes Ergebnis kommt nur einmal vor
      const zahlen = werte.map((k) => k.text)
      expect(new Set(zahlen).size, zahlen.join(',')).toBe(zahlen.length)

      // Und jede Rechnung ergibt wirklich ihren Partner
      for (const term of terme) {
        const partner = t.data.karten.find((k) => k.paarId === term.paarId && k.id !== term.id)!
        const [a, b] = term.text.split('+').map((x) => Number(x.trim()))
        expect(Number(partner.text), `${term.text} ≠ ${partner.text}`).toBe(a + b)
      }
    }
  })

  it('mischt die Karten – nicht immer Paar für Paar hintereinander', () => {
    let ungemischt = 0
    for (let i = 0; i < 100; i++) {
      const t = generateTask(4, mulberry32(i))
      const nebeneinander = t.data.karten.filter(
        (k, idx) => idx > 0 && t.data.karten[idx - 1].paarId === k.paarId,
      ).length
      if (nebeneinander >= t.data.paare) ungemischt++
    }
    expect(ungemischt).toBe(0)
  })

  it('spielt eine Runde als ein Brett, nicht als sechs Aufgaben', async () => {
    const { paarFinder } = await import('./paar-finder')
    expect(paarFinder.tasksPerRound).toBe(1)
  })
})
