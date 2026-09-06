import { describe, expect, it } from 'vitest'
import { generateTask, type SchattenTask } from './schatten-suche'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'
import { ART_KATEGORIEN } from '../../learning/sortier-daten'

function kategorieVon(emoji: string): string | undefined {
  return ART_KATEGORIEN.find((k) => k.dinge.some((d) => d.emoji === emoji))?.id
}

describe('Schatten-Suche – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<SchattenTask>(generateTask, {
      optionsOf: (t) => t.data.optionen,
      minOptions: (lvl) => (lvl <= 3 ? 3 : 4),
      extra: (t) => {
        expect(t.data.ziel.emoji).toBe(t.answer)
        t.data.optionen.forEach((o) => expect(t.data.namen[o]).toBeTruthy())
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('nimmt auf Stufe 1 Ablenker aus fremden Kategorien, ab Stufe 3 aus derselben', () => {
    for (let i = 0; i < 150; i++) {
      const leicht = generateTask(1, mulberry32(i))
      const zielKat = kategorieVon(leicht.answer as string)
      leicht.data.optionen
        .filter((o) => o !== leicht.answer)
        .forEach((o) => expect(kategorieVon(o)).not.toBe(zielKat))

      const schwer = generateTask(4, mulberry32(i))
      const kat = kategorieVon(schwer.answer as string)
      schwer.data.optionen.forEach((o) => expect(kategorieVon(o)).toBe(kat))
    }
  })

  it('spiegelt und dreht erst auf den hohen Stufen', () => {
    for (let i = 0; i < 100; i++) {
      const t = generateTask(5, mulberry32(i))
      expect(t.data.gespiegelt).toBe(false)
      expect(t.data.drehung).toBe(0)
      expect(t.data.mode).toBe('schatten')
    }
    let umgekehrt = 0
    let gedreht = 0
    for (let i = 0; i < 200; i++) {
      const t = generateTask(10, mulberry32(i))
      if (t.data.mode === 'umgekehrt') umgekehrt++
      if (t.data.drehung !== 0) gedreht++
    }
    expect(umgekehrt).toBeGreaterThan(30)
    expect(gedreht).toBeGreaterThan(30)
  })
})
