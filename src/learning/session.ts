import { db } from '../db/db'
import type { Session } from '../db/types'

/** Beginn des heutigen Tages als Zeitstempel. */
export function startOfToday(now = Date.now()): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function dayKey(ts = Date.now()): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Aktive Spielzeit des Kindes heute, in Minuten. */
export async function playedTodayMin(childId: string, now = Date.now()): Promise<number> {
  const from = startOfToday(now)
  const sessions = await db.sessions.where('childId').equals(childId).toArray()
  const ms = sessions
    .filter((s) => s.startedAt >= from)
    .reduce((sum, s) => sum + Math.max(0, (s.endedAt ?? now) - s.startedAt), 0)
  return Math.round(ms / 60_000)
}

export async function isDailyLimitReached(
  childId: string,
  limitMin: number,
  now = Date.now(),
): Promise<boolean> {
  if (!limitMin) return false
  return (await playedTodayMin(childId, now)) >= limitMin
}

/** Öffnet eine Session und liefert eine Funktion zum Schließen. */
export async function openSession(childId: string): Promise<number> {
  const session: Session = { childId, startedAt: Date.now(), endedAt: null, gamesPlayed: 0 }
  return (await db.sessions.add(session)) as number
}

export async function closeSession(id: number, gamesPlayed: number): Promise<void> {
  await db.sessions.update(id, { endedAt: Date.now(), gamesPlayed })
}

/** Spielzeit pro Tag der letzten n Tage — für den Elternbereich. */
export async function weeklyMinutes(childId: string, days = 7, now = Date.now()) {
  const sessions = await db.sessions.where('childId').equals(childId).toArray()
  const out: { day: string; minutes: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = startOfToday(now) - i * 86_400_000
    const dayEnd = dayStart + 86_400_000
    const ms = sessions
      .filter((s) => s.startedAt >= dayStart && s.startedAt < dayEnd)
      .reduce((sum, s) => sum + Math.max(0, (s.endedAt ?? s.startedAt) - s.startedAt), 0)
    out.push({ day: dayKey(dayStart), minutes: Math.round(ms / 60_000) })
  }
  return out
}
