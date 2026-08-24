/** Alle Typen der lokalen Datenbank. Nichts hiervon verlässt jemals das Gerät. */

export type WorldId = 'zahlen' | 'buchstaben' | 'logik'
export const WORLD_IDS: WorldId[] = ['zahlen', 'buchstaben', 'logik']

export interface FamilySettings {
  ttsOn: boolean
  soundOn: boolean
  /** 0 = aus, sonst Minuten pro Tag und Kind */
  dailyLimitMin: number
  /** Fehlversuche seit der letzten korrekten PIN-Eingabe */
  pinFails: number
  /** Sperre bis zu diesem Zeitstempel (0 = frei) */
  pinLockedUntil: number
  /** Zeitpunkt der letzten Sicherung (0 = noch nie) */
  lastBackupAt: number
  /** iOS-Installationshinweis bereits weggeklickt? */
  installHintDismissed: boolean
}

export interface Family {
  id: 'family'
  parentName: string
  pinHash: string // hex
  pinSalt: string // hex
  recoveryHash: string // hex — Hash des Wiederherstellungssatzes
  recoverySalt: string // hex
  createdAt: number
  settings: FamilySettings
}

export interface ForestItem {
  slot: number
  objectId: string
  placedAt: number
  /** An wie vielen verschiedenen Tagen das Kind seit dem Pflanzen gespielt hat */
  growthDays: number
  /** Tag (YYYY-MM-DD) der letzten Wachstums-Gutschrift */
  lastGrowthDay: string
}

export interface Companion {
  level: number
  xp: number
  outfitId: string | null
  /** gekaufte/erhaltene Outfits */
  ownedOutfits: string[]
}

export interface Child {
  id: string
  nickname: string
  avatarId: string
  birthYear: number | null
  createdAt: number
  stars: number
  starsTotal: number
  companion: Companion
  forest: ForestItem[]
  /** Fortschritt der Tagesabenteuer: 'YYYY-MM-DD' → erledigte Quest-Ids */
  quests?: { day: string; done: string[]; claimed: boolean }
  /** Meilensteine, die bereits gefeiert wurden (z. B. 'zahlen-4', 'forest-10') */
  milestones?: string[]
  /** true, wenn die Mini-Tour auf der Weltkarte schon lief */
  toured?: boolean
}

export interface Progress {
  childId: string
  worldId: WorldId
  /** 1..10, sichtbare Stufe */
  level: number
  /** Feinfortschritt innerhalb der Stufe */
  xp: number
  /** richtige in Folge */
  streak: number
  failStreak: number
  /** Zeiten der letzten Aufgaben in ms – für die "im Schnitt < 8 s"-Regel */
  recentTimes: number[]
}

export interface Attempt {
  id?: number
  childId: string
  worldId: string
  gameId: string
  difficulty: number
  correct: boolean
  usedHint: boolean
  timeMs: number
  ts: number
}

export interface Session {
  id?: number
  childId: string
  startedAt: number
  endedAt: number | null
  gamesPlayed: number
}
