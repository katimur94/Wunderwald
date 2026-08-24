import { describe, expect, it } from 'vitest'
import { hashSeed, mulberry32, numberDistractors, pick, randInt, sample, shuffle } from './rng'

describe('mulberry32', () => {
  it('liefert bei gleichem Seed die gleiche Folge', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('liefert bei anderem Seed eine andere Folge', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect(a()).not.toBe(b())
  })

  it('bleibt im Intervall [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 5000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('hashSeed', () => {
  it('ist stabil und unterscheidet Eingaben', () => {
    expect(hashSeed('2026-08-24|kind-1')).toBe(hashSeed('2026-08-24|kind-1'))
    expect(hashSeed('2026-08-24|kind-1')).not.toBe(hashSeed('2026-08-25|kind-1'))
  })
})

describe('randInt', () => {
  it('hält beide Grenzen ein und erreicht sie', () => {
    const r = mulberry32(3)
    const seen = new Set<number>()
    for (let i = 0; i < 3000; i++) {
      const v = randInt(r, 2, 6)
      expect(v).toBeGreaterThanOrEqual(2)
      expect(v).toBeLessThanOrEqual(6)
      seen.add(v)
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6])
  })

  it('verträgt vertauschte Grenzen', () => {
    const r = mulberry32(9)
    for (let i = 0; i < 100; i++) {
      const v = randInt(r, 8, 4)
      expect(v).toBeGreaterThanOrEqual(4)
      expect(v).toBeLessThanOrEqual(8)
    }
  })
})

describe('shuffle und sample', () => {
  it('behält alle Elemente und verändert das Original nicht', () => {
    const r = mulberry32(11)
    const orig = [1, 2, 3, 4, 5, 6]
    const out = shuffle(r, orig)
    expect(out.sort((a, b) => a - b)).toEqual(orig)
    expect(orig).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('zieht n verschiedene Elemente', () => {
    const r = mulberry32(13)
    const out = sample(r, ['a', 'b', 'c', 'd', 'e'], 3)
    expect(out).toHaveLength(3)
    expect(new Set(out).size).toBe(3)
  })

  it('gibt höchstens so viele Elemente zurück wie vorhanden', () => {
    const r = mulberry32(13)
    expect(sample(r, ['a', 'b'], 5)).toHaveLength(2)
  })

  it('pick liefert immer ein Element der Liste', () => {
    const r = mulberry32(17)
    for (let i = 0; i < 200; i++) expect(['x', 'y', 'z']).toContain(pick(r, ['x', 'y', 'z']))
  })
})

describe('numberDistractors', () => {
  it('liefert die geforderte Anzahl, ohne die Lösung und ohne Duplikate', () => {
    const r = mulberry32(23)
    for (let answer = 0; answer <= 100; answer++) {
      for (const count of [1, 2, 3]) {
        const d = numberDistractors(r, answer, count)
        expect(d).toHaveLength(count)
        expect(d).not.toContain(answer)
        expect(new Set(d).size).toBe(count)
        d.forEach((v) => expect(v).toBeGreaterThanOrEqual(0))
      }
    }
  })

  it('bleibt bevorzugt in der Nähe (±1/±2)', () => {
    const r = mulberry32(29)
    const d = numberDistractors(r, 20, 2)
    d.forEach((v) => expect(Math.abs(v - 20)).toBeLessThanOrEqual(2))
  })

  it('respektiert eine Untergrenze auch bei kleinen Lösungen', () => {
    const r = mulberry32(31)
    const d = numberDistractors(r, 1, 3, 0)
    expect(d).toHaveLength(3)
    d.forEach((v) => expect(v).toBeGreaterThanOrEqual(0))
    expect(d).not.toContain(1)
  })

  it('respektiert eine Obergrenze', () => {
    const r = mulberry32(37)
    const d = numberDistractors(r, 10, 3, 0, 10)
    d.forEach((v) => expect(v).toBeLessThanOrEqual(10))
  })
})
