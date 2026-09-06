import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, randInt, shuffle, type Rng } from '../rng'
import { ChoiceRow } from '../../components/ChoiceRow'
import { Uhr } from '../../components/Uhr'
import { uhrText } from '../../learning/wissen'
import { sfx } from '../../audio/AudioManager'
import { sprich } from '../../audio/tts'
import './zeit-turm.css'

/* ------------------------------------------------------------------ */
/* Aufgabe                                                             */
/* ------------------------------------------------------------------ */

export type TurmMode =
  | 'lesen' // Eine große Uhr, drei Zeiten zur Auswahl
  | 'finden' // Eine Zeit als Text, drei Uhren zur Auswahl

export interface Zeit {
  stunde: number
  minute: number
}

export interface TurmData {
  mode: TurmMode
  zeit: Zeit
  /** Bei 'lesen': Zeit-Texte; bei 'finden': Uhren als "h:mm" */
  optionen: string[]
  uhren?: Zeit[]
  ziffern: boolean
  frage: string
}

export type TurmTask = GameTask<TurmData>

export function zeitKey(z: Zeit): string {
  return `${z.stunde}:${String(z.minute).padStart(2, '0')}`
}

/** Welche Minuten auf dieser Stufe vorkommen. */
export function minutenFuer(lvl: number): number[] {
  if (lvl <= 4) return [0]
  if (lvl <= 6) return [0, 30]
  if (lvl <= 8) return [0, 15, 30, 45]
  return [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
}

function andereZeit(rng: Rng, zeit: Zeit, minuten: number[], schwer: boolean): Zeit {
  // Schwere Ablenker: gleiche Stunde, andere Minute — oder gleiche Minute, Nachbarstunde.
  if (schwer && minuten.length > 1 && rng() < 0.5) {
    const m = pick(rng, minuten.filter((x) => x !== zeit.minute))
    return { stunde: zeit.stunde, minute: m }
  }
  if (schwer && rng() < 0.5) {
    const s = ((zeit.stunde - 1 + pick(rng, [1, 11])) % 12) + 1
    return { stunde: s, minute: zeit.minute }
  }
  return { stunde: randInt(rng, 1, 12), minute: pick(rng, minuten) }
}

export function generateTask(difficulty: number, rng: Rng): TurmTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))
  const minuten = minutenFuer(lvl)
  const zeit: Zeit = { stunde: randInt(rng, 1, 12), minute: pick(rng, minuten) }
  const ziffern = lvl <= 8
  const schwer = lvl >= 5
  const ablenker: Zeit[] = []
  let schutz = 0
  while (ablenker.length < 2 && schutz++ < 60) {
    const a = andereZeit(rng, zeit, minuten, schwer)
    if (zeitKey(a) === zeitKey(zeit)) continue
    if (ablenker.some((b) => zeitKey(b) === zeitKey(a))) continue
    ablenker.push(a)
  }
  const mode: TurmMode = lvl >= 3 && rng() < 0.4 ? 'finden' : 'lesen'
  const alle = shuffle(rng, [zeit, ...ablenker])
  if (mode === 'finden') {
    const text = uhrText(zeit.stunde, zeit.minute)
    return {
      data: {
        mode,
        zeit,
        optionen: alle.map(zeitKey),
        uhren: alle,
        ziffern,
        frage: `Welche Uhr zeigt ${text}?`,
      },
      answer: zeitKey(zeit),
      speak: `Welche Uhr zeigt ${text}? Tippe die richtige Uhr.`,
    }
  }
  return {
    data: {
      mode,
      zeit,
      optionen: alle.map((z) => uhrText(z.stunde, z.minute)),
      ziffern,
      frage: 'Wie spät ist es?',
    },
    answer: uhrText(zeit.stunde, zeit.minute),
    speak:
      lvl <= 4
        ? 'Schau auf die Uhr. Der kurze Zeiger zeigt die Stunde. Wie spät ist es?'
        : 'Schau auf die Uhr. Wie spät ist es?',
  }
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function ZeitTurm({ task, onDone, onWrong, revealSolution }: GameComponentProps<TurmTask>) {
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

  return (
    <>
      <p className="ww-turm__frage">{d.frage}</p>

      <div className="ww-turm__turm">
        <span className="ww-turm__dach" aria-hidden="true" />
        {d.mode === 'lesen' ? (
          <motion.button
            type="button"
            className="ww-turm__uhrknopf"
            onClick={() => {
              sfx('pop')
              sprich(task.speak)
            }}
            aria-label="Frage noch einmal hören"
            initial={{ rotate: -4 }}
            animate={{ rotate: 0 }}
          >
            <Uhr stunde={d.zeit.stunde} minute={d.zeit.minute} size={180} ziffern={d.ziffern} />
          </motion.button>
        ) : (
          <span className="ww-turm__zeittext">{uhrText(d.zeit.stunde, d.zeit.minute)}</span>
        )}
        <span className="ww-turm__tor" aria-hidden="true" />
      </div>

      {/* Drei Antworten teilen sich eine Reihe — sonst wandert die dritte unter die Falz. */}
      <div className={`ww-turm__wahlen ww-turm__wahlen--${d.mode === 'finden' ? 'uhren' : 'texte'}`}>
        <ChoiceRow
          options={d.optionen}
          onPick={choose}
          wrongValue={wrongPick}
          highlight={revealSolution ? (task.answer as string) : null}
          ariaLabel={(v) => {
            if (d.mode !== 'finden') return v
            const z = d.uhren?.[d.optionen.indexOf(v)]
            return z ? `Uhr ${d.optionen.indexOf(v) + 1}: ${uhrText(z.stunde, z.minute)}` : v
          }}
          render={(v) => {
            if (d.mode === 'finden') {
              const z = d.uhren?.[d.optionen.indexOf(v)]
              return z ? <Uhr stunde={z.stunde} minute={z.minute} size={86} ziffern={d.ziffern} className="ww-turm__wahluhr" /> : v
            }
            return <span className="ww-turm__zeit">{v}</span>
          }}
        />
      </div>
    </>
  )
}

export const zeitTurm: GameModule<TurmTask> = {
  id: 'zeit-turm',
  worldId: 'entdecker',
  title: 'Zeit-Turm',
  subtitle: 'Die Uhr lesen: volle Stunden, halbe, Viertel und Minuten',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="24" y="26" width="32" height="48" fill="#D9B98C" stroke="#2E4034" strokeWidth="4" />
      <path d="M18 28 L40 8 L62 28 Z" fill="#E4634F" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="40" cy="46" r="12" fill="#FBFDF8" stroke="#2E4034" strokeWidth="3" />
      <path d="M40 46 L40 38 M40 46 L46 49" stroke="#2E4034" strokeWidth="3" strokeLinecap="round" />
      <rect x="35" y="62" width="10" height="12" rx="4" fill="#2E4034" />
    </svg>
  ),
  generateTask,
  Component: ZeitTurm,
}
