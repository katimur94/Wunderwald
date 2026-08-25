import { describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { WunderwaldDB } from './db'

/**
 * Bestehende Kinder stammen aus Schema-Version 1 und kennen weder Kiste noch
 * Gießtag noch Waldtage. Sie müssen ohne Sonderfälle weiterlaufen.
 */
async function legeV1DatenbankAn(name: string) {
  const alt = new Dexie(name)
  alt.version(1).stores({
    family: 'id',
    children: 'id, createdAt',
    progress: '[childId+worldId], childId',
    attempts: '++id, childId, gameId, ts',
    sessions: '++id, childId, startedAt',
  })
  await alt.open()
  await alt.table('children').add({
    id: 'alt-1',
    nickname: 'Mia',
    avatarId: 'igel',
    birthYear: 2019,
    createdAt: 1,
    stars: 12,
    starsTotal: 40,
    companion: { level: 1, xp: 0, outfitId: null, ownedOutfits: [] },
    forest: [{ slot: 0, objectId: 'baum', placedAt: 1, growthDays: 3, lastGrowthDay: '2026-01-01' }],
    milestones: ['forest-10'],
    toured: true,
    // inventory, lastWatered, forestDays, lastVisitDay fehlen absichtlich
  })
  alt.close()
}

describe('Dexie-Migration von Version 1 auf 2', () => {
  it('lädt bestehende Kinder und ergänzt die neuen Felder', async () => {
    const name = `ww-migr-${Math.floor(Math.random() * 1e9)}`
    await legeV1DatenbankAn(name)

    const neu = new WunderwaldDB(name)
    await neu.open()
    expect(neu.verno).toBe(2)

    const kind = await neu.children.get('alt-1')
    expect(kind).toBeTruthy()
    // Bestehendes bleibt unangetastet
    expect(kind!.nickname).toBe('Mia')
    expect(kind!.stars).toBe(12)
    expect(kind!.forest).toHaveLength(1)
    expect(kind!.forest[0].growthDays).toBe(3)
    expect(kind!.milestones).toEqual(['forest-10'])
    // Neues ist mit sinnvollen Vorgaben da
    expect(kind!.inventory).toEqual([])
    expect(kind!.lastWatered).toBe('')
    expect(kind!.forestDays).toBe(0)
    expect(kind!.lastVisitDay).toBe('')
    neu.close()
  })

  it('macht aus einem V1-Kind kein zweites Kind', async () => {
    const name = `ww-migr2-${Math.floor(Math.random() * 1e9)}`
    await legeV1DatenbankAn(name)
    const neu = new WunderwaldDB(name)
    await neu.open()
    expect(await neu.children.count()).toBe(1)
    neu.close()
  })

  it('eine frische Datenbank startet direkt auf Version 2', async () => {
    const db = new WunderwaldDB(`ww-frisch-${Math.floor(Math.random() * 1e9)}`)
    await db.open()
    expect(db.verno).toBe(2)
    db.close()
  })
})
