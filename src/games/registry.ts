import type { GameModule, GameTask } from './types'
import type { WorldId } from '../db/types'

/**
 * Spiel-Registry: id → Modul. Bewusst offen für weitere Welten (V2),
 * ohne dass Screens angepasst werden müssen.
 *
 * Nach außen sind die Module typ-erased: die GameShell kennt die konkrete
 * Aufgabenform nicht, jedes Spiel kennt seine eigene.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyGameModule = GameModule<GameTask<any>>

const registry = new Map<string, AnyGameModule>()

export function registerGame(mod: AnyGameModule) {
  registry.set(mod.id, mod)
}

export function getGame(id: string): AnyGameModule | undefined {
  return registry.get(id)
}

export function gamesOfWorld(worldId: WorldId): AnyGameModule[] {
  return [...registry.values()].filter((g) => g.worldId === worldId)
}

export function allGames(): AnyGameModule[] {
  return [...registry.values()]
}
