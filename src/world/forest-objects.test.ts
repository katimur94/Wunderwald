import { describe, expect, it } from 'vitest'
import {
  companionLevel,
  emojiOf,
  FOREST_GIFTS,
  FOREST_OBJECTS,
  freeSlots,
  GRID_SLOTS,
  growForest,
  makeForestItem,
  needsGrowth,
  objectById,
  pendingGift,
  scaleOf,
  shopFor,
  stageOf,
  starsToNextCompanionLevel,
  unlockedOutfits,
} from './forest-objects'
import type { Child, ForestItem } from '../db/types'

function item(objectId: string, growthDays = 0, slot = 0, lastGrowthDay = '2026-01-01'): ForestItem {
  return { slot, objectId, placedAt: 0, growthDays, lastGrowthDay }
}

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

describe('Shop-Katalog', () => {
  it('hat eindeutige Ids und sinnvolle Preise', () => {
    const ids = FOREST_OBJECTS.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const o of FOREST_OBJECTS) {
      expect(o.kosten, o.id).toBeGreaterThan(0)
      expect(o.stadien, o.id).toBeGreaterThanOrEqual(1)
      expect(o.darstellung.length, o.id).toBe(o.stadien)
    }
  })

  it('hält die Preise der Spec ein', () => {
    expect(objectById('blume')?.kosten).toBe(3)
    expect(objectById('busch')?.kosten).toBe(5)
    expect(objectById('baum')?.kosten).toBe(8)
    expect(objectById('pilzhaus')?.kosten).toBe(12)
    expect(objectById('teich')?.kosten).toBe(15)
    expect(objectById('hase')?.kosten).toBe(20)
  })

  it('zeigt am Anfang nur die günstigen Objekte', () => {
    const anfang = shopFor(0)
    expect(anfang.map((o) => o.id)).toEqual(['blume', 'busch', 'baum'])
    expect(anfang.every((o) => o.kosten <= 8)).toBe(true)
  })

  it('schaltet mit wachsendem Sternkonto mehr frei', () => {
    expect(shopFor(0).length).toBeLessThan(shopFor(40).length)
    expect(shopFor(100).length).toBe(FOREST_OBJECTS.length)
  })

  it('bietet nichts an, was ein Kind mit 3 Sternen nie erreichen könnte', () => {
    // Das erste Objekt muss mit den Sternen einer einzigen Runde bezahlbar sein
    expect(Math.min(...shopFor(0).map((o) => o.kosten))).toBeLessThanOrEqual(7)
  })
})

describe('Wachstum', () => {
  it('ein frisch gepflanzter Baum steht im ersten Stadium', () => {
    expect(stageOf(item('baum', 0))).toBe(0)
    expect(emojiOf(item('baum', 0))).toBe('🌱')
  })

  it('wächst nach genug Spieltagen ins nächste Stadium', () => {
    expect(stageOf(item('baum', 2))).toBe(1)
    expect(emojiOf(item('baum', 2))).toBe('🌳')
    expect(stageOf(item('baum', 4))).toBe(2)
  })

  it('wächst nie über das letzte Stadium hinaus', () => {
    expect(stageOf(item('baum', 999))).toBe(2)
    expect(emojiOf(item('baum', 999))).toBe('🌳')
  })

  it('Tiere und Deko wachsen gar nicht', () => {
    expect(stageOf(item('hase', 99))).toBe(0)
    expect(scaleOf(item('hase', 99))).toBe(1)
  })

  it('wird mit jedem Stadium sichtbar größer', () => {
    expect(scaleOf(item('baum', 0))).toBeLessThan(scaleOf(item('baum', 2)))
    expect(scaleOf(item('baum', 2))).toBeLessThan(scaleOf(item('baum', 4)))
    expect(scaleOf(item('baum', 4))).toBe(1)
  })

  it('schreibt pro Tag genau eine Gutschrift gut', () => {
    const wald = [item('baum', 0, 0, '2026-01-01')]
    const nach1 = growForest(wald, '2026-01-02')
    expect(nach1[0].growthDays).toBe(1)

    // Gleicher Tag noch einmal geladen: keine zweite Gutschrift
    const nach2 = growForest(nach1, '2026-01-02')
    expect(nach2[0].growthDays).toBe(1)

    const nach3 = growForest(nach2, '2026-01-03')
    expect(nach3[0].growthDays).toBe(2)
  })

  it('meldet, ob heute überhaupt etwas zu gießen ist', () => {
    const wald = [item('baum', 0, 0, '2026-01-01')]
    expect(needsGrowth(wald, '2026-01-02')).toBe(true)
    expect(needsGrowth(growForest(wald, '2026-01-02'), '2026-01-02')).toBe(false)
    expect(needsGrowth([], '2026-01-02')).toBe(false)
  })

  it('ein frisch gepflanztes Objekt wächst am selben Tag nicht mit', () => {
    const frisch = makeForestItem('baum', 3, '2026-01-05')
    expect(growForest([frisch], '2026-01-05')[0].growthDays).toBe(0)
  })
})

describe('Plätze im Wald', () => {
  it('hat 24 Plätze', () => {
    expect(GRID_SLOTS).toBe(24)
    expect(freeSlots([])).toHaveLength(24)
  })

  it('meldet belegte Plätze nicht als frei', () => {
    const frei = freeSlots([item('baum', 0, 5), item('blume', 0, 9)])
    expect(frei).toHaveLength(22)
    expect(frei).not.toContain(5)
    expect(frei).not.toContain(9)
  })
})

describe('Meilenstein-Geschenke', () => {
  it('gibt es bei 10, 25 und 50 Objekten', () => {
    expect(FOREST_GIFTS.map((g) => g.ab)).toEqual([10, 25, 50])
  })

  it('kommt erst, wenn genug Objekte stehen', () => {
    expect(pendingGift(child({ forest: Array.from({ length: 9 }, (_, i) => item('blume', 0, i)) }))).toBeNull()
    expect(
      pendingGift(child({ forest: Array.from({ length: 10 }, (_, i) => item('blume', 0, i)) }))?.id,
    ).toBe('forest-10')
  })

  it('kommt nur einmal', () => {
    const c = child({
      forest: Array.from({ length: 12 }, (_, i) => item('blume', 0, i)),
      milestones: ['forest-10'],
    })
    expect(pendingGift(c)).toBeNull()
  })

  it('überspringt keine Stufe, wenn das Kind schnell wächst', () => {
    const c = child({ forest: Array.from({ length: 30 }, (_, i) => item('blume', 0, i)) })
    expect(pendingGift(c)?.id).toBe('forest-10')
    const danach = { ...c, milestones: ['forest-10'] }
    expect(pendingGift(danach)?.id).toBe('forest-25')
  })
})

describe('Funkels Level und Outfits', () => {
  it('steigt alle 50 Sterne', () => {
    expect(companionLevel(0)).toBe(1)
    expect(companionLevel(49)).toBe(1)
    expect(companionLevel(50)).toBe(2)
    expect(companionLevel(150)).toBe(4)
  })

  it('zählt herunter bis zum nächsten Level', () => {
    expect(starsToNextCompanionLevel(0)).toBe(50)
    expect(starsToNextCompanionLevel(30)).toBe(20)
    expect(starsToNextCompanionLevel(49)).toBe(1)
  })

  it('schaltet Outfits nach und nach frei', () => {
    expect(unlockedOutfits(0)).toHaveLength(0)
    expect(unlockedOutfits(50).map((o) => o.id)).toEqual(['halstuch'])
    expect(unlockedOutfits(400).length).toBeGreaterThanOrEqual(6)
  })
})
