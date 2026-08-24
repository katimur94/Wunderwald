/**
 * Einziger Ort, an dem Spiele registriert werden.
 * Import-Reihenfolge = Reihenfolge der Kacheln im Welt-Screen.
 */
import { registerGame } from './registry'
import { zahlenErnte } from './zahlen-ernte/zahlen-ernte'
import { rechenBruecke } from './rechen-bruecke/rechen-bruecke'
import { buchstabenFang } from './buchstaben-fang/buchstaben-fang'

let done = false

export function registerAllGames() {
  if (done) return
  done = true
  registerGame(zahlenErnte)
  registerGame(rechenBruecke)
  registerGame(buchstabenFang)
}

registerAllGames()

export * from './registry'
