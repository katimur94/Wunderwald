import { describe, expect, it } from 'vitest'
import {
  applyAttempt,
  averageTime,
  currentTitle,
  describeLevel,
  LEVEL_DOWN_FAILS,
  LEVEL_UP_STREAK,
  MAX_LEVEL,
  milestoneFor,
  milestonesOf,
  MIN_LEVEL,
  startLevelForAge,
  startLevelForBirthYear,
} from './adaptivity'
import type { Progress, WorldId } from '../db/types'
import { WORLD_IDS } from '../db/types'

function p(over: Partial<Progress> = {}): Progress {
  return {
    childId: 'kind-1',
    worldId: 'zahlen',
    level: 3,
    xp: 0,
    streak: 0,
    failStreak: 0,
    recentTimes: [],
    ...over,
  }
}

const fast = { correct: true, usedHint: false, timeMs: 3000 }
const slow = { correct: true, usedHint: false, timeMs: 12_000 }
const wrong = { correct: false, usedHint: false, timeMs: 5000 }
const hinted = { correct: true, usedHint: true, timeMs: 9000 }

describe('startLevelForAge', () => {
  it('bildet die Alterstabelle der Spec ab', () => {
    expect(startLevelForAge(3)).toBe(1)
    expect(startLevelForAge(4)).toBe(1)
    expect(startLevelForAge(5)).toBe(2)
    expect(startLevelForAge(6)).toBe(3)
    expect(startLevelForAge(7)).toBe(4)
    expect(startLevelForAge(8)).toBe(5)
    expect(startLevelForAge(9)).toBe(6)
    expect(startLevelForAge(10)).toBe(7)
    expect(startLevelForAge(12)).toBe(7)
  })

  it('startet ohne Geburtsjahr auf Stufe 1', () => {
    expect(startLevelForBirthYear(null)).toBe(1)
  })

  it('rechnet das Geburtsjahr in ein Alter um', () => {
    const now = new Date('2026-06-15T00:00:00Z')
    expect(startLevelForBirthYear(2020, now)).toBe(3) // 6 Jahre
    expect(startLevelForBirthYear(2016, now)).toBe(7) // 10 Jahre
  })

  it('ignoriert unsinnige Geburtsjahre', () => {
    expect(startLevelForBirthYear(2999, new Date('2026-01-01'))).toBe(1)
  })
})

describe('applyAttempt – Punktevergabe', () => {
  it('richtig ohne Hilfe: xp += 10 + difficulty, streak++, failStreak = 0', () => {
    const { progress } = applyAttempt(p({ level: 4, xp: 100, streak: 1, failStreak: 2 }), fast)
    expect(progress.xp).toBe(114)
    expect(progress.streak).toBe(2)
    expect(progress.failStreak).toBe(0)
  })

  it('richtig mit Hilfe: xp += 5, streak bleibt unverändert', () => {
    const { progress } = applyAttempt(p({ xp: 50, streak: 2 }), hinted)
    expect(progress.xp).toBe(55)
    expect(progress.streak).toBe(2)
  })

  it('falsch: failStreak++, streak = 0, keine xp', () => {
    const { progress } = applyAttempt(p({ xp: 42, streak: 3, failStreak: 0 }), wrong)
    expect(progress.xp).toBe(42)
    expect(progress.streak).toBe(0)
    expect(progress.failStreak).toBe(1)
  })

  it('Zeiten mit Hilfe zählen nicht in den Schnitt', () => {
    const { progress } = applyAttempt(p(), hinted)
    expect(progress.recentTimes).toEqual([])
  })
})

describe('applyAttempt – Aufstieg', () => {
  it('steigt nach 4 schnellen richtigen Aufgaben in Folge auf', () => {
    let prog = p({ level: 3 })
    let delta = 0
    for (let i = 0; i < LEVEL_UP_STREAK; i++) {
      const r = applyAttempt(prog, fast)
      prog = r.progress
      delta = r.levelDelta
    }
    expect(delta).toBe(1)
    expect(prog.level).toBe(4)
    expect(prog.streak).toBe(0)
    expect(prog.failStreak).toBe(0)
    expect(prog.recentTimes).toEqual([])
  })

  it('behält den XP-Rest beim Aufstieg', () => {
    let prog = p({ level: 3, xp: 77 })
    for (let i = 0; i < LEVEL_UP_STREAK; i++) prog = applyAttempt(prog, fast).progress
    expect(prog.xp).toBe(77 + 4 * 13)
  })

  it('steigt NICHT auf, wenn die Aufgaben im Schnitt zu langsam gelöst wurden', () => {
    let prog = p({ level: 3 })
    for (let i = 0; i < 6; i++) prog = applyAttempt(prog, slow).progress
    expect(prog.level).toBe(3)
    expect(prog.streak).toBe(6)
  })

  it('steigt über Stufe 10 nicht hinaus', () => {
    let prog = p({ level: MAX_LEVEL })
    let delta = 0
    for (let i = 0; i < 12; i++) {
      const r = applyAttempt(prog, fast)
      prog = r.progress
      delta = r.levelDelta
    }
    expect(prog.level).toBe(MAX_LEVEL)
    expect(delta).toBe(0)
  })

  it('meldet auf geraden Stufen einen Meilenstein, auf ungeraden nicht', () => {
    let prog = p({ level: 3 })
    let ms = null
    for (let i = 0; i < LEVEL_UP_STREAK; i++) ({ progress: prog, milestone: ms } = applyAttempt(prog, fast))
    expect(ms?.level).toBe(4)
    expect(ms?.title).toBe('Zahlen-Kenner')

    let prog2 = p({ level: 4 })
    let ms2 = null
    for (let i = 0; i < LEVEL_UP_STREAK; i++) ({ progress: prog2, milestone: ms2 } = applyAttempt(prog2, fast))
    expect(prog2.level).toBe(5)
    expect(ms2).toBeNull()
  })
})

describe('applyAttempt – Abstieg', () => {
  it('steigt nach 3 Fehlern in Folge ab', () => {
    let prog = p({ level: 5 })
    let delta = 0
    for (let i = 0; i < LEVEL_DOWN_FAILS; i++) {
      const r = applyAttempt(prog, wrong)
      prog = r.progress
      delta = r.levelDelta
    }
    expect(delta).toBe(-1)
    expect(prog.level).toBe(4)
    expect(prog.failStreak).toBe(0)
    expect(prog.streak).toBe(0)
  })

  it('fällt nicht unter Stufe 1 und bleibt dort nicht hängen', () => {
    let prog = p({ level: MIN_LEVEL })
    for (let i = 0; i < 9; i++) prog = applyAttempt(prog, wrong).progress
    expect(prog.level).toBe(MIN_LEVEL)
    expect(prog.failStreak).toBeLessThan(LEVEL_DOWN_FAILS)
  })

  it('ein richtiger Versuch dazwischen verhindert den Abstieg', () => {
    let prog = p({ level: 5 })
    prog = applyAttempt(prog, wrong).progress
    prog = applyAttempt(prog, wrong).progress
    prog = applyAttempt(prog, fast).progress
    prog = applyAttempt(prog, wrong).progress
    expect(prog.level).toBe(5)
  })

  it('richtig-mit-Hilfe setzt den failStreak nicht zurück', () => {
    let prog = p({ level: 5 })
    prog = applyAttempt(prog, wrong).progress
    prog = applyAttempt(prog, wrong).progress
    prog = applyAttempt(prog, hinted).progress
    expect(prog.failStreak).toBe(2)
    const r = applyAttempt(prog, wrong)
    expect(r.levelDelta).toBe(-1)
  })
})

describe('averageTime', () => {
  it('leere Liste blockiert den Aufstieg', () => {
    expect(averageTime([])).toBe(Infinity)
  })
  it('rechnet den Mittelwert', () => {
    expect(averageTime([2000, 4000])).toBe(3000)
  })
})

describe('Meilensteine und Klartext-Profil', () => {
  it('gibt es nur auf geraden Stufen', () => {
    expect(milestoneFor('zahlen', 1)).toBeNull()
    expect(milestoneFor('zahlen', 2)?.title).toBe('Zahlen-Entdecker')
    expect(milestoneFor('logik', 10)?.title).toBe('Logik-Magier')
  })

  it('liefert pro Welt fünf Meilensteine mit Bonus-Sternen', () => {
    for (const w of WORLD_IDS) {
      const ms = milestonesOf(w)
      expect(ms).toHaveLength(5)
      expect(ms.every((m) => m.bonusStars > 0)).toBe(true)
    }
  })

  it('nennt den zuletzt erreichten Titel', () => {
    expect(currentTitle('zahlen', 1)).toBe('Frisch im Wald')
    expect(currentTitle('zahlen', 3)).toBe('Zahlen-Entdecker')
    expect(currentTitle('zahlen', 10)).toBe('Zahlen-Magier')
  })

  it('hat für jede Welt und jede Stufe 1..10 einen Klartext', () => {
    for (const w of WORLD_IDS as WorldId[]) {
      for (let lvl = 1; lvl <= 10; lvl++) {
        expect(describeLevel(w, lvl).length).toBeGreaterThan(20)
      }
    }
  })
})
