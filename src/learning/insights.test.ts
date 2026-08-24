import { describe, expect, it } from 'vitest'
import { buildInsights, type InsightInput } from './insights'
import type { Attempt, Progress, WorldId } from '../db/types'

const NOW = new Date('2026-06-15T14:00:00Z').getTime()
const TAG = 86_400_000

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    childId: 'k1',
    worldId: 'zahlen',
    gameId: 'zahlen-ernte',
    difficulty: 3,
    correct: true,
    usedHint: false,
    timeMs: 4000,
    ts: NOW - TAG,
    ...over,
  }
}

function progress(level = 3): Record<WorldId, Progress> {
  const mk = (worldId: WorldId): Progress => ({
    childId: 'k1', worldId, level, xp: 0, streak: 0, failStreak: 0, recentTimes: [],
  })
  return { zahlen: mk('zahlen'), buchstaben: mk('buchstaben'), logik: mk('logik') }
}

function input(over: Partial<InsightInput> = {}): InsightInput {
  return {
    attempts: [],
    progress: progress(),
    minutenProTag: Array.from({ length: 7 }, (_, i) => ({ day: `2026-06-${9 + i}`, minutes: 0 })),
    nickname: 'Mia',
    ...over,
  }
}

/** Baut n Versuche, davon `richtig` korrekt. */
function serie(n: number, richtig: number, over: Partial<Attempt> = {}): Attempt[] {
  return Array.from({ length: n }, (_, i) => attempt({ ...over, correct: i < richtig }))
}

describe('Hinweise-Engine', () => {
  it('meldet zurückhaltend, solange kaum gespielt wurde', () => {
    const res = buildInsights(input({ attempts: serie(3, 3) }), NOW)
    expect(res).toHaveLength(1)
    expect(res[0].id).toBe('wenig-daten')
    expect(res[0].text).toContain('3 Aufgaben')
  })

  it('zählt eine einzelne Aufgabe grammatikalisch richtig', () => {
    const res = buildInsights(input({ attempts: serie(1, 1) }), NOW)
    expect(res[0].text).toContain('1 Aufgabe')
    expect(res[0].text).not.toContain('1 Aufgaben')
  })

  it('ignoriert Versuche, die älter als 7 Tage sind', () => {
    const alt = serie(40, 5, { ts: NOW - 20 * TAG })
    const res = buildInsights(input({ attempts: alt }), NOW)
    expect(res[0].id).toBe('wenig-daten')
  })

  it('gibt bei hoher Fehlerquote einen konkreten Alltagstipp', () => {
    const res = buildInsights(
      input({ attempts: serie(20, 6, { gameId: 'wort-baukasten', worldId: 'buchstaben' }) }),
      NOW,
    )
    const treffer = res.find((r) => r.id === 'schwer-wort-baukasten')
    expect(treffer).toBeTruthy()
    expect(treffer!.ton).toBe('tipp')
    expect(treffer!.text).toContain('mitklatschen')
    expect(treffer!.text).toContain('70 %')
  })

  it('benutzt keine Diagnose-Sprache', () => {
    const alle = [
      ...buildInsights(input({ attempts: serie(20, 4, { gameId: 'buchstaben-fang' }) }), NOW),
      ...buildInsights(input({ attempts: serie(20, 20) }), NOW),
      ...buildInsights(input({ attempts: serie(20, 10, { usedHint: true }) }), NOW),
    ]
    const verboten = /schwäche|störung|defizit|auffällig|therap|förderbedarf|problem|rückstand|unterdurchschnitt/i
    for (const i of alle) {
      expect(verboten.test(i.titel), i.titel).toBe(false)
      expect(verboten.test(i.text), i.text).toBe(false)
    }
  })

  it('lobt, wenn ein Spiel gut sitzt', () => {
    const res = buildInsights(input({ attempts: serie(20, 19) }), NOW)
    expect(res.some((r) => r.id === 'stark-zahlen-ernte' && r.ton === 'lob')).toBe(true)
  })

  it('erkennt häufige Hilfe-Nutzung', () => {
    const res = buildInsights(
      input({ attempts: [...serie(8, 8, { usedHint: true }), ...serie(8, 8)] }),
      NOW,
    )
    expect(res.some((r) => r.id === 'viel-hilfe')).toBe(true)
  })

  it('erkennt schnelles Raten', () => {
    const res = buildInsights(
      input({ attempts: [...serie(8, 0, { timeMs: 700 }), ...serie(8, 8)] }),
      NOW,
    )
    expect(res.some((r) => r.id === 'raten')).toBe(true)
  })

  it('merkt an, wenn eine Welt gar nicht vorkommt', () => {
    const res = buildInsights(input({ attempts: serie(20, 15, { worldId: 'zahlen' }) }), NOW)
    expect(res.some((r) => r.id === 'gemieden-buchstaben')).toBe(true)
    expect(res.some((r) => r.id === 'gemieden-logik')).toBe(true)
    expect(res.some((r) => r.id === 'gemieden-zahlen')).toBe(false)
  })

  it('lobt regelmäßiges Spielen', () => {
    const minutenProTag = Array.from({ length: 7 }, (_, i) => ({ day: `d${i}`, minutes: 12 }))
    const res = buildInsights(input({ attempts: serie(20, 15), minutenProTag }), NOW)
    expect(res.some((r) => r.id === 'dranbleiben' && r.ton === 'lob')).toBe(true)
  })

  it('weist auf lange Sitzungen hin und nennt das Tageslimit', () => {
    const minutenProTag = [
      { day: 'a', minutes: 60 }, { day: 'b', minutes: 50 },
      ...Array.from({ length: 5 }, (_, i) => ({ day: `c${i}`, minutes: 0 })),
    ]
    const res = buildInsights(input({ attempts: serie(20, 15), minutenProTag }), NOW)
    const treffer = res.find((r) => r.id === 'lange-sitzungen')
    expect(treffer).toBeTruthy()
    expect(treffer!.text).toContain('Tageslimit')
  })

  it('erkennt spätes Spielen', () => {
    const abends = new Date('2026-06-14T21:30:00').getTime()
    const res = buildInsights(
      input({ attempts: [...serie(10, 8, { ts: abends }), ...serie(4, 4)] }),
      NOW,
    )
    expect(res.some((r) => r.id === 'spaet')).toBe(true)
  })

  it('meldet Fortschritt ab Stufe 6', () => {
    const res = buildInsights(input({ attempts: serie(20, 15), progress: progress(7) }), NOW)
    expect(res.some((r) => r.id === 'stufe-zahlen')).toBe(true)
  })

  it('gibt immer mindestens einen und höchstens fünf Hinweise', () => {
    const faelle: InsightInput[] = [
      input({ attempts: serie(20, 15) }),
      input({ attempts: serie(60, 10, { usedHint: true, timeMs: 600 }), progress: progress(9) }),
      input({ attempts: serie(20, 20), progress: progress(10) }),
    ]
    for (const f of faelle) {
      const res = buildInsights(f, NOW)
      expect(res.length).toBeGreaterThanOrEqual(1)
      expect(res.length).toBeLessThanOrEqual(5)
    }
  })

  it('sortiert die wichtigsten Hinweise nach oben', () => {
    const res = buildInsights(
      input({ attempts: serie(20, 3, { gameId: 'rechen-bruecke' }), progress: progress(8) }),
      NOW,
    )
    expect(res[0].gewicht).toBeGreaterThanOrEqual(res[res.length - 1].gewicht)
    expect(res[0].id).toBe('schwer-rechen-bruecke')
  })

  it('sagt etwas Freundliches, wenn es nichts anzumerken gibt', () => {
    // Gleichmäßig gespielt, mittlere Quote, keine Auffälligkeit
    const attempts = [
      ...serie(7, 5, { worldId: 'zahlen', gameId: 'zahlen-ernte' }),
      ...serie(7, 5, { worldId: 'buchstaben', gameId: 'buchstaben-fang' }),
      ...serie(7, 5, { worldId: 'logik', gameId: 'muster-weber' }),
    ]
    const res = buildInsights(input({ attempts }), NOW)
    expect(res.length).toBeGreaterThanOrEqual(1)
    expect(res.every((r) => r.titel.length > 0 && r.text.length > 20)).toBe(true)
  })
})
