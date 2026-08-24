import { expect } from 'vitest'
import { mulberry32 } from './rng'
import type { GameTask } from './types'

/**
 * Gemeinsamer Vertrag aller Aufgaben-Generatoren (Akzeptanzkriterium 15.8):
 * Für jede Stufe 1..10 werden 100 Aufgaben erzeugt und geprüft:
 *  - die Lösung steckt in den Antwortoptionen,
 *  - genau einmal,
 *  - kein Distraktor gleicht der Lösung,
 *  - kein Distraktor kommt doppelt vor,
 *  - es gibt einen Vorlese-Text.
 */
export interface ContractOptions<T extends GameTask> {
  /** Antwortoptionen aus der Aufgabe ziehen */
  optionsOf: (task: T) => unknown[]
  /** Mindestanzahl Optionen je Stufe (Default 2) */
  minOptions?: (level: number) => number
  /** Zusätzliche Prüfungen je Aufgabe */
  extra?: (task: T, level: number) => void
  /** Aufgaben pro Stufe (Default 100) */
  runs?: number
}

export function checkGeneratorContract<T extends GameTask>(
  generate: (difficulty: number, rng: () => number) => T,
  opts: ContractOptions<T>,
) {
  const runs = opts.runs ?? 100
  for (let level = 1; level <= 10; level++) {
    for (let i = 0; i < runs; i++) {
      const rng = mulberry32(level * 100_000 + i)
      const task = generate(level, rng)
      const options = opts.optionsOf(task)
      const where = `Stufe ${level}, Durchlauf ${i}`

      expect(options.length, `${where}: zu wenige Optionen`).toBeGreaterThanOrEqual(
        opts.minOptions?.(level) ?? 2,
      )

      const hits = options.filter((o) => o === task.answer)
      expect(hits.length, `${where}: Lösung ${String(task.answer)} in ${JSON.stringify(options)}`).toBe(1)

      expect(new Set(options).size, `${where}: doppelte Optionen ${JSON.stringify(options)}`).toBe(
        options.length,
      )

      expect(typeof task.speak, `${where}: speak fehlt`).toBe('string')
      expect(task.speak.trim().length, `${where}: speak ist leer`).toBeGreaterThan(3)

      opts.extra?.(task, level)
    }
  }
}

/** Der gleiche Seed muss die gleiche Aufgabe erzeugen. */
export function checkDeterminism<T extends GameTask>(
  generate: (difficulty: number, rng: () => number) => T,
) {
  for (let level = 1; level <= 10; level++) {
    const a = generate(level, mulberry32(4242))
    const b = generate(level, mulberry32(4242))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  }
}
