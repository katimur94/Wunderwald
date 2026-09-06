import { describe, expect, it } from 'vitest'
import { generateTask, minutenFuer, zeitKey, type TurmTask } from './zeit-turm'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'
import { uhrText } from '../../learning/wissen'

describe('Zeit-Turm – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<TurmTask>(generateTask, {
      optionsOf: (t) => t.data.optionen,
      minOptions: () => 3,
      extra: (t, lvl) => {
        expect(minutenFuer(lvl)).toContain(t.data.zeit.minute)
        expect(t.data.zeit.stunde).toBeGreaterThanOrEqual(1)
        expect(t.data.zeit.stunde).toBeLessThanOrEqual(12)
        if (t.data.mode === 'finden') {
          expect(t.data.uhren).toHaveLength(3)
          expect(t.answer).toBe(zeitKey(t.data.zeit))
        } else {
          expect(t.answer).toBe(uhrText(t.data.zeit.stunde, t.data.zeit.minute))
        }
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('bleibt auf den unteren Stufen bei vollen Stunden mit Ziffernblatt', () => {
    for (let i = 0; i < 100; i++) {
      const t = generateTask(2, mulberry32(i))
      expect(t.data.zeit.minute).toBe(0)
      expect(t.data.ziffern).toBe(true)
      expect(t.data.mode).toBe('lesen')
    }
  })

  it('kommt auf Stufe 10 zu Fünf-Minuten-Schritten ohne Ziffern', () => {
    const minuten = new Set<number>()
    for (let i = 0; i < 200; i++) {
      const t = generateTask(10, mulberry32(i))
      minuten.add(t.data.zeit.minute)
      expect(t.data.ziffern).toBe(false)
    }
    expect(minuten.size).toBeGreaterThan(6)
  })
})
