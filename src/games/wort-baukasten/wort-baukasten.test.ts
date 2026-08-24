import { describe, expect, it } from 'vitest'
import { generateTask, type BaukastenTask } from './wort-baukasten'
import { checkDeterminism } from '../generator-contract'
import { mulberry32 } from '../rng'
import { WORDS } from '../../learning/wordlist'

const byWord = new Map(WORDS.map((w) => [w.wort, w]))

/**
 * Der Wort-Baukasten hat keine Antwort-Optionen, sondern Bausteine.
 * Der Vertrag lautet hier: Jeder Lösungsteil ist genau so oft als Baustein
 * vorhanden, wie er gebraucht wird — und es gibt zusätzliche Ablenker.
 */
function checkBausteine(t: BaukastenTask, where: string) {
  const vorrat = t.data.bausteine.map((b) => b.text)
  for (const teil of t.data.loesung) {
    const gebraucht = t.data.loesung.filter((x) => x === teil).length
    const vorhanden = vorrat.filter((x) => x === teil).length
    expect(vorhanden, `${where}: "${teil}" ${vorhanden}× vorhanden, ${gebraucht}× gebraucht`)
      .toBeGreaterThanOrEqual(gebraucht)
  }
  // Jede Baustein-Id ist eindeutig
  const ids = t.data.bausteine.map((b) => b.id)
  expect(new Set(ids).size, `${where}: doppelte Baustein-Ids`).toBe(ids.length)
}

describe('Wort-Baukasten – Generator', () => {
  it('liefert für jede Stufe baubare Aufgaben', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(lvl * 1000 + i))
        const where = `Stufe ${lvl}, Durchlauf ${i}`
        checkBausteine(t, where)
        expect(t.data.loesung.length, where).toBeGreaterThanOrEqual(1)
        expect(t.data.bausteine.length, where).toBeGreaterThanOrEqual(t.data.loesung.length)
        expect(t.speak.length, where).toBeGreaterThan(5)
        expect(t.data.emoji, where).toBeTruthy()
        expect(t.answer, where).toEqual(t.data.loesung)
      }
    }
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('setzt die Lösung wieder zum Wort zusammen', () => {
    for (let lvl = 1; lvl <= 8; lvl++) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.loesung.join('').toLowerCase(), `Stufe ${lvl}`).toBe(t.data.wort.toLowerCase())
      }
    }
  })

  it('zeigt immer das Bild, das zum Wort gehört', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 50; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(byWord.get(t.data.wort)?.emoji, `Stufe ${lvl}: ${t.data.wort}`).toBe(t.data.emoji)
      }
    }
  })

  it('arbeitet auf Stufe 1 mit zwei Silben und ohne Ablenker', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(1, mulberry32(i))
      expect(t.data.mode).toBe('silben')
      expect(t.data.loesung).toHaveLength(2)
      expect(t.data.bausteine).toHaveLength(2)
    }
  })

  it('gibt ab Stufe 2 Ablenker dazu', () => {
    for (const [lvl, extra] of [[2, 1], [3, 1], [4, 2]] as const) {
      for (let i = 0; i < 150; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.bausteine.length, `Stufe ${lvl}`).toBe(t.data.loesung.length + extra)
      }
    }
  })

  it('nutzt auf Stufe 3 und 4 dreisilbige Wörter', () => {
    for (const lvl of [3, 4]) {
      for (let i = 0; i < 150; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.loesung, `Stufe ${lvl}`).toHaveLength(3)
      }
    }
  })

  it('baut ab Stufe 5 aus einzelnen Buchstaben', () => {
    for (const [lvl, min, max] of [[5, 3, 4], [6, 3, 4], [7, 5, 6], [8, 5, 6]] as const) {
      for (let i = 0; i < 150; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode, `Stufe ${lvl}`).toBe('buchstaben')
        expect(t.data.wort.length, `Stufe ${lvl}: ${t.data.wort}`).toBeGreaterThanOrEqual(min)
        expect(t.data.wort.length, `Stufe ${lvl}: ${t.data.wort}`).toBeLessThanOrEqual(max)
        expect(t.data.loesung).toHaveLength(t.data.wort.length)
      }
    }
  })

  it('Ablenker-Buchstaben kommen im Wort nicht vor', () => {
    for (const lvl of [6, 7, 8]) {
      for (let i = 0; i < 150; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const drin = t.data.wort.toLowerCase().split('')
        const ablenker = t.data.bausteine.filter((b) => b.id.startsWith('a'))
        ablenker.forEach((b) =>
          expect(drin, `Stufe ${lvl}: ${b.text} in ${t.data.wort}`).not.toContain(b.text.toLowerCase()),
        )
      }
    }
  })

  it('stellt auf Stufe 9 und 10 einen Lückensatz mit genau einer Lücke', () => {
    for (const [lvl, ablenker] of [[9, 1], [10, 2]] as const) {
      for (let i = 0; i < 150; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('satz')
        expect(t.data.satz, `Stufe ${lvl}`).toContain('___')
        expect(t.data.satz!.match(/___/g), `Stufe ${lvl}`).toHaveLength(1)
        expect(t.data.loesung).toHaveLength(1)
        expect(t.data.bausteine).toHaveLength(1 + ablenker)
        // Ablenker sind andere echte Wörter, nicht Bruchstücke
        t.data.bausteine.forEach((b) => expect(byWord.has(b.text), b.text).toBe(true))
      }
    }
  })

  it('bietet nie zwei gleiche Wörter im Lückensatz an', () => {
    for (const lvl of [9, 10]) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const texte = t.data.bausteine.map((b) => b.text)
        expect(new Set(texte).size, `Stufe ${lvl}: ${texte.join(',')}`).toBe(texte.length)
      }
    }
  })
})
