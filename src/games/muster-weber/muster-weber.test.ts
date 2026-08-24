import { describe, expect, it } from 'vitest'
import { generateTask, type WeberTask } from './muster-weber'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'
import type { BeadSpec } from './Bead'

function key(b: BeadSpec) {
  return `${b.farbe}|${b.form}|${b.gross}|${b.anzahl}`
}

function optionKeys(t: WeberTask): (string | number)[] {
  return t.data.mode === 'zahlen'
    ? (t.data.optionen as number[])
    : (t.data.optionen as BeadSpec[]).map(key)
}

describe('Muster-Weber – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<WeberTask>(generateTask, {
      optionsOf: optionKeys,
      minOptions: () => 3,
      extra: (t, lvl) => {
        expect(t.data.frage.length, `Stufe ${lvl}`).toBeGreaterThan(3)
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('lässt bei Perlenmustern genau eine Lücke – am Ende der Reihe', () => {
    for (const lvl of [1, 2, 3, 4, 5, 6]) {
      for (let i = 0; i < 150; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode, `Stufe ${lvl}`).toBe('perlen')
        const luecken = t.data.reihe.filter((x) => x === null)
        expect(luecken, `Stufe ${lvl}`).toHaveLength(1)
        expect(t.data.reihe[t.data.reihe.length - 1], `Stufe ${lvl}`).toBeNull()
        expect(t.data.reihe.length).toBe(7)
      }
    }
  })

  it('setzt das Muster tatsächlich fort', () => {
    // Die Lösung muss der Perle entsprechen, die das Muster an dieser Stelle verlangt.
    for (const lvl of [1, 2, 3, 4, 5, 6]) {
      for (let i = 0; i < 150; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const sichtbar = t.data.reihe.slice(0, -1) as BeadSpec[]
        // Periode aus der sichtbaren Reihe ableiten
        const periode = [1, 2, 3, 4].find((p) =>
          sichtbar.every((b, idx) => key(b) === key(sichtbar[idx % p])),
        )
        expect(periode, `Stufe ${lvl}: keine erkennbare Periode`).toBeDefined()
        const erwartet = sichtbar[(t.data.reihe.length - 1) % periode!]
        expect(t.answer, `Stufe ${lvl}`).toBe(key(erwartet))
      }
    }
  })

  it('unterscheidet auf Stufe 5 nur über die Größe', () => {
    for (let i = 0; i < 150; i++) {
      const t = generateTask(5, mulberry32(i))
      const perlen = t.data.reihe.filter(Boolean) as BeadSpec[]
      const farben = new Set(perlen.map((p) => p.farbe))
      const formen = new Set(perlen.map((p) => p.form))
      const groessen = new Set(perlen.map((p) => p.gross))
      expect(farben.size).toBe(1)
      expect(formen.size).toBe(1)
      expect(groessen.size).toBe(2)
    }
  })

  it('variiert auf Stufe 6 Farbe und Form gleichzeitig', () => {
    for (let i = 0; i < 150; i++) {
      const t = generateTask(6, mulberry32(i))
      const perlen = t.data.reihe.filter(Boolean) as BeadSpec[]
      expect(new Set(perlen.map((p) => p.farbe)).size).toBe(2)
      expect(new Set(perlen.map((p) => p.form)).size).toBe(2)
    }
  })

  it('erzeugt auf Stufe 7 und 8 fortsetzbare Zahlenreihen', () => {
    for (const lvl of [7, 8]) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('zahlen')
        const z = t.data.zahlen!
        expect(z).toHaveLength(5)
        expect(z[4]).toBeNull()
        const sichtbar = z.slice(0, 4) as number[]
        sichtbar.forEach((n) => expect(n, `Stufe ${lvl}`).toBeGreaterThan(0))

        const diffs = sichtbar.slice(1).map((n, i2) => n - sichtbar[i2])
        const gleichbleibend = new Set(diffs).size === 1
        const verdoppelnd = sichtbar.slice(1).every((n, i2) => n === sichtbar[i2] * 2)
        expect(gleichbleibend || verdoppelnd, `Stufe ${lvl}: ${sichtbar.join(',')}`).toBe(true)

        const erwartet = verdoppelnd ? sichtbar[3] * 2 : sichtbar[3] + diffs[0]
        expect(t.answer, `Stufe ${lvl}: ${sichtbar.join(',')}`).toBe(erwartet)
        expect(t.answer as number).toBeGreaterThan(0)
      }
    }
  })

  it('nutzt auf Stufe 7 nur +1 und +2', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(7, mulberry32(i))
      const z = t.data.zahlen!.slice(0, 4) as number[]
      const schritt = z[1] - z[0]
      expect([1, 2]).toContain(schritt)
    }
  })

  it('baut auf Stufe 9 und 10 eine 3×3-Matrix mit genau einer Lücke', () => {
    for (const lvl of [9, 10]) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('matrix')
        expect(t.data.matrix).toHaveLength(9)
        expect(t.data.matrix!.filter((x) => x === null), `Stufe ${lvl}`).toHaveLength(1)
      }
    }
  })

  it('die Matrix-Lösung passt zu Zeilen- und Spaltenregel', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(9, mulberry32(i))
      const m = t.data.matrix!
      const idx = m.findIndex((x) => x === null)
      const zeile = Math.floor(idx / 3)
      const spalte = idx % 3
      // Farbe kommt aus der Zeile, Form aus der Spalte
      const andereInZeile = [0, 1, 2].filter((c) => c !== spalte).map((c) => m[zeile * 3 + c]!)
      const andereInSpalte = [0, 1, 2].filter((r) => r !== zeile).map((r) => m[r * 3 + spalte]!)
      const erwarteteFarbe = andereInZeile[0].farbe
      const erwarteteForm = andereInSpalte[0].form
      expect(t.answer).toBe(`${erwarteteFarbe}|${erwarteteForm}|true|1`)
    }
  })
})
