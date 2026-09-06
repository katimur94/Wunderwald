import { describe, expect, it } from 'vitest'
import {
  aktuelleTageszeit,
  besucheHeute,
  companionLevel,
  darfGiessen,
  giesstageSeit,
  GIESS_TAGEBUCH,
  istDunkel,
  merkeGiesstag,
  starsToNextCompanionLevel,
  tageszeitVon,
  unlockedOutfits,
  WALDTAG_BELOHNUNG,
  WALDTAG_INTERVALL,
} from './forest-objects'
import type { Child } from '../db/types'

function child(over: Partial<Child> = {}): Child {
  return {
    id: 'k1',
    nickname: 'Mia',
    avatarId: 'igel',
    birthYear: null,
    createdAt: 0,
    stars: 0,
    starsTotal: 0,
    companion: { level: 1, xp: 0, outfitId: null, ownedOutfits: [] },
    forest: [],
    milestones: [],
    ...over,
  }
}

describe('Funkels Level und Outfits', () => {
  it('steigt alle 50 Sterne', () => {
    expect(companionLevel(0)).toBe(1)
    expect(companionLevel(49)).toBe(1)
    expect(companionLevel(50)).toBe(2)
    expect(companionLevel(260)).toBe(6)
  })

  it('zählt herunter bis zum nächsten Level', () => {
    expect(starsToNextCompanionLevel(0)).toBe(50)
    expect(starsToNextCompanionLevel(49)).toBe(1)
    expect(starsToNextCompanionLevel(50)).toBe(50)
  })

  it('schaltet Outfits nach und nach frei', () => {
    expect(unlockedOutfits(0)).toHaveLength(0)
    expect(unlockedOutfits(50).map((o) => o.id)).toEqual(['halstuch'])
    expect(unlockedOutfits(350).length).toBe(6)
  })
})

describe('Gieß-Tagebuch', () => {
  it('merkt sich, ob heute schon gegossen wurde', () => {
    expect(darfGiessen(child({ wateredDays: ['2026-05-01'] }), '2026-05-02')).toBe(true)
    expect(darfGiessen(child({ wateredDays: ['2026-05-02'] }), '2026-05-02')).toBe(false)
    expect(darfGiessen(child(), '2026-05-02')).toBe(true)
  })

  it('schreibt jeden Gießtag genau einmal ins Tagebuch', () => {
    const a = merkeGiesstag(undefined, '2026-05-01')
    expect(a).toEqual(['2026-05-01'])
    expect(merkeGiesstag(a, '2026-05-01')).toEqual(['2026-05-01'])
    expect(merkeGiesstag(a, '2026-05-02')).toEqual(['2026-05-01', '2026-05-02'])
  })

  it('hebt höchstens zwei Wochen auf', () => {
    let tage: string[] = []
    for (let i = 1; i <= 20; i++) tage = merkeGiesstag(tage, `2026-05-${String(i).padStart(2, '0')}`)
    expect(tage).toHaveLength(GIESS_TAGEBUCH)
    expect(tage[0]).toBe('2026-05-07')
  })

  it('zählt die Gießtage seit einem Stichtag', () => {
    const k = child({ wateredDays: ['2026-04-20', '2026-05-01', '2026-05-03'] })
    expect(giesstageSeit(k, '2026-05-01')).toBe(2)
    expect(giesstageSeit(k, '2026-01-01')).toBe(3)
  })
})

describe('Tagesstimmung', () => {
  it('teilt den Tag in vier Stimmungen', () => {
    expect(tageszeitVon(7)).toBe('morgen')
    expect(tageszeitVon(12)).toBe('tag')
    expect(tageszeitVon(18)).toBe('abend')
    expect(tageszeitVon(23)).toBe('nacht')
    expect(tageszeitVon(3)).toBe('nacht')
  })

  it('deckt alle 24 Stunden ab', () => {
    for (let h = 0; h < 24; h++) expect(['morgen', 'tag', 'abend', 'nacht']).toContain(tageszeitVon(h))
  })

  it('nutzt ein übergebenes Datum, nicht die echte Uhr', () => {
    expect(aktuelleTageszeit(new Date(2026, 0, 1, 19, 0))).toBe('abend')
  })

  it('abends und nachts leuchten die Laternen', () => {
    expect(istDunkel('abend')).toBe(true)
    expect(istDunkel('nacht')).toBe(true)
    expect(istDunkel('tag')).toBe(false)
  })
})

describe('Gartentage', () => {
  it('zählt jeden Tag genau einmal', () => {
    const k = child({ forestDays: 3, lastVisitDay: '2026-05-01' })
    expect(besucheHeute(k, '2026-05-01')).toBeNull()
    expect(besucheHeute(k, '2026-05-02')?.forestDays).toBe(4)
  })

  it('belohnt jeden fünften Tag', () => {
    const k = child({ forestDays: WALDTAG_INTERVALL - 1, lastVisitDay: '2026-05-01' })
    expect(besucheHeute(k, '2026-05-02')?.bonus).toBe(WALDTAG_BELOHNUNG)
    expect(besucheHeute(child({ forestDays: 1 }), '2026-05-02')?.bonus).toBe(0)
  })
})
