/**
 * Seedbarer Zufall (mulberry32). Aufgaben werden immer generiert, nie
 * abgespult — und mit Seed sind die Generator-Tests deterministisch.
 */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Aus beliebigem Text einen Seed machen — z. B. Datum + Kind-Id. */
export function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Ganzzahl in [min, max] – beide Grenzen eingeschlossen. */
export function randInt(rng: Rng, min: number, max: number): number {
  if (max < min) [min, max] = [max, min]
  return min + Math.floor(rng() * (max - min + 1))
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]
}

/** Fisher-Yates auf einer Kopie. */
export function shuffle<T>(rng: Rng, list: readonly T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** n verschiedene Elemente ziehen (oder alle, wenn die Liste kürzer ist). */
export function sample<T>(rng: Rng, list: readonly T[], n: number): T[] {
  return shuffle(rng, list).slice(0, Math.min(n, list.length))
}

/**
 * Distraktoren für Zahlen-Antworten: immer ±1/±2 um die Lösung,
 * nie negativ, nie doppelt, nie gleich der Lösung.
 */
export function numberDistractors(rng: Rng, answer: number, count: number, min = 0, max = 999): number[] {
  const out = new Set<number>()
  const offsets = shuffle(rng, [-2, -1, 1, 2])
  for (const off of offsets) {
    if (out.size >= count) break
    const v = answer + off
    if (v !== answer && v >= min && v <= max) out.add(v)
  }
  // Auffüllen, falls die Nähe nicht genug hergibt (z. B. Antwort 0 oder 1).
  let spread = 3
  while (out.size < count && spread < 40) {
    for (const sign of shuffle(rng, [-1, 1])) {
      const v = answer + sign * spread
      if (v !== answer && v >= min && v <= max) out.add(v)
      if (out.size >= count) break
    }
    spread++
  }
  return [...out].slice(0, count)
}
