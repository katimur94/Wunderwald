import type { ReactNode } from 'react'
import type { WorldId } from '../db/types'
import type { Rng } from './rng'

export interface GameTask<TData = unknown> {
  /** was gerendert wird */
  data: TData
  /** korrekte Lösung */
  answer: unknown
  /** was Funkel vorliest */
  speak: string
}

/** Meldung des Spiels an die GameShell, wenn eine Aufgabe beendet ist. */
export interface AnswerReport {
  correct: boolean
  usedHint: boolean
  timeMs: number
}

export interface GameComponentProps<TTask extends GameTask = GameTask> {
  task: TTask
  difficulty: number
  /** Aufgabe ist gelöst (oder mit Hilfe gelöst) → nächste Aufgabe */
  onDone: (report: AnswerReport) => void
  /** Zwischenmeldung: falsch geraten. Die Shell reagiert mit Trost/Hilfe. */
  onWrong: (attemptNo: number) => void
  /** Funkel spricht etwas (Sprechblase + TTS) */
  say: (text: string) => void
  /** true, sobald die Shell die Lösung zeigen will (2. Fehler) */
  revealSolution: boolean
  /** Wievielte Aufgabe der Runde, ab 0 — für Spiele mit sichtbarem Weg. */
  taskNo?: number
  /** Wie viele Aufgaben die Runde hat. */
  tasksTotal?: number
}

export interface GameModule<TTask extends GameTask = GameTask> {
  id: string
  worldId: WorldId
  title: string
  /** Kurzbeschreibung für den Welt-Screen und den Elternbereich */
  subtitle: string
  icon: ReactNode
  generateTask(difficulty: number, rng: Rng): TTask
  Component: React.FC<GameComponentProps<TTask>>
  /** Memory zählt anders: 1 Runde = 1 Brett statt 6 Aufgaben. */
  tasksPerRound?: number
  /**
   * true, wenn das Spiel die gesamte Spielfläche selbst aufteilt (Memory).
   * Die GameShell zentriert dann nicht, sondern gibt die volle Höhe weiter.
   */
  fillsStage?: boolean
  /**
   * Auf welches Spiel der Versuch gebucht wird. Nur die Mix-Runde braucht
   * das: Sie zieht ihre Aufgaben aus anderen Spielen, und der Versuch soll
   * dort landen, wo die Aufgabe herkommt.
   */
  attemptGameId?(task: TTask): string
}
