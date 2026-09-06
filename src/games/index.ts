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
import { zahlenSprung } from './zahlen-sprung/zahlen-sprung'
import { reimBoot } from './reim-boot/reim-boot'
import { sortierWerkstatt } from './sortier-werkstatt/sortier-werkstatt'
import { flitzerRallye } from './flitzer-rallye/flitzer-rallye'
import { wissensQuiz } from './wissens-quiz/wissens-quiz'
import { schattenSuche } from './schatten-suche/schatten-suche'
import { zeitTurm } from './zeit-turm/zeit-turm'
import { ballonPlatzer } from './ballon-platzer/ballon-platzer'
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
  registerGame(zahlenSprung)
  registerGame(reimBoot)
  registerGame(sortierWerkstatt)
  // Entdecker-Wiese: das Rennen zuerst, dann Wissen, Wahrnehmung, Uhr, Action.
  registerGame(flitzerRallye)
  registerGame(wissensQuiz)
  registerGame(schattenSuche)
  registerGame(zeitTurm)
  registerGame(ballonPlatzer)
  // Zuletzt: die Mix-Runde jeder Welt zieht aus allem, was vorher da ist.
  WORLD_IDS.forEach((w) => registerGame(makeMixModule(w)))
}

registerAllGames()

export * from './registry'
