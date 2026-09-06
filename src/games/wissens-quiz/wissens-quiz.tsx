import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask, TaskContext } from '../types'
import type { Rng } from '../rng'
import { ChoiceRow } from '../../components/ChoiceRow'
import { Uhr } from '../../components/Uhr'
import { sprich } from '../../audio/tts'
import { sfx } from '../../audio/AudioManager'
import {
  frageGedaechtnis,
  zieheWissensFrage,
  type WissensThema,
} from '../../learning/wissen'
import './wissens-quiz.css'

/* ------------------------------------------------------------------ */
/* Aufgabe                                                             */
/* ------------------------------------------------------------------ */

export interface QuizData {
  thema: WissensThema
  frage: string
  bild?: string
  uhr?: { stunde: number; minute: number }
  optionen: string[]
  namen?: Record<string, string>
}

export type QuizTask = GameTask<QuizData>

export function generateTask(difficulty: number, rng: Rng, ctx?: TaskContext): QuizTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))
  const gedaechtnis = ctx?.childId ? frageGedaechtnis(ctx.childId) : undefined
  const f = zieheWissensFrage(lvl, rng, gedaechtnis)
  return {
    data: { thema: f.thema, frage: f.frage, bild: f.bild, uhr: f.uhr, optionen: f.optionen, namen: f.namen },
    answer: f.antwort,
    speak: f.speak,
  }
}

const THEMA_SYMBOL: Record<WissensThema, string> = {
  tiere: '🐾',
  natur: '🌿',
  farben: '🎨',
  koerper: '🫀',
  alltag: '🏠',
  jahr: '📅',
  verkehr: '🚦',
  uhr: '⏰',
  welt: '🌍',
  formen: '🔷',
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function istWort(o: string): boolean {
  return /^[\p{L}\p{N}\s:.,'’-]+$/u.test(o) && [...o].length > 2
}

function WissensQuiz({ task, difficulty, onDone, onWrong, revealSolution }: GameComponentProps<QuizTask>) {
  const [tries, setTries] = useState(0)
  const [start, setStart] = useState(() => Date.now())
  const [wrongPick, setWrongPick] = useState<string | null>(null)
  const d = task.data

  useEffect(() => {
    setTries(0)
    setWrongPick(null)
    setStart(Date.now())
  }, [task])

  function choose(v: string) {
    if (v === task.answer) {
      onDone({ correct: true, usedHint: tries >= 2, timeMs: Date.now() - start })
      return
    }
    const n = tries + 1
    setTries(n)
    setWrongPick(v)
    setTimeout(() => setWrongPick(null), 500)
    onWrong(n)
  }

  const hatWorte = d.optionen.some(istWort)

  return (
    <>
      <div className="ww-quiz__karte">
        <span className="ww-quiz__thema" aria-hidden="true">
          {THEMA_SYMBOL[d.thema]}
        </span>
        {d.uhr ? (
          <Uhr stunde={d.uhr.stunde} minute={d.uhr.minute} size={140} ziffern={difficulty < 9} />
        ) : d.bild ? (
          <motion.button
            type="button"
            className="ww-quiz__bild"
            onClick={() => {
              sfx('pop')
              sprich(task.speak)
            }}
            aria-label="Frage noch einmal hören"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            {d.bild}
          </motion.button>
        ) : null}
        <p className={`ww-quiz__frage ${d.frage.length > 26 ? 'ww-quiz__frage--lang' : ''}`}>{d.frage}</p>
      </div>

      <ChoiceRow
        options={d.optionen}
        onPick={choose}
        wrongValue={wrongPick}
        highlight={revealSolution ? (task.answer as string) : null}
        variant="zahl"
        ariaLabel={(v) => d.namen?.[v] ?? v}
        render={(v) =>
          istWort(v) ? <span className="ww-quiz__wort">{v}</span> : <span className="ww-quiz__symbol">{v}</span>
        }
      />

      {hatWorte && (
        <button
          type="button"
          className="ww-quiz__vorlesen"
          onClick={() => {
            sfx('click')
            sprich(d.optionen.map((o) => d.namen?.[o] ?? o).join(', '))
          }}
        >
          <span aria-hidden="true">🔊</span> Antworten vorlesen
        </button>
      )}
    </>
  )
}

export const wissensQuiz: GameModule<QuizTask> = {
  id: 'wissens-quiz',
  worldId: 'entdecker',
  title: 'Wissens-Quiz',
  subtitle: 'Tiere, Natur, Uhr und Alltag — was weißt du schon?',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="32" fill="#FFF0CB" stroke="#2E4034" strokeWidth="4" />
      <text x="40" y="52" fontSize="36" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">?</text>
      <circle cx="16" cy="18" r="7" fill="#6FB5C9" stroke="#2E4034" strokeWidth="3" />
      <circle cx="66" cy="60" r="7" fill="#F6BD41" stroke="#2E4034" strokeWidth="3" />
      <circle cx="64" cy="16" r="5" fill="#E4634F" stroke="#2E4034" strokeWidth="3" />
    </svg>
  ),
  generateTask,
  Component: WissensQuiz,
}
