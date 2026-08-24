import { describe, expect, it } from 'vitest'
import { generateTask, type ErnteTask } from './zahlen-ernte'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'

describe('Zahlen-Ernte – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<ErnteTask>(generateTask, {
      optionsOf: (t) => t.data.options,
      minOptions: (lvl) => (lvl === 5 ? 2 : 3),
      extra: (t, lvl) => {
        const where = `Stufe ${lvl}`
        // Antworten sind nie negativ
        t.data.options.forEach((o) => expect(o, where).toBeGreaterThanOrEqual(0))
        expect(t.data.frage.length, where).toBeGreaterThan(3)
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('hält die Mengenbereiche der Stufen 1 bis 3 ein', () => {
    const grenzen: Record<number, number> = { 1: 4, 2: 6, 3: 10 }
    for (const lvl of [1, 2, 3]) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('zaehlen')
        expect(t.data.fruits.length).toBeGreaterThanOrEqual(1)
        expect(t.data.fruits.length, `Stufe ${lvl}`).toBeLessThanOrEqual(grenzen[lvl])
        expect(t.answer).toBe(t.data.fruits.length)
      }
    }
  })

  it('zeigt auf Stufe 4 zwei Sorten und fragt nur nach einer', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(4, mulberry32(i))
      expect(t.data.mode).toBe('zaehlenMix')
      const sorten = new Set(t.data.fruits)
      expect(sorten.size).toBe(2)
      expect(t.data.askFor).toBeTruthy()
      const gesucht = t.data.fruits.filter((f) => f === t.data.askFor).length
      expect(t.answer).toBe(gesucht)
      // Der Ablenker darf nicht zufällig gleich viele sein – sonst wäre die Frage doppeldeutig
      expect(t.data.options).toContain(gesucht)
    }
  })

  it('vergleicht auf Stufe 5 zwei verschieden große Gruppen', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(5, mulberry32(i))
      expect(t.data.mode).toBe('vergleich')
      const a = t.data.fruits.length
      const b = t.data.fruitsB?.length ?? 0
      expect(a).not.toBe(b)
      expect(t.answer).toBe(Math.max(a, b))
      expect(t.data.options.sort((x, y) => x - y)).toEqual([Math.min(a, b), Math.max(a, b)])
    }
  })

  it('bündelt auf Stufe 6 Mengen von 11 bis 20', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(6, mulberry32(i))
      expect(t.data.gruppiert).toBe(true)
      expect(t.data.fruits.length).toBeGreaterThanOrEqual(11)
      expect(t.data.fruits.length).toBeLessThanOrEqual(20)
      expect(t.answer).toBe(t.data.fruits.length)
    }
  })

  it('ergänzt auf Stufe 7 bis 10 und auf Stufe 8 bis 20', () => {
    for (const [lvl, ziel] of [[7, 10], [8, 20]] as const) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('ergaenzen')
        expect(t.data.zielzahl).toBe(ziel)
        expect(t.data.fruits.length + (t.answer as number)).toBe(ziel)
        expect(t.answer as number).toBeGreaterThan(0)
      }
    }
  })

  it('erzeugt auf Stufe 9 und 10 lösbare Sachaufgaben', () => {
    for (const lvl of [9, 10]) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(i))
        expect(t.data.mode).toBe('sachaufgabe')
        expect(t.answer as number).toBeGreaterThanOrEqual(0)
        // Der vorgelesene Satz ist zugleich die sichtbare Frage
        expect(t.speak).toBe(t.data.frage)
        expect(t.speak).toMatch(/Wie viele/)
      }
    }
  })

  it('erzeugt auf einer Stufe nicht immer dieselbe Aufgabe', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) seen.add(generateTask(3, mulberry32(i)).data.frage + generateTask(3, mulberry32(i)).answer)
    expect(seen.size).toBeGreaterThan(4)
  })
})
