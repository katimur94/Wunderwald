/**
 * Einziger Ort, an dem Spiele registriert werden.
 * Import-Reihenfolge = Reihenfolge der Kacheln im Welt-Screen.
 */
import { registerGame } from './registry'
import { zahlenErnte } from './zahlen-ernte/zahlen-ernte'
import { rechenBruecke } from './rechen-bruecke/rechen-bruecke'
import { buchstabenFang } from './buchstaben-fang/buchstaben-fang'
import { wortBaukasten } from './wort-baukasten/wort-baukasten'
import { musterWeber } from './muster-weber/muster-weber'
import { paarFinder } from './paar-finder/paar-finder'
import { zahlenWaage } from './zahlen-waage/zahlen-waage'
import { reimBoot } from './reim-boot/reim-boot'
import { sortierWerkstatt } from './sortier-werkstatt/sortier-werkstatt'
import { makeMixModule } from './mix'
import { WORLD_IDS } from '../db/types'

let done = false

export function registerAllGames() {
  if (done) return
  done = true
  registerGame(zahlenErnte)
  registerGame(rechenBruecke)
  registerGame(buchstabenFang)
  registerGame(wortBaukasten)
  registerGame(musterWeber)
  registerGame(paarFinder)
  registerGame(zahlenWaage)
  registerGame(reimBoot)
  registerGame(sortierWerkstatt)
  // Zuletzt: die Mix-Runde jeder Welt zieht aus allem, was vorher da ist.
  WORLD_IDS.forEach((w) => registerGame(makeMixModule(w)))
}

registerAllGames()

export * from './registry'
