import { beforeEach, describe, expect, it } from 'vitest'
import { db, DEFAULT_SETTINGS, SCHEMA_VERSION } from './db'
import { createChild } from './children'
import { backupFilename, BackupError, buildBackup, daysSince, importBackup, validateBackup } from './backup'
import type { Family } from './types'

async function seed() {
  const family: Family = {
    id: 'family',
    parentName: 'Testeltern',
    pinHash: 'a'.repeat(64),
    pinSalt: 'b'.repeat(32),
    recoveryHash: 'c'.repeat(64),
    recoverySalt: 'd'.repeat(32),
    createdAt: 1_700_000_000_000,
    settings: { ...DEFAULT_SETTINGS },
  }
  await db.family.put(family)
  const kid = await createChild({ nickname: 'Mia', avatarId: 'igel', birthYear: 2019 })
  await db.children.update(kid.id, { stars: 12, starsTotal: 30 })
  await db.attempts.bulkAdd([
    { childId: kid.id, worldId: 'zahlen', gameId: 'zahlen-ernte', difficulty: 3, correct: true, usedHint: false, timeMs: 2400, ts: 1_700_000_100_000 },
    { childId: kid.id, worldId: 'zahlen', gameId: 'zahlen-ernte', difficulty: 3, correct: false, usedHint: false, timeMs: 9100, ts: 1_700_000_200_000 },
  ])
  await db.sessions.add({ childId: kid.id, startedAt: 1_700_000_000_500, endedAt: 1_700_000_600_500, gamesPlayed: 2 })
  return kid
}

async function wipe() {
  await Promise.all([
    db.family.clear(),
    db.children.clear(),
    db.progress.clear(),
    db.attempts.clear(),
    db.sessions.clear(),
  ])
}

beforeEach(wipe)

describe('Sicherung erstellen', () => {
  it('nimmt alle Tabellen mit und trägt die Schema-Version ein', async () => {
    await seed()
    const backup = await buildBackup()
    expect(backup.app).toBe('wunderwald')
    // Gegen die Konstante pruefen, nicht gegen eine Zahl — sonst bricht der
    // Test bei jeder Schema-Erweiterung, obwohl nichts kaputt ist.
    expect(backup.schemaVersion).toBe(SCHEMA_VERSION)
    expect(backup.data.family).toHaveLength(1)
    expect(backup.data.children).toHaveLength(1)
    expect(backup.data.progress).toHaveLength(3) // drei Welten
    expect(backup.data.attempts).toHaveLength(2)
    expect(backup.data.sessions).toHaveLength(1)
  })

  it('benennt die Datei nach dem Datum', () => {
    expect(backupFilename(new Date(2026, 0, 7))).toBe('wunderwald-backup-2026-01-07.json')
  })
})

describe('Sicherung prüfen', () => {
  it('weist fremde Dateien ab', () => {
    expect(() => validateBackup({ hello: 'world' })).toThrow(BackupError)
    expect(() => validateBackup(null)).toThrow(BackupError)
    expect(() => validateBackup('nope')).toThrow(BackupError)
  })

  it('weist neuere Schema-Versionen ab', async () => {
    await seed()
    const backup = await buildBackup()
    expect(() => validateBackup({ ...backup, schemaVersion: 99 })).toThrow(/neueren Version/)
  })

  it('weist beschädigte Kind-Einträge ab', async () => {
    await seed()
    const backup = await buildBackup()
    const broken = { ...backup, data: { ...backup.data, children: [{ id: 5 }] } }
    expect(() => validateBackup(broken)).toThrow(/beschädigt/)
  })

  it('nimmt eine gültige Sicherung an', async () => {
    await seed()
    const backup = await buildBackup()
    expect(validateBackup(JSON.parse(JSON.stringify(backup)))).toBeTruthy()
  })
})

describe('Import: ersetzen', () => {
  it('stellt auf einer frischen Instanz denselben Zustand her', async () => {
    const kid = await seed()
    const backup = await buildBackup()
    const json = JSON.parse(JSON.stringify(backup))

    await wipe()
    expect(await db.children.count()).toBe(0)

    await importBackup(validateBackup(json), 'replace')

    const restored = await db.children.get(kid.id)
    expect(restored?.nickname).toBe('Mia')
    expect(restored?.stars).toBe(12)
    expect(restored?.starsTotal).toBe(30)
    expect(await db.progress.where('childId').equals(kid.id).count()).toBe(3)
    expect(await db.attempts.count()).toBe(2)
    expect(await db.sessions.count()).toBe(1)
    expect((await db.family.get('family'))?.parentName).toBe('Testeltern')
  })

  it('wirft lokale Daten weg, die nicht in der Sicherung stehen', async () => {
    await seed()
    const backup = JSON.parse(JSON.stringify(await buildBackup()))
    const extra = await createChild({ nickname: 'Zusatz', avatarId: 'eule', birthYear: null })

    await importBackup(validateBackup(backup), 'replace')
    expect(await db.children.get(extra.id)).toBeUndefined()
    expect(await db.children.count()).toBe(1)
  })
})

describe('Import: zusammenführen', () => {
  it('behält lokale Kinder und ergänzt fehlende', async () => {
    await seed()
    const backup = JSON.parse(JSON.stringify(await buildBackup()))

    await wipe()
    const local = await createChild({ nickname: 'Ben', avatarId: 'baer', birthYear: null })
    await db.family.put((backup.data.family as Family[])[0])

    await importBackup(validateBackup(backup), 'merge')

    expect(await db.children.count()).toBe(2)
    expect((await db.children.get(local.id))?.nickname).toBe('Ben')
    expect((await db.children.toArray()).map((c) => c.nickname).sort()).toEqual(['Ben', 'Mia'])
  })

  it('lässt bei Konflikt den Datensatz mit mehr gesammelten Sternen gewinnen', async () => {
    const kid = await seed()
    const backup = JSON.parse(JSON.stringify(await buildBackup()))

    // lokal weiter gespielt: mehr starsTotal als in der Sicherung
    await db.children.update(kid.id, { stars: 40, starsTotal: 90 })
    await importBackup(validateBackup(backup), 'merge')
    expect((await db.children.get(kid.id))?.starsTotal).toBe(90)

    // umgekehrt: Sicherung ist weiter
    await db.children.update(kid.id, { stars: 1, starsTotal: 5 })
    await importBackup(validateBackup(backup), 'merge')
    expect((await db.children.get(kid.id))?.starsTotal).toBe(30)
  })

  it('hängt Attempts an, ohne Duplikate zu erzeugen', async () => {
    await seed()
    const backup = JSON.parse(JSON.stringify(await buildBackup()))

    await importBackup(validateBackup(backup), 'merge')
    expect(await db.attempts.count()).toBe(2)

    await importBackup(validateBackup(backup), 'merge')
    expect(await db.attempts.count()).toBe(2)
  })

  it('übernimmt den höheren Fortschritt', async () => {
    const kid = await seed()
    await db.progress.put({
      childId: kid.id, worldId: 'zahlen', level: 7, xp: 40, streak: 0, failStreak: 0, recentTimes: [],
    })
    const backup = JSON.parse(JSON.stringify(await buildBackup()))

    await db.progress.put({
      childId: kid.id, worldId: 'zahlen', level: 2, xp: 0, streak: 0, failStreak: 0, recentTimes: [],
    })
    await importBackup(validateBackup(backup), 'merge')
    expect((await db.progress.get([kid.id, 'zahlen']))?.level).toBe(7)
  })
})

describe('daysSince', () => {
  it('meldet null, wenn noch nie gesichert wurde', () => {
    expect(daysSince(0)).toBeNull()
  })
  it('rechnet in ganzen Tagen', () => {
    const now = 1_700_000_000_000
    expect(daysSince(now - 3 * 86_400_000, now)).toBe(3)
    expect(daysSince(now - 1000, now)).toBe(0)
  })
})
