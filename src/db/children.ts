import { db } from './db'
import { startLevelForBirthYear } from '../learning/adaptivity'
import { leererGarten } from '../garden/garden'
import type { Child, Progress, WorldId } from './types'
import { WORLD_IDS } from './types'

export interface NewChildInput {
  nickname: string
  avatarId: string
  birthYear: number | null
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/** Legt Kind + Startfortschritt für alle drei Welten in einer Transaktion an. */
export async function createChild(input: NewChildInput): Promise<Child> {
  const child: Child = {
    id: makeId(),
    nickname: input.nickname.trim(),
    avatarId: input.avatarId,
    birthYear: input.birthYear,
    createdAt: Date.now(),
    stars: 0,
    starsTotal: 0,
    companion: { level: 1, xp: 0, outfitId: null, ownedOutfits: [] },
    forest: [],
    milestones: [],
    toured: false,
    inventory: [],
    wateredDays: [],
    forestDays: 0,
    lastVisitDay: '',
    garden: leererGarten(),
  }
  const level = startLevelForBirthYear(input.birthYear)
  const progress: Progress[] = WORLD_IDS.map((worldId: WorldId) => ({
    childId: child.id,
    worldId,
    level,
    xp: 0,
    streak: 0,
    failStreak: 0,
    recentTimes: [],
  }))

  await db.transaction('rw', [db.children, db.progress], async () => {
    await db.children.add(child)
    await db.progress.bulkAdd(progress)
  })
  return child
}

/** Löscht ein Kind samt allen Daten. Wird im Elternbereich doppelt bestätigt. */
export async function deleteChild(childId: string): Promise<void> {
  await db.transaction('rw', [db.children, db.progress, db.attempts, db.sessions], async () => {
    await db.children.delete(childId)
    await db.progress.where('childId').equals(childId).delete()
    await db.attempts.where('childId').equals(childId).delete()
    await db.sessions.where('childId').equals(childId).delete()
  })
}

export async function updateChild(childId: string, patch: Partial<Child>): Promise<void> {
  await db.children.update(childId, patch)
}

/**
 * Fehlt einer Welt der Fortschritt (Kind aus einer Version mit drei Welten,
 * die vierte kam später), beginnt sie wie beim Anlegen: auf der Stufe, die
 * zum Geburtsjahr passt — nicht auf Stufe 1.
 */
async function frischerFortschritt(childId: string, worldId: WorldId): Promise<Progress> {
  const child = await db.children.get(childId)
  return {
    childId,
    worldId,
    level: startLevelForBirthYear(child?.birthYear ?? null),
    xp: 0,
    streak: 0,
    failStreak: 0,
    recentTimes: [],
  }
}

export async function getProgress(childId: string, worldId: WorldId): Promise<Progress> {
  const found = await db.progress.get([childId, worldId])
  if (found) return found
  const fresh = await frischerFortschritt(childId, worldId)
  await db.progress.put(fresh)
  return fresh
}

export async function getAllProgress(childId: string): Promise<Record<WorldId, Progress>> {
  const rows = await db.progress.where('childId').equals(childId).toArray()
  const out = {} as Record<WorldId, Progress>
  for (const w of WORLD_IDS) {
    const row = rows.find((r) => r.worldId === w)
    if (row) {
      out[w] = row
    } else {
      out[w] = await frischerFortschritt(childId, w)
      await db.progress.put(out[w])
    }
  }
  return out
}
