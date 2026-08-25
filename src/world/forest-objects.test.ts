import { describe, expect, it } from 'vitest'
import {
  ANSICHT_VON_OBEN,
  BEREICHE,
  aktuelleTageszeit,
  ausKiste,
  besucheHeute,
  companionLevel,
  darfGiessen,
  inKiste,
  istGiessbar,
  neuerBereich,
  offeneBereiche,
  tageszeitVon,
  istDunkel,
  verfuegbareSlots,
  verschiebe,
  wandereTier,
  WIESE_SLOTS,
  zoneOfSlot,
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
  it('startet mit 24 Plätzen auf der Lichtung', () => {
    // Bach und Huegel kommen erst mit 12 bzw. 20 Objekten dazu (siehe Bereiche).
    expect(WIESE_SLOTS).toBe(24)
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

/* ================================================================== */
/* Phase 8                                                              */
/* ================================================================== */

describe('Bereiche', () => {
  it('startet mit der Lichtung und schaltet Bach und Hügel nach', () => {
    expect(offeneBereiche(0).map((b) => b.zone)).toEqual(['wiese'])
    expect(offeneBereiche(11).map((b) => b.zone)).toEqual(['wiese'])
    expect(offeneBereiche(12).map((b) => b.zone)).toEqual(['wiese', 'bach'])
    expect(offeneBereiche(20).map((b) => b.zone)).toEqual(['wiese', 'bach', 'huegel'])
  })

  it('hat 24 Plätze auf der Wiese und 40 insgesamt', () => {
    expect(WIESE_SLOTS).toBe(24)
    expect(GRID_SLOTS).toBe(40)
    expect(verfuegbareSlots(0)).toHaveLength(24)
    expect(verfuegbareSlots(20)).toHaveLength(40)
  })

  it('ordnet jeden Slot genau einer Zone zu', () => {
    expect(zoneOfSlot(0)).toBe('wiese')
    expect(zoneOfSlot(23)).toBe('wiese')
    expect(zoneOfSlot(24)).toBe('bach')
    expect(zoneOfSlot(31)).toBe('bach')
    expect(zoneOfSlot(32)).toBe('huegel')
    expect(zoneOfSlot(39)).toBe('huegel')
  })

  it('feiert jeden neuen Bereich genau einmal', () => {
    expect(neuerBereich(11, [])).toBeNull()
    expect(neuerBereich(12, [])?.zone).toBe('bach')
    // schon gefeiert -> nicht noch einmal
    expect(neuerBereich(12, ['bereich-bach'])).toBeNull()
    expect(neuerBereich(20, ['bereich-bach'])?.zone).toBe('huegel')
    expect(neuerBereich(20, ['bereich-bach', 'bereich-huegel'])).toBeNull()
  })

  it('bietet nur Plätze an, auf denen das Objekt stehen darf', () => {
    const wald: ForestItem[] = Array.from({ length: 20 }, (_, i) => item('blume', 0, i))
    // Seerose gehoert an den Bach
    const fuerSeerose = freeSlots(wald, 'seerose')
    expect(fuerSeerose.length).toBeGreaterThan(0)
    fuerSeerose.forEach((s) => expect(zoneOfSlot(s)).toBe('bach'))
    // Fuchsbau nur auf den Huegel
    freeSlots(wald, 'fuchsbau').forEach((s) => expect(zoneOfSlot(s)).toBe('huegel'))
    // Laterne darf ueberall
    expect(new Set(freeSlots(wald, 'laterne').map(zoneOfSlot)).size).toBeGreaterThan(1)
  })

  it('zeigt die Streifen von oben nach unten als Landschaft', () => {
    // Nicht die umgekehrte Freischalt-Reihenfolge: die legt den Bach ueber die Wiese.
    expect(ANSICHT_VON_OBEN).toEqual(['huegel', 'wiese', 'bach'])
    // Jede Zone kommt genau einmal vor, keine fehlt und keine doppelt.
    expect([...ANSICHT_VON_OBEN].sort()).toEqual(BEREICHE.map((b) => b.zone).sort())
  })

  it('gibt vor der Freischaltung keine Bach-Plätze aus', () => {
    const klein: ForestItem[] = Array.from({ length: 5 }, (_, i) => item('blume', 0, i))
    expect(freeSlots(klein, 'seerose')).toEqual([])
  })
})

describe('Set-Boni', () => {
  function mitObjekten(ids: string[], milestones: string[] = []): Child {
    return child({ forest: ids.map((id, i) => item(id, 0, i)), milestones })
  }

  it('drei Wasser-Objekte holen die Ente', () => {
    expect(pendingGift(mitObjekten(['teich', 'seerose', 'bruecke']))?.objectId).toBe('ente')
    expect(pendingGift(mitObjekten(['teich', 'seerose']))).toBeNull()
  })

  it('Vogelhaus mit zwei Bäumen holt den Vogel', () => {
    expect(pendingGift(mitObjekten(['vogelhaus', 'baum', 'tanne']))?.id).toBe('set-vogel')
    expect(pendingGift(mitObjekten(['vogelhaus', 'baum']))).toBeNull()
  })

  it('fünf verschiedene Pflanzen holen die Schmetterlinge', () => {
    const fuenf = ['blume', 'busch', 'sonnenblume', 'erdbeerbeet', 'seerose']
    expect(pendingGift(mitObjekten(fuenf))?.id).toBe('set-schmetterlinge')
    // fuenf Mal dieselbe Pflanze zaehlt nicht
    expect(pendingGift(mitObjekten(['blume', 'blume', 'blume', 'blume', 'blume']))).toBeNull()
  })

  it('gibt jedes Set nur einmal', () => {
    const c = mitObjekten(['teich', 'seerose', 'bruecke'], ['set-wasser'])
    expect(pendingGift(c)?.id).not.toBe('set-wasser')
  })
})

describe('Gießen', () => {
  it('geht genau einmal pro Tag', () => {
    const c = child({ lastWatered: '' })
    expect(darfGiessen(c, '2026-05-01')).toBe(true)
    expect(darfGiessen({ ...c, lastWatered: '2026-05-01' }, '2026-05-01')).toBe(false)
    expect(darfGiessen({ ...c, lastWatered: '2026-05-01' }, '2026-05-02')).toBe(true)
  })

  it('nur wachsende Pflanzen lassen sich gießen', () => {
    expect(istGiessbar(item('baum', 0))).toBe(true)
    expect(istGiessbar(item('baum', 4))).toBe(false)   // schon im letzten Stadium
    expect(istGiessbar(item('hase', 0))).toBe(false)   // waechst nie
    expect(istGiessbar(item('bank', 0))).toBe(false)
  })
})

describe('Tagesstimmung', () => {
  it('teilt den Tag in vier Stimmungen', () => {
    expect(tageszeitVon(7)).toBe('morgen')
    expect(tageszeitVon(9)).toBe('morgen')
    expect(tageszeitVon(10)).toBe('tag')
    expect(tageszeitVon(16)).toBe('tag')
    expect(tageszeitVon(17)).toBe('abend')
    expect(tageszeitVon(20)).toBe('abend')
    expect(tageszeitVon(21)).toBe('nacht')
    expect(tageszeitVon(3)).toBe('nacht')
  })

  it('deckt alle 24 Stunden ab', () => {
    for (let h = 0; h < 24; h++) {
      expect(['morgen', 'tag', 'abend', 'nacht']).toContain(tageszeitVon(h))
    }
  })

  it('nutzt ein übergebenes Datum, nicht die echte Uhr', () => {
    expect(aktuelleTageszeit(new Date(2026, 4, 1, 22, 0))).toBe('nacht')
    expect(aktuelleTageszeit(new Date(2026, 4, 1, 8, 0))).toBe('morgen')
  })

  it('abends und nachts leuchten die Laternen', () => {
    expect(istDunkel('abend')).toBe(true)
    expect(istDunkel('nacht')).toBe(true)
    expect(istDunkel('tag')).toBe(false)
  })
})

describe('Kiste', () => {
  it('lagert ein und behält das Wachstumsstadium', () => {
    const wald = [item('baum', 4, 3)]
    const { forest, inventory } = inKiste(wald, [], 3)
    expect(forest).toHaveLength(0)
    expect(inventory).toEqual([{ objectId: 'baum', growthDays: 4 }])
  })

  it('holt kostenlos zurück, mit demselben Stadium', () => {
    const { forest } = ausKiste([], [{ objectId: 'baum', growthDays: 4 }], 0, 7, '2026-05-01')
    expect(forest).toHaveLength(1)
    expect(forest[0].slot).toBe(7)
    expect(forest[0].growthDays).toBe(4)
    expect(stageOf(forest[0])).toBe(2)
  })

  it('Ein- und Auslagern verliert nichts', () => {
    const start = [item('baum', 4, 3)]
    const a = inKiste(start, [], 3)
    const b = ausKiste(a.forest, a.inventory, 0, 9, '2026-05-01')
    expect(b.inventory).toHaveLength(0)
    expect(stageOf(b.forest[0])).toBe(stageOf(start[0]))
  })

  it('verschiebt kostenlos auf einen freien Platz', () => {
    const wald = [item('baum', 2, 3), item('blume', 0, 5)]
    const neu = verschiebe(wald, 3, 8)
    expect(neu.find((f) => f.objectId === 'baum')?.slot).toBe(8)
    expect(neu.find((f) => f.objectId === 'baum')?.growthDays).toBe(2)
  })

  it('verschiebt nicht auf einen belegten Platz', () => {
    const wald = [item('baum', 2, 3), item('blume', 0, 5)]
    expect(verschiebe(wald, 3, 5)).toEqual(wald)
  })
})

describe('Tiere wandern', () => {
  const wald: ForestItem[] = [
    item('hase', 0, 0), item('blume', 0, 1),
    ...Array.from({ length: 20 }, (_, i) => item('busch', 0, i + 2)),
  ]

  it('wandert nur manchmal', () => {
    expect(wandereTier(wald, () => 0.9)).toBeNull()
    expect(wandereTier(wald, () => 0.1)).not.toBeNull()
  })

  it('bewegt nur Tiere, nie Pflanzen', () => {
    const r = wandereTier(wald, () => 0.1)!
    expect(r.vonSlot).toBe(0)
    expect(r.forest.find((f) => f.objectId === 'hase')?.slot).toBe(r.nachSlot)
  })

  it('bleibt in der eigenen Zone', () => {
    for (let i = 0; i < 40; i++) {
      let n = 0
      const r = wandereTier(wald, () => { n++; return n === 1 ? 0.1 : (i % 10) / 10 })
      if (r) expect(zoneOfSlot(r.nachSlot)).toBe(zoneOfSlot(r.vonSlot))
    }
  })

  it('tut nichts, wenn es keine Tiere gibt', () => {
    expect(wandereTier([item('blume', 0, 0)], () => 0.1)).toBeNull()
  })

  it('tut nichts, wenn alles belegt ist', () => {
    const voll = Array.from({ length: 24 }, (_, i) => item(i === 0 ? 'hase' : 'busch', 0, i))
    expect(wandereTier(voll, () => 0.1)).toBeNull()
  })
})

describe('Waldtage', () => {
  it('zählt jeden neuen Tag genau einmal', () => {
    const c = child({ forestDays: 3, lastVisitDay: '2026-05-01' })
    expect(besucheHeute(c, '2026-05-01')).toBeNull()
    const w = besucheHeute(c, '2026-05-02')!
    expect(w.forestDays).toBe(4)
    expect(w.lastVisitDay).toBe('2026-05-02')
  })

  it('gibt alle fünf Waldtage Bonus-Sterne', () => {
    expect(besucheHeute(child({ forestDays: 4, lastVisitDay: 'x' }), 'y')!.bonus).toBe(5)
    expect(besucheHeute(child({ forestDays: 3, lastVisitDay: 'x' }), 'y')!.bonus).toBe(0)
    expect(besucheHeute(child({ forestDays: 9, lastVisitDay: 'x' }), 'y')!.bonus).toBe(5)
  })

  it('reißt nie ab — auch nach langer Pause zählt einfach weiter', () => {
    const nachPause = besucheHeute(child({ forestDays: 12, lastVisitDay: '2026-01-01' }), '2026-09-09')!
    expect(nachPause.forestDays).toBe(13)
  })
})
