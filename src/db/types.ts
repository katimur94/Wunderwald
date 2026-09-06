/** Alle Typen der lokalen Datenbank. Nichts hiervon verlässt jemals das Gerät. */

export type WorldId = 'zahlen' | 'buchstaben' | 'logik' | 'entdecker'
export const WORLD_IDS: WorldId[] = ['zahlen', 'buchstaben', 'logik', 'entdecker']

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

/** Eingelagertes Objekt: bleibt besessen, behält sein Wachstumsstadium. */
export interface InventoryItem {
  objectId: string
  growthDays: number
}

/* ---------- ab Schema-Version 4: der Garten ---------- */

export interface GardenBed {
  /** Platz im Garten, 0-basiert */
  slot: number
  /** Pflanzenart (siehe garden/arten.ts) */
  speciesId: string
  plantedAt: number
  /** Wachstum 0 … 1 (1 = reif) */
  growth: number
  /** Wasser 0 … 100 */
  water: number
  /** Bis hierhin wurde die Zeit schon verrechnet */
  updatedAt: number
  /** Unkraut im Beet, 0 … 3 */
  weeds: number
  /** Sitzt gerade eine Schnecke dran? */
  snail: boolean
  /** Wie oft schon geerntet (mehrjährige Pflanzen) */
  harvests: number
  /** Dünger wirkt bis zu diesem Zeitpunkt */
  fertilizedUntil?: number
}

export interface GardenDecor {
  slot: number
  decorId: string
}

export interface Garden {
  beds: GardenBed[]
  decor: GardenDecor[]
  /** Wie viele Beete offen sind */
  bedCount: number
  /** Kompost aus gejätetem Unkraut — wird zu Dünger */
  compost: number
  harvestsTotal: number
  /** Tiere, die schon einmal zu Besuch waren (Ids aus garden/arten.ts) */
  visitors: string[]
  /** Pflanzen, die das Kind schon einmal gepflanzt hat — fürs Gartenbuch */
  known?: string[]
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

  /* ---------- ab Schema-Version 2 ---------- */

  /** Kiste: eingelagerte Objekte, kosten beim Zurückholen nichts */
  inventory?: InventoryItem[]
  /**
   * Die letzten Gießtage (dayKey), ältester zuerst. Eine Quelle statt zwei:
   * „heute schon gegossen?" ist der letzte Eintrag, und der Elternbereich
   * zählt darin die Tage der Woche. Bewusst gedeckelt — mehr als zwei
   * Wochen braucht niemand zu speichern.
   */
  wateredDays?: string[]
  /** An wie vielen verschiedenen Tagen das Kind im Wunderwald war */
  forestDays?: number
  /** Tag des letzten Besuchs (dayKey) */
  lastVisitDay?: string

  /* ---------- ab Schema-Version 4 ---------- */

  /** Der Garten. Fehlt er (altes Kind), wird er beim ersten Öffnen aus dem Wald gebaut. */
  garden?: Garden
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
