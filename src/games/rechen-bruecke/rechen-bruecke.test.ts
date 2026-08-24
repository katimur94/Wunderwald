import { describe, expect, it } from 'vitest'
import { generateTask, type BrueckeTask } from './rechen-bruecke'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'

/** Rechnet den angezeigten Term nach – prüft, dass Anzeige und Lösung übereinstimmen. */
function evaluate(term: string): number {
  const clean = term
    .replace(/−/g, '-')
    .replace(/·/g, '*')
    .replace(/\s*=\s*\?\s*$/, '')
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${clean})`)() as number
}

describe('Rechen-Brücke – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<BrueckeTask>(generateTask, {
      optionsOf: (t) => t.data.options,
      minOptions: () => 3,
      extra: (t, lvl) => {
        const where = `Stufe ${lvl}: ${t.data.term}`
        expect(t.data.term, where).toMatch(/=/)
        t.data.options.forEach((o) => expect(o, where).toBeGreaterThanOrEqual(0))
        expect(t.data.plankenGesamt).toBe(6)
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('die angezeigte Rechnung ergibt tatsächlich die Lösung', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(lvl * 1000 + i))
        if (t.data.term.startsWith('?')) {
          // Ergänzungsaufgabe: Lösung eingesetzt muss stimmen
          const [links, rechts] = t.data.term.split('=')
          const eingesetzt = links.replace('?', String(t.answer))
          expect(evaluate(eingesetzt), `Stufe ${lvl}: ${t.data.term}`).toBe(Number(rechts.trim()))
        } else {
          expect(evaluate(t.data.term), `Stufe ${lvl}: ${t.data.term}`).toBe(t.answer)
        }
      }
    }
  })

  it('bleibt auf Stufe 1 und 2 im Zahlenraum 5 bzw. 10 und zeigt Punktebilder', () => {
    for (const [lvl, max] of [[1, 5], [2, 10]] as const) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.term).toContain('+')
        expect(t.answer as number, `Stufe ${lvl}`).toBeLessThanOrEqual(max)
        expect(t.data.punkte, `Stufe ${lvl}`).not.toBeNull()
      }
    }
  })

  it('rechnet auf Stufe 3 nur minus und nie ins Negative', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(3, mulberry32(i))
      expect(t.data.term).toContain('−')
      expect(t.answer as number).toBeGreaterThanOrEqual(0)
      expect(t.answer as number).toBeLessThanOrEqual(10)
    }
  })

  it('vermeidet auf Stufe 4 den Zehnerübergang', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(4, mulberry32(i))
      const m = t.data.term.match(/^(\d+) ([+−]) (\d+)/)
      expect(m, t.data.term).toBeTruthy()
      const a = Number(m![1])
      const op = m![2]
      const b = Number(m![3])
      expect(a).toBeLessThanOrEqual(20)
      if (op === '+') {
        expect((a % 10) + b, `kein Übergang: ${t.data.term}`).toBeLessThanOrEqual(9)
        expect(a + b).toBeLessThanOrEqual(20)
      } else {
        expect(a % 10, `kein Übergang: ${t.data.term}`).toBeGreaterThanOrEqual(b)
      }
    }
  })

  it('erzwingt auf Stufe 5 und 6 den Zehnerübergang', () => {
    for (const lvl of [5, 6]) {
      for (let i = 0; i < 300; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const m = t.data.term.match(/^(\d+) ([+−]) (\d+)/)!
        const a = Number(m[1])
        const b = Number(m[3])
        if (m[2] === '+') {
          expect((a % 10) + b, `Übergang fehlt: ${t.data.term}`).toBeGreaterThan(9)
        } else {
          expect(a % 10, `Übergang fehlt: ${t.data.term}`).toBeLessThan(b)
          expect(a - b).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('stellt auf Stufe 7 Ergänzungsaufgaben', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(7, mulberry32(i))
      expect(t.data.term).toMatch(/^\? \+ \d+ = \d+$/)
      expect(t.answer as number).toBeGreaterThan(0)
    }
  })

  it('nutzt auf Stufe 8 nur die 2er-, 5er- und 10er-Reihe', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(8, mulberry32(i))
      const m = t.data.term.match(/^(\d+) · (\d+)/)!
      expect([2, 5, 10]).toContain(Number(m[1]))
      expect(Number(m[2])).toBeLessThanOrEqual(10)
    }
  })

  it('rechnet auf Stufe 9 das gemischte Einmaleins', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(9, mulberry32(i))
      expect(t.data.term).toContain('·')
      expect(t.answer as number).toBeLessThanOrEqual(100)
    }
  })

  it('baut auf Stufe 10 Klammer-Ketten', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(10, mulberry32(i))
      expect(t.data.term).toMatch(/^\(\d+ \+ \d+\) [+−] \d+ = \?$/)
      expect(t.answer as number).toBeGreaterThanOrEqual(0)
    }
  })
})
