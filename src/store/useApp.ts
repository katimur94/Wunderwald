import { create } from 'zustand'
import { db, DEFAULT_SETTINGS, getFamily } from '../db/db'
import type { Child, Family, FamilySettings } from '../db/types'

interface AppState {
  ready: boolean
  family: Family | null
  children: Child[]
  activeChildId: string | null
  /** true, solange der Elternbereich in dieser Sitzung freigeschaltet ist */
  parentUnlocked: boolean

  load: () => Promise<void>
  refreshChildren: () => Promise<void>
  refreshFamily: () => Promise<void>
  setActiveChild: (id: string | null) => void
  setParentUnlocked: (v: boolean) => void
  saveSettings: (patch: Partial<FamilySettings>) => Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  family: null,
  children: [],
  activeChildId: null,
  parentUnlocked: false,

  async load() {
    const [family, children] = await Promise.all([
      getFamily(),
      db.children.orderBy('createdAt').toArray(),
    ])
    set({ ready: true, family: family ?? null, children })
  },

  async refreshChildren() {
    set({ children: await db.children.orderBy('createdAt').toArray() })
  },

  async refreshFamily() {
    set({ family: (await getFamily()) ?? null })
  },

  setActiveChild(id) {
    set({ activeChildId: id })
  },

  setParentUnlocked(v) {
    set({ parentUnlocked: v })
  },

  async saveSettings(patch) {
    const fam = get().family
    if (!fam) return
    const settings = { ...DEFAULT_SETTINGS, ...fam.settings, ...patch }
    await db.family.update('family', { settings })
    set({ family: { ...fam, settings } })
  },
}))

/** Bequemer Zugriff auf das gerade aktive Kind. */
export function useActiveChild(): Child | null {
  const children = useApp((s) => s.children)
  const activeChildId = useApp((s) => s.activeChildId)
  return children.find((c) => c.id === activeChildId) ?? null
}

export function useSettings(): FamilySettings {
  const family = useApp((s) => s.family)
  return { ...DEFAULT_SETTINGS, ...(family?.settings ?? {}) }
}
