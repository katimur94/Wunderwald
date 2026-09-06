import { describe, expect, it } from 'vitest'
import { generateTask, type QuizTask } from './wissens-quiz'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'

describe('Wissens-Quiz – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<QuizTask>(generateTask, {
      optionsOf: (t) => t.data.optionen,
      minOptions: () => 3,
      extra: (t) => {
        expect(t.data.optionen).toHaveLength(3)
        expect(t.data.frage.trim().length).toBeGreaterThan(3)
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('stellt auf Stufe 1 nur Fragen der Stufe 1, auf Stufe 10 auch Uhrzeiten', () => {
    const themen = new Set<string>()
    for (let i = 0; i < 200; i++) themen.add(generateTask(10, mulberry32(i)).data.thema)
    expect(themen.has('uhr')).toBe(true)
    for (let i = 0; i < 100; i++) {
      const t = generateTask(1, mulberry32(i))
      expect(['tiere', 'farben', 'natur', 'alltag']).toContain(t.data.thema)
    }
  })
})
