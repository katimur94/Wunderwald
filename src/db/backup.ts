import { db, DB_NAME, SCHEMA_VERSION, updateSettings } from './db'
import type { Attempt, Child, Family, Progress, Session } from './types'

export interface BackupFile {
  app: 'wunderwald'
  schemaVersion: number
  exportedAt: number
  data: {
    family: Family[]
    children: Child[]
    progress: Progress[]
    attempts: Attempt[]
    sessions: Session[]
  }
}

export type ImportMode = 'replace' | 'merge'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function backupFilename(d = new Date()): string {
  return `wunderwald-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

export async function buildBackup(): Promise<BackupFile> {
  const [family, children, progress, attempts, sessions] = await Promise.all([
    db.family.toArray(),
    db.children.toArray(),
    db.progress.toArray(),
    db.attempts.toArray(),
    db.sessions.toArray(),
  ])
  return {
    app: 'wunderwald',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    data: { family, children, progress, attempts, sessions },
  }
}

/** Erzeugt die Datei und stößt den Download an. Kein Netz im Spiel — reines Blob. */
export async function exportBackup(): Promise<string> {
  const backup = await buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const name = backupFilename()
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Etwas Luft lassen, damit der Download sicher gestartet ist.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  await updateSettings({ lastBackupAt: Date.now() })
  return name
}

export class BackupError extends Error {}

/** Prüft eine eingelesene Datei, bevor irgendetwas geschrieben wird. */
export function validateBackup(raw: unknown): BackupFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new BackupError('Die Datei ist keine Wunderwald-Sicherung.')
  }
  const b = raw as Partial<BackupFile>
  if (b.app !== 'wunderwald') {
    throw new BackupError('Die Datei stammt nicht aus Wunderwald.')
  }
  if (typeof b.schemaVersion !== 'number') {
    throw new BackupError('Der Sicherung fehlt die Versionsangabe.')
  }
  if (b.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError(
      'Diese Sicherung stammt aus einer neueren Version von Wunderwald. Bitte zuerst die App aktualisieren.',
    )
  }
  const d = b.data
  if (
    !d ||
    !Array.isArray(d.family) ||
    !Array.isArray(d.children) ||
    !Array.isArray(d.progress) ||
    !Array.isArray(d.attempts) ||
    !Array.isArray(d.sessions)
  ) {
    throw new BackupError('Die Sicherung ist unvollständig oder beschädigt.')
  }
  if (d.family.length === 0) {
    throw new BackupError('In der Sicherung ist kein Eltern-Zugang enthalten.')
  }
  for (const child of d.children) {
    if (!child || typeof child.id !== 'string' || typeof child.nickname !== 'string') {
      throw new BackupError('Ein Kind-Eintrag in der Sicherung ist beschädigt.')
    }
  }
  return b as BackupFile
}

export interface ImportSummary {
  children: number
  attempts: number
  sessions: number
  mode: ImportMode
}

/**
 * `replace`: alles Lokale weg, Sicherung gilt.
 * `merge`:   Kinder per id zusammenführen, bei Konflikt gewinnt der neuere Datensatz.
 *            Attempts/Sessions werden angehängt (Duplikate über Zeitstempel gefiltert).
 */
export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<ImportSummary> {
  const { family, children, progress, attempts, sessions } = backup.data

  await db.transaction(
    'rw',
    [db.family, db.children, db.progress, db.attempts, db.sessions],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.family.clear(),
          db.children.clear(),
          db.progress.clear(),
          db.attempts.clear(),
          db.sessions.clear(),
        ])
        await db.family.bulkPut(family)
        await db.children.bulkPut(children)
        await db.progress.bulkPut(progress)
        await db.attempts.bulkPut(attempts.map((a) => ({ ...a, id: undefined })))
        await db.sessions.bulkPut(sessions.map((s) => ({ ...s, id: undefined })))
        return
      }

      // --- merge ---
      if ((await db.family.count()) === 0) await db.family.bulkPut(family)

      for (const incoming of children) {
        const local = await db.children.get(incoming.id)
        if (!local) {
          await db.children.put(incoming)
          continue
        }
        // "Neuer" = mehr Sterne insgesamt gesammelt; bei Gleichstand der spätere Datensatz.
        const incomingIsNewer =
          incoming.starsTotal > local.starsTotal ||
          (incoming.starsTotal === local.starsTotal && incoming.createdAt > local.createdAt)
        await db.children.put(incomingIsNewer ? incoming : local)
      }

      for (const incoming of progress) {
        const local = await db.progress.get([incoming.childId, incoming.worldId])
        if (!local || incoming.level > local.level || (incoming.level === local.level && incoming.xp > local.xp)) {
          await db.progress.put(incoming)
        }
      }

      const knownAttempts = new Set(
        (await db.attempts.toArray()).map((a) => `${a.childId}|${a.gameId}|${a.ts}`),
      )
      const newAttempts = attempts.filter(
        (a) => !knownAttempts.has(`${a.childId}|${a.gameId}|${a.ts}`),
      )
      await db.attempts.bulkPut(newAttempts.map((a) => ({ ...a, id: undefined })))

      const knownSessions = new Set(
        (await db.sessions.toArray()).map((s) => `${s.childId}|${s.startedAt}`),
      )
      const newSessions = sessions.filter((s) => !knownSessions.has(`${s.childId}|${s.startedAt}`))
      await db.sessions.bulkPut(newSessions.map((s) => ({ ...s, id: undefined })))
    },
  )

  return {
    children: children.length,
    attempts: attempts.length,
    sessions: sessions.length,
    mode,
  }
}

export async function readBackupFile(file: File): Promise<BackupFile> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new BackupError('Die Datei lässt sich nicht lesen. Ist es wirklich eine .json-Sicherung?')
  }
  return validateBackup(parsed)
}

/** Tage seit der letzten Sicherung, oder null wenn noch nie gesichert wurde. */
export function daysSince(ts: number, now = Date.now()): number | null {
  if (!ts) return null
  return Math.floor((now - ts) / 86_400_000)
}

export const BACKUP_DB_NAME = DB_NAME
