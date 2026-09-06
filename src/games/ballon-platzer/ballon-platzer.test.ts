import { describe, expect, it } from 'vitest'
import { generateTask, type BallonTask } from './ballon-platzer'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'

describe('Ballon-Platzer – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<BallonTask>(generateTask, {
      optionsOf: (t) => t.data.optionen,
      minOptions: () => 3,
      extra: (t) => {
        expect(t.data.tempo).toBeGreaterThan(5)
        expect(t.data.schwung).toBeGreaterThan(0)
        expect(t.speak).not.toMatch(/das Tor/)
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('steigt mit der Stufe schneller', () => {
    expect(generateTask(10, mulberry32(1)).data.tempo).toBeGreaterThan(generateTask(1, mulberry32(1)).data.tempo)
  })
})
