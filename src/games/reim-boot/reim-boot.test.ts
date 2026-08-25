import { describe, expect, it } from 'vitest'
import { generateTask, type BootTask } from './reim-boot'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'
import { KOMPOSITA, reimtSich, wortByName } from '../../learning/wordlist'

function kisteMit(t: BootTask, id: string) {
  return t.data.kisten.find((k) => k.id === id)!
}

describe('Reim-Boot – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<BootTask>(generateTask, {
      optionsOf: (t) => t.data.optionen,
      minOptions: () => 2,
      extra: (t, lvl) => {
        const where = `Stufe ${lvl}`
        expect(t.data.frage.length, where).toBeGreaterThan(3)
        // Jede Kiste hat Bild und Wort und kommt nur einmal vor
        const ids = t.data.kisten.map((k) => k.id)
        expect(new Set(ids).size, where).toBe(ids.length)
        const woerter = t.data.kisten.map((k) => k.wort)
        expect(new Set(woerter).size, `${where}: doppeltes Wort`).toBe(woerter.length)
        t.data.kisten.forEach((k) => {
          expect(k.emoji.length, where).toBeGreaterThan(0)
          expect(k.wort.length, where).toBeGreaterThan(1)
        })
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('zeigt auf den Stufen 1 und 2 zwei, ab Stufe 3 drei Kisten', () => {
    for (const [lvl, anzahl] of [[1, 2], [2, 2], [3, 3], [4, 3]] as const) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('reim')
        expect(t.data.kisten.length, `Stufe ${lvl}`).toBe(anzahl)
      }
    }
  })

  it('hat auf den Reim-Stufen genau eine reimende Kiste', () => {
    for (const lvl of [1, 2, 3, 4]) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(lvl * 31 + i))
        const bootwort = wortByName(t.data.wort)!
        const reimend = t.data.kisten.filter((k) => reimtSich(wortByName(k.wort)!, bootwort))
        expect(reimend.length, `Stufe ${lvl}, Durchlauf ${i}`).toBe(1)
        expect(reimend[0].id).toBe(t.answer)
      }
    }
  })

  it('zieht Ablenker NIE aus derselben Reimgruppe', () => {
    for (const lvl of [1, 2, 3, 4]) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        const bootwort = wortByName(t.data.wort)!
        for (const k of t.data.kisten) {
          if (k.id === t.answer) continue
          const w = wortByName(k.wort)!
          expect(reimtSich(w, bootwort), `${bootwort.wort} vs ${w.wort}`).toBe(false)
          expect(w.wort).not.toBe(bootwort.wort)
        }
      }
    }
  })

  it('fragt auf Stufe 5 nach dem Wort, das sich NICHT reimt', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(5, mulberry32(i))
      expect(t.data.mode).toBe('keinReim')
      expect(t.data.kisten.length).toBe(3)
      const fremd = wortByName(kisteMit(t, t.answer as string).wort)!
      const andere = t.data.kisten.filter((k) => k.id !== t.answer).map((k) => wortByName(k.wort)!)
      // Die beiden anderen reimen sich miteinander …
      expect(reimtSich(andere[0], andere[1]), `${andere[0].wort}/${andere[1].wort}`).toBe(true)
      // … und keines von beiden mit dem Ausreißer.
      andere.forEach((w) => expect(reimtSich(w, fremd), `${w.wort}/${fremd.wort}`).toBe(false))
    }
  })

  it('lässt auf den Stufen 6 und 7 die passende Silbenzahl klopfen', () => {
    for (const [lvl, erlaubt] of [[6, [1, 2]], [7, [2, 3]]] as const) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('silben')
        expect(t.data.kisten).toEqual([])
        expect(erlaubt, `Stufe ${lvl}: ${t.data.wort}`).toContain(t.data.silben.length)
        expect(Number(t.answer)).toBe(t.data.silben.length)
        // Die Silben ergeben wieder das Wort
        expect(t.data.silben.join('').toLowerCase()).toBe(t.data.wort.toLowerCase())
        expect(t.speak).toContain(t.data.wort)
      }
    }
  })

  it('baut ab Stufe 8 zusammengesetzte Wörter aus zwei Kisten', () => {
    for (const [lvl, kisten] of [[8, 3], [9, 4], [10, 5]] as const) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('kompositum')
        expect(t.data.kisten.length, `Stufe ${lvl}`).toBe(kisten)

        const k = KOMPOSITA.find((x) => x.wort === t.data.wort)!
        expect(k, t.data.wort).toBeTruthy()
        const [linksId, rechtsId] = (t.answer as string).split('+')
        expect(kisteMit(t, linksId).wort).toBe(k.links)
        expect(kisteMit(t, rechtsId).wort).toBe(k.rechts)
        expect(t.data.emoji).toBe(k.emoji)
      }
    }
  })

  it('lässt ab Stufe 8 kein zweites Wort aus den Kisten zu', () => {
    for (const lvl of [8, 9, 10]) {
      for (let i = 0; i < 100; i++) {
        const t = generateTask(lvl, mulberry32(lvl * 977 + i))
        const woerter = t.data.kisten.map((x) => x.wort)
        const moeglich = KOMPOSITA.filter(
          (k) => woerter.includes(k.links) && woerter.includes(k.rechts),
        )
        expect(moeglich.map((m) => m.wort), `Stufe ${lvl}, Durchlauf ${i}`).toEqual([t.data.wort])
      }
    }
  })

  it('erzeugt auf einer Stufe nicht immer dasselbe Wort', () => {
    const gesehen = new Set<string>()
    for (let i = 0; i < 100; i++) gesehen.add(generateTask(3, mulberry32(i)).data.wort)
    expect(gesehen.size).toBeGreaterThan(8)
  })
})

describe('Reim-Boot – Vorlesetexte', () => {
  it('nennt auf jeder Stufe etwas Konkretes', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 40; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.speak.length, `Stufe ${lvl}`).toBeGreaterThan(15)
        expect(t.speak.trim().endsWith('?') || t.speak.trim().endsWith('.'), t.speak).toBe(true)
      }
    }
  })
})
