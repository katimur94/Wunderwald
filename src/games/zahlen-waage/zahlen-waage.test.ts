import { describe, expect, it } from 'vitest'
import { generateTask, kanonisch, kombinationenAus, type WaageTask } from './zahlen-waage'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'

/** Summe der Gewichte, die rechts liegen, wenn `auswahl` dazukommt. */
function rechtsMit(t: WaageTask, auswahl: number[]): number {
  return t.data.rechtsFest.reduce((a, b) => a + b, 0) + auswahl.reduce((a, b) => a + b, 0)
}

function linksSumme(t: WaageTask): number {
  return t.data.links.reduce((a, b) => a + b, 0)
}

function loesungswerte(t: WaageTask): number[] {
  return (t.answer as string).split('+').map(Number)
}

describe('Zahlen-Waage – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<WaageTask>(generateTask, {
      // „Optionen" sind hier alle Gewichts-Kombinationen der geforderten Größe.
      optionsOf: (t) => t.data.kombinationen,
      minOptions: () => 3,
      extra: (t, lvl) => {
        const where = `Stufe ${lvl}`
        expect(t.data.frage.length, where).toBeGreaterThan(3)
        expect(t.data.vorrat.length, where).toBeGreaterThanOrEqual(4)
        // Jede Zahl liegt genau einmal im Vorrat
        expect(new Set(t.data.vorrat).size, where).toBe(t.data.vorrat.length)
        t.data.vorrat.forEach((w) => expect(w, where).toBeGreaterThan(0))
        t.data.links.forEach((w) => expect(w, where).toBeGreaterThan(0))
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('hat auf jeder Stufe genau einen Weg, die Waage zu lösen', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(lvl * 7919 + i))
        const where = `Stufe ${lvl}, Durchlauf ${i}`
        const links = linksSumme(t)
        const treffer = kombinationenAus(t.data.vorrat, t.data.benoetigt).filter((c) =>
          t.data.richtung === 'gleich' ? rechtsMit(t, c) === links : rechtsMit(t, c) < links,
        )
        expect(treffer.length, `${where}: ${treffer.length} Lösungen`).toBe(1)
        expect(kanonisch(treffer[0]), where).toBe(t.answer)
      }
    }
  })

  it('legt die Lösung immer in den Vorrat', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 60; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const vorrat = [...t.data.vorrat]
        for (const w of loesungswerte(t)) {
          const idx = vorrat.indexOf(w)
          expect(idx, `Stufe ${lvl}: ${w} fehlt im Vorrat`).toBeGreaterThanOrEqual(0)
          vorrat.splice(idx, 1)
        }
      }
    }
  })

  it('braucht auf Stufe 1 genau ein Gewicht und lässt rechts leer', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(1, mulberry32(i))
      expect(t.data.mode).toBe('gleich')
      expect(t.data.rechtsFest).toEqual([])
      expect(t.data.benoetigt).toBe(1)
      expect(t.data.links[0]).toBeGreaterThanOrEqual(2)
      expect(t.data.links[0]).toBeLessThanOrEqual(5)
      expect(t.answer).toBe(String(t.data.links[0]))
    }
  })

  it('ergänzt auf den Stufen 2, 3 und 5 in wachsenden Bereichen', () => {
    const grenzen: Record<number, [number, number]> = { 2: [3, 6], 3: [5, 10], 5: [11, 20] }
    for (const lvl of [2, 3, 5]) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const [min, max] = grenzen[lvl]
        expect(t.data.mode).toBe('ergaenzen')
        expect(t.data.rechtsFest.length).toBe(1)
        expect(t.data.benoetigt).toBe(1)
        expect(t.data.links[0]).toBeGreaterThanOrEqual(min)
        expect(t.data.links[0]).toBeLessThanOrEqual(max)
        expect(rechtsMit(t, loesungswerte(t))).toBe(linksSumme(t))
      }
    }
  })

  it('verlangt auf Stufe 4 zwei und auf Stufe 9 drei Gewichte', () => {
    for (const [lvl, anzahl] of [[4, 2], [9, 3]] as const) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('zerlegen')
        expect(t.data.benoetigt).toBe(anzahl)
        const werte = loesungswerte(t)
        expect(werte.length).toBe(anzahl)
        werte.forEach((w) => expect(w).toBeGreaterThanOrEqual(1))
        expect(werte.reduce((a, b) => a + b, 0)).toBe(linksSumme(t))
      }
    }
  })

  it('zeigt auf Stufe 6 links eine Rechnung, rechts das Ergebnis', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(6, mulberry32(i))
      expect(t.data.mode).toBe('rechnung')
      expect(t.data.alsRechnung).toBe(true)
      expect(t.data.links.length).toBe(2)
      expect(t.data.frage).toMatch(/^Wie viel ist \d+ \+ \d+\?$/)
      expect(Number(t.answer)).toBe(t.data.links[0] + t.data.links[1])
    }
  })

  it('ergänzt auf Stufe 7 immer auf 10 oder 20', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(7, mulberry32(i))
      expect(t.data.mode).toBe('zehnerfreund')
      expect([10, 20]).toContain(t.data.links[0])
      expect(rechtsMit(t, loesungswerte(t))).toBe(t.data.links[0])
    }
  })

  it('lässt auf Stufe 10 die linke Seite schwerer', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(10, mulberry32(i))
      expect(t.data.mode).toBe('ungleich')
      expect(t.data.richtung).toBe('linksSchwerer')
      expect(rechtsMit(t, loesungswerte(t))).toBeLessThan(linksSumme(t))
      // Und der Vorrat ist begrenzt — sonst wäre jede Zahl recht.
      expect(t.data.vorrat.length).toBeLessThanOrEqual(6)
    }
  })

  it('erzeugt auf einer Stufe nicht immer dieselbe Aufgabe', () => {
    const gesehen = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const t = generateTask(4, mulberry32(i))
      gesehen.add(`${t.data.links.join(',')}|${t.answer}`)
    }
    expect(gesehen.size).toBeGreaterThan(8)
  })
})

describe('Zahlen-Waage – Kombinatorik', () => {
  it('schreibt Auswahlen immer aufsteigend', () => {
    expect(kanonisch([4, 3])).toBe('3+4')
    expect(kanonisch([7])).toBe('7')
    expect(kanonisch([2, 9, 5])).toBe('2+5+9')
  })

  it('zählt alle Teilmengen der geforderten Größe', () => {
    expect(kombinationenAus([1, 2, 3], 2)).toEqual([[1, 2], [1, 3], [2, 3]])
    expect(kombinationenAus([1, 2, 3], 0)).toEqual([[]])
    expect(kombinationenAus([1, 2], 3)).toEqual([])
  })
})

describe('Zahlen-Waage – Vorlesetexte', () => {
  it('sagt auf jeder Stufe, was links liegt', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 40; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.speak.length, `Stufe ${lvl}`).toBeGreaterThan(15)
        expect(t.speak, `Stufe ${lvl}`).toMatch(/\d/)
      }
    }
  })
})
