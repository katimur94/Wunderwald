import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, sample, shuffle, type Rng } from '../rng'
import { ART_KATEGORIEN, type Ding } from '../../learning/sortier-daten'
import { ChoiceRow } from '../../components/ChoiceRow'
import { sfx } from '../../audio/AudioManager'
import { sprich } from '../../audio/tts'
import './schatten-suche.css'

/* ------------------------------------------------------------------ */
/* Aufgabe                                                             */
/* ------------------------------------------------------------------ */

export type SchattenMode =
  | 'schatten' // Ein Schatten oben, bunte Bilder unten
  | 'umgekehrt' // Ein buntes Bild oben, Schatten unten

export interface SchattenData {
  mode: SchattenMode
  ziel: Ding
  /** Emojis der Auswahl */
  optionen: string[]
  /** Namen je Emoji, für Funkel und Screenreader */
  namen: Record<string, string>
  /** Schatten gespiegelt (Stufe 8+) */
  gespiegelt: boolean
  /** Schatten gedreht in Grad (Stufe 9+) */
  drehung: number
  frage: string
}

export type SchattenTask = GameTask<SchattenData>

/** Alle Dinge mit ihrer Kategorie — Distraktoren kommen je nach Stufe aus derselben oder einer fremden. */
const ALLE: { ding: Ding; kategorie: string }[] = ART_KATEGORIEN.flatMap((k) =>
  k.dinge.map((ding) => ({ ding, kategorie: k.id })),
)

export function generateTask(difficulty: number, rng: Rng): SchattenTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))
  const ziel = pick(rng, ALLE)
  const anzahl = lvl <= 3 ? 3 : 4
  const gleicheKategorie = lvl >= 3
  const pool = ALLE.filter(
    (x) =>
      x.ding.emoji !== ziel.ding.emoji &&
      (gleicheKategorie ? x.kategorie === ziel.kategorie : x.kategorie !== ziel.kategorie),
  )
  const ablenker = sample(rng, pool, anzahl - 1)
  // Falls eine Kategorie zu klein ist, mit fremden auffüllen.
  if (ablenker.length < anzahl - 1) {
    const rest = ALLE.filter((x) => x.ding.emoji !== ziel.ding.emoji && !ablenker.includes(x))
    ablenker.push(...sample(rng, rest, anzahl - 1 - ablenker.length))
  }
  const auswahl = shuffle(rng, [ziel, ...ablenker])
  const mode: SchattenMode = lvl >= 6 && rng() < 0.45 ? 'umgekehrt' : 'schatten'
  const gespiegelt = lvl >= 8 && rng() < 0.5
  const drehung = lvl >= 9 ? pick(rng, [0, 0, -25, 25, 90, -90]) : 0
  const namen = Object.fromEntries(auswahl.map((x) => [x.ding.emoji, x.ding.name]))
  return {
    data: {
      mode,
      ziel: ziel.ding,
      optionen: auswahl.map((x) => x.ding.emoji),
      namen,
      gespiegelt,
      drehung,
      frage: mode === 'schatten' ? 'Wessen Schatten ist das?' : `Welcher Schatten gehört zu: ${ziel.ding.name}?`,
    },
    answer: ziel.ding.emoji,
    speak:
      mode === 'schatten'
        ? 'Schau dir den Schatten genau an. Welches Bild passt dazu?'
        : `Welcher Schatten gehört zu ${ziel.ding.mitArtikel}? Tippe den richtigen Schatten.`,
  }
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function Schatten({ emoji, gespiegelt, drehung, size }: { emoji: string; gespiegelt: boolean; drehung: number; size: 'gross' | 'klein' }) {
  return (
    <span
      className={`ww-schatten ww-schatten--${size}`}
      style={{ transform: `${gespiegelt ? 'scaleX(-1) ' : ''}rotate(${drehung}deg)` }}
      aria-hidden="true"
    >
      {emoji}
    </span>
  )
}

function SchattenSuche({ task, onDone, onWrong, revealSolution }: GameComponentProps<SchattenTask>) {
  const [tries, setTries] = useState(0)
  const [start, setStart] = useState(() => Date.now())
  const [wrongPick, setWrongPick] = useState<string | null>(null)
  const [geloest, setGeloest] = useState(false)
  const d = task.data

  useEffect(() => {
    setTries(0)
    setWrongPick(null)
    setGeloest(false)
    setStart(Date.now())
  }, [task])

  function choose(v: string) {
    if (geloest) return
    if (v === task.answer) {
      setGeloest(true)
      sfx('pop')
      sprich(d.ziel.name)
      setTimeout(() => onDone({ correct: true, usedHint: tries >= 2, timeMs: Date.now() - start }), 650)
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
      <p className="ww-schatten__frage">{d.frage}</p>

      <motion.div
        className="ww-schatten__buehne"
        key={task.answer as string}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <span className="ww-schatten__lampe" aria-hidden="true" />
        {d.mode === 'schatten' ? (
          geloest ? (
            <span className="ww-schatten__bild" aria-hidden="true">{d.ziel.emoji}</span>
          ) : (
            <Schatten emoji={d.ziel.emoji} gespiegelt={d.gespiegelt} drehung={d.drehung} size="gross" />
          )
        ) : (
          <span className="ww-schatten__bild" aria-hidden="true">{d.ziel.emoji}</span>
        )}
        <span className="ww-schatten__boden" aria-hidden="true" />
      </motion.div>

      <ChoiceRow
        options={d.optionen}
        onPick={choose}
        wrongValue={wrongPick}
        highlight={revealSolution ? (task.answer as string) : null}
        ariaLabel={(v) => (d.mode === 'umgekehrt' ? `Schatten ${d.optionen.indexOf(v) + 1}` : d.namen[v])}
        render={(v) =>
          d.mode === 'umgekehrt' && !(geloest && v === task.answer) ? (
            <Schatten emoji={v} gespiegelt={d.gespiegelt} drehung={d.drehung} size="klein" />
          ) : (
            <span className="ww-schatten__wahl">{v}</span>
          )
        }
      />
    </>
  )
}

export const schattenSuche: GameModule<SchattenTask> = {
  id: 'schatten-suche',
  worldId: 'entdecker',
  title: 'Schatten-Suche',
  subtitle: 'Wessen Schatten ist das? Genau hinschauen!',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="18" cy="16" r="9" fill="#F6BD41" stroke="#2E4034" strokeWidth="3" />
      <path d="M26 22 L70 66" stroke="#F6BD41" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="44" cy="62" rx="26" ry="8" fill="#2E4034" opacity="0.85" />
      <text x="44" y="52" fontSize="32" textAnchor="middle">🐰</text>
    </svg>
  ),
  generateTask,
  Component: SchattenSuche,
}
