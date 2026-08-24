import { describe, expect, it } from 'vitest'
import { generateTask, type FangTask } from './buchstaben-fang'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'
import { AEHNLICHE_LAUTE, ANLAUTE_EINFACH, hatKlarenAnlaut, WORDS } from '../../learning/wordlist'

const byWord = new Map(WORDS.map((w) => [w.wort, w]))

describe('Buchstaben-Fang – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<FangTask>(generateTask, {
      optionsOf: (t) => t.data.options,
      minOptions: (lvl) => (lvl === 1 ? 2 : lvl === 2 ? 3 : lvl === 9 ? 3 : 4),
      extra: (t, lvl) => {
        const where = `Stufe ${lvl}`
        expect(t.data.frage.length, where).toBeGreaterThan(3)
        expect(t.data.wort.length, where).toBeGreaterThan(0)
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('nutzt auf Stufe 1 nur die einfachen Anlaute und zwei Blätter', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(1, mulberry32(i))
      expect(t.data.mode).toBe('anlaut')
      expect(t.data.options).toHaveLength(2)
      t.data.options.forEach((o) => expect(ANLAUTE_EINFACH).toContain(o))
      expect(ANLAUTE_EINFACH).toContain(t.answer as string)
    }
  })

  it('gibt bei Anlaut-Aufgaben immer den ersten Buchstaben des Wortes als Lösung', () => {
    for (const lvl of [1, 2, 3, 4]) {
      for (let i = 0; i < 150; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('anlaut')
        expect(t.answer).toBe(t.data.wort[0].toUpperCase())
        expect(t.data.emoji, `Stufe ${lvl}`).toBeTruthy()
        // Das Bild passt wirklich zum Wort
        expect(byWord.get(t.data.wort)?.emoji).toBe(t.data.emoji)
      }
    }
  })

  it('zieht auf Stufe 4 mindestens einen ähnlich klingenden Distraktor', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(4, mulberry32(i))
      const answer = t.answer as string
      const others = t.data.options.filter((o) => o !== answer)
      const near = AEHNLICHE_LAUTE[answer] ?? []
      expect(others.some((o) => near.includes(o)), `${answer}: ${others.join(',')}`).toBe(true)
    }
  })

  it('fragt auf Stufe 5 nach dem Endlaut', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(5, mulberry32(i))
      expect(t.data.mode).toBe('endlaut')
      expect(t.answer).toBe(t.data.wort.slice(-1).toUpperCase())
    }
  })

  it('lässt auf Stufe 6 nie den ersten oder letzten Buchstaben weg', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(6, mulberry32(i))
      expect(t.data.mode).toBe('luecke')
      const luecke = t.data.luecke!
      const idx = luecke.indexOf('_')
      expect(idx, luecke).toBeGreaterThan(0)
      expect(idx, luecke).toBeLessThan(luecke.length - 1)
      expect(luecke).toHaveLength(t.data.wort.length)
      // Lösung eingesetzt ergibt wieder das Wort
      const wieder = luecke.slice(0, idx) + (t.answer as string) + luecke.slice(idx + 1)
      expect(wieder.toLowerCase()).toBe(t.data.wort.toLowerCase())
    }
  })

  it('verlangt auf Stufe 7 und 8 den passenden Kleinbuchstaben', () => {
    for (const lvl of [7, 8]) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('grossKlein')
        expect(t.data.wort).toBe(t.data.wort.toUpperCase())
        expect(t.answer).toBe(t.data.wort.toLowerCase())
        t.data.options.forEach((o) => expect(o).toBe(o.toLowerCase()))
      }
    }
  })

  it('zeigt auf Stufe 9 und 10 ein Wort mit passenden Bildern zur Auswahl', () => {
    for (const [lvl, count] of [[9, 3], [10, 4]] as const) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('lesen')
        expect(t.data.options).toHaveLength(count)
        expect(t.data.emoji).toBeUndefined()
        // Lösung ist das Emoji des angezeigten Wortes
        expect(t.answer).toBe(byWord.get(t.data.wort)?.emoji)
      }
    }
  })

  it('spricht nie den gesuchten Buchstaben mit aus', () => {
    for (const lvl of [1, 2, 3, 4]) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        // Der Vorlesetext nennt das Wort, aber verrät nicht die Lösung als Einzelbuchstaben
        expect(t.speak).toContain(t.data.wort)
        expect(t.speak).not.toMatch(/beginnt mit dem Buchstaben/i)
      }
    }
  })
})

describe('Buchstaben-Fang – klare Anlaute in den Anfängerstufen', () => {
  it('stellt auf Stufe 1 bis 3 nur Wörter mit klarem Anlaut', () => {
    for (const lvl of [1, 2, 3]) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const entry = byWord.get(t.data.wort)!
        expect(hatKlarenAnlaut(entry), `Stufe ${lvl}: ${t.data.wort}`).toBe(true)
      }
    }
  })
})
