import Dexie, { type Table } from 'dexie'
import type { Attempt, Child, Family, FamilySettings, Progress, Session, WorldId } from './types'

export const DB_NAME = 'wunderwald'
export const SCHEMA_VERSION = 3

export class WunderwaldDB extends Dexie {
  family!: Table<Family, string>
  children!: Table<Child, string>
  progress!: Table<Progress, [string, WorldId]>
  attempts!: Table<Attempt, number>
  sessions!: Table<Session, number>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores({
      family: 'id',
      children: 'id, createdAt',
      progress: '[childId+worldId], childId',
      attempts: '++id, childId, gameId, ts',
      sessions: '++id, childId, startedAt',
    })

    /*
     * Version 2 fügt der Kind-Tabelle nur Felder hinzu — die Indizes bleiben
     * gleich. Bestehende Kinder bekommen die Felder mit sinnvollen Vorgaben,
     * damit alter Bestand ohne Sonderfälle weiterläuft.
     */
    this.version(2)
      .stores({
        family: 'id',
        children: 'id, createdAt',
        progress: '[childId+worldId], childId',
        attempts: '++id, childId, gameId, ts',
        sessions: '++id, childId, startedAt',
      })
      .upgrade((tx) =>
        tx
          .table('children')
          .toCollection()
          .modify((kind: Record<string, unknown>) => {
            if (!Array.isArray(kind.inventory)) kind.inventory = []
            if (typeof kind.lastWatered !== 'string') kind.lastWatered = ''
            if (typeof kind.forestDays !== 'number') kind.forestDays = 0
            if (typeof kind.lastVisitDay !== 'string') kind.lastVisitDay = ''
          }),
      )

    /*
     * Version 3 macht aus dem einzelnen Gießtag ein kurzes Tagebuch. Der
     * Elternbereich zeigt die Gießtage der Woche, und dafür reicht ein
     * einzelnes Datum nicht. Das alte Feld wandert in die Liste und geht
     * danach weg — zwei Quellen fürs selbe wären eine zu viel.
     */
    this.version(3)
      .stores({
        family: 'id',
        children: 'id, createdAt',
        progress: '[childId+worldId], childId',
        attempts: '++id, childId, gameId, ts',
        sessions: '++id, childId, startedAt',
      })
      .upgrade((tx) =>
        tx
          .table('children')
          .toCollection()
          .modify((kind: Record<string, unknown>) => {
            if (!Array.isArray(kind.wateredDays)) {
              const alt = typeof kind.lastWatered === 'string' ? kind.lastWatered : ''
              kind.wateredDays = alt ? [alt] : []
            }
            delete kind.lastWatered
          }),
      )
  }
}

export const db = new WunderwaldDB()

export const DEFAULT_SETTINGS: FamilySettings = {
  ttsOn: true,
  soundOn: true,
  dailyLimitMin: 0,
  pinFails: 0,
  pinLockedUntil: 0,
  lastBackupAt: 0,
  installHintDismissed: false,
}

export async function getFamily(): Promise<Family | undefined> {
  return db.family.get('family')
}

export async function isOnboarded(): Promise<boolean> {
  return (await db.family.count()) > 0
}

export async function updateSettings(patch: Partial<FamilySettings>): Promise<void> {
  const fam = await getFamily()
  if (!fam) return
  await db.family.update('family', { settings: { ...fam.settings, ...patch } })
}
