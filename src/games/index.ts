/**
 * Einziger Ort, an dem Spiele registriert werden.
 * Import-Reihenfolge = Reihenfolge der Kacheln im Welt-Screen.
 */
import { registerGame } from './registry'
import { dummyGame } from './dummy/dummy'

let done = false

export function registerAllGames() {
  if (done) return
  done = true
  registerGame(dummyGame)
}

registerAllGames()

export * from './registry'
