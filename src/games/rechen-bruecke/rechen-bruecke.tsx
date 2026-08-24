import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { numberDistractors, pick, randInt, shuffle, type Rng } from '../rng'
import { ChoiceRow } from '../../components/ChoiceRow'
import { Funkel } from '../../world/Funkel'
import './rechen-bruecke.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export interface BrueckeData {
  /** Anzeige der Rechnung, z. B. "4 + 3 = ?" oder "_ + 6 = 13" */
  term: string
  /** Punktebilder unter den Zahlen (nur Stufen 1–2) */
  punkte?: [number, number] | null
  options: number[]
  /** Wie weit die Brücke schon gebaut ist – setzt die GameShell über taskNo */
  plankenGesamt: number
}

export type BrueckeTask = GameTask<BrueckeData>

const PLANKEN = 6

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export function generateTask(difficulty: number, rng: Rng): BrueckeTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  function build(term: string, answer: number, speak: string, punkte?: [number, number] | null) {
    const spread = answer > 20 ? 100 : answer > 10 ? 40 : 20
    return {
      data: {
        term,
        punkte: punkte ?? null,
        options: shuffle(rng, [answer, ...numberDistractors(rng, answer, 2, 0, spread)]),
        plankenGesamt: PLANKEN,
      },
      answer,
      speak,
    }
  }

  // Stufen 1–2: Plus bis 5 / bis 10, mit Punktebildern
  if (lvl <= 2) {
    const max = lvl === 1 ? 5 : 10
    const a = randInt(rng, 1, max - 1)
    const b = randInt(rng, 1, max - a)
    return build(`${a} + ${b} = ?`, a + b, `Wie viel ist ${a} plus ${b}?`, [a, b])
  }

  // Stufe 3: Minus bis 10
  if (lvl === 3) {
    const a = randInt(rng, 2, 10)
    const b = randInt(rng, 1, a)
    return build(`${a} − ${b} = ?`, a - b, `Wie viel ist ${a} minus ${b}?`, [a, b])
  }

  // Stufe 4: Plus/Minus bis 20 OHNE Zehnerübergang
  if (lvl === 4) {
    if (rng() < 0.5) {
      // Plus ohne Übergang: Einer zusammen unter 10
      const zehner = randInt(rng, 0, 1) * 10
      const a = zehner + randInt(rng, 1, 8)
      const b = randInt(rng, 1, 9 - (a % 10))
      return build(`${a} + ${b} = ?`, a + b, `Wie viel ist ${a} plus ${b}?`)
    }
    // Minus ohne Übergang: die Einer allein reichen aus (11..19, damit a <= 20 bleibt)
    const a = randInt(rng, 11, 19)
    const b = randInt(rng, 1, a % 10)
    return build(`${a} − ${b} = ?`, a - b, `Wie viel ist ${a} minus ${b}?`)
  }

  // Stufen 5–6: MIT Zehnerübergang
  if (lvl <= 6) {
    if (rng() < 0.5) {
      const a = randInt(rng, 4, 9)
      const b = randInt(rng, 11 - a, 9) // erzwingt Summe > 10
      return build(`${a} + ${b} = ?`, a + b, `Wie viel ist ${a} plus ${b}?`)
    }
    const a = randInt(rng, 11, 18)
    const b = randInt(rng, (a % 10) + 1, 9) // erzwingt Übergang nach unten
    return build(`${a} − ${b} = ?`, a - b, `Wie viel ist ${a} minus ${b}?`)
  }

  // Stufe 7: Ergänzen – "_ + 6 = 13"
  if (lvl === 7) {
    const summe = randInt(rng, 8, 20)
    const b = randInt(rng, 1, summe - 1)
    const a = summe - b
    return build(`? + ${b} = ${summe}`, a, `Was fehlt? Wie viel plus ${b} ergibt ${summe}?`)
  }

  // Stufe 8: kleines 1×1 (2er-, 5er-, 10er-Reihe)
  if (lvl === 8) {
    const reihe = pick(rng, [2, 5, 10])
    const n = randInt(rng, 1, 10)
    return build(`${reihe} · ${n} = ?`, reihe * n, `Wie viel ist ${reihe} mal ${n}?`)
  }

  // Stufe 9: 1×1 gemischt
  if (lvl === 9) {
    const a = randInt(rng, 2, 10)
    const b = randInt(rng, 2, 10)
    return build(`${a} · ${b} = ?`, a * b, `Wie viel ist ${a} mal ${b}?`)
  }

  // Stufe 10: Klammer-Ketten
  const a = randInt(rng, 2, 9)
  const b = randInt(rng, 1, 9)
  const c = randInt(rng, 1, a + b - 1)
  const plus = rng() < 0.5
  if (plus) {
    return build(`(${a} + ${b}) − ${c} = ?`, a + b - c, `Rechne zuerst in der Klammer: ${a} plus ${b}. Davon ${c} weg.`)
  }
  const d = randInt(rng, 1, 9)
  return build(`(${a} + ${b}) + ${d} = ?`, a + b + d, `Rechne zuerst in der Klammer: ${a} plus ${b}. Dazu ${d}.`)
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function RechenBruecke({ task, onDone, onWrong, revealSolution }: GameComponentProps<BrueckeTask>) {
  const [tries, setTries] = useState(0)
  const [start, setStart] = useState(() => Date.now())
  const [wrongPick, setWrongPick] = useState<number | null>(null)
  const [wobble, setWobble] = useState(false)
  const [placed, setPlaced] = useState(false)

  const d = task.data

  useEffect(() => {
    setTries(0)
    setWrongPick(null)
    setWobble(false)
    setPlaced(false)
    setStart(Date.now())
  }, [task])

  function choose(v: number) {
    if (v === task.answer) {
      setPlaced(true)
      onDone({ correct: true, usedHint: tries >= 2, timeMs: Date.now() - start })
      return
    }
    const n = tries + 1
    setTries(n)
    setWrongPick(v)
    // Die Planke wackelt – sie fällt aber nicht. Kein Absturz-Drama.
    setWobble(true)
    setTimeout(() => {
      setWrongPick(null)
      setWobble(false)
    }, 520)
    onWrong(n)
  }

  return (
    <>
      <Bridge wobble={wobble} placed={placed} />

      <p className="ww-bigsum ww-bruecke__term">{d.term}</p>

      {d.punkte && (
        <div className="ww-bruecke__punkte" aria-hidden="true">
          <DotGroup n={d.punkte[0]} />
          <DotGroup n={d.punkte[1]} />
        </div>
      )}

      <ChoiceRow
        options={d.options}
        onPick={choose}
        wrongValue={wrongPick}
        highlight={revealSolution ? (task.answer as number) : null}
        variant="stein"
      />
    </>
  )
}

function DotGroup({ n }: { n: number }) {
  return (
    <span className="ww-dots-group">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="ww-dots-group__dot" />
      ))}
    </span>
  )
}

/** Fluss mit Brücke. Jede gelöste Aufgabe legt eine Planke, Funkel hüpft drauf. */
function Bridge({ wobble, placed }: { wobble: boolean; placed: boolean }) {
  return (
    <div className="ww-bruecke">
      <svg viewBox="0 0 300 74" className="ww-bruecke__svg" aria-hidden="true">
        {/* Fluss */}
        <rect x="0" y="44" width="300" height="30" fill="#9FD0DF" />
        <path d="M0 48 q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#6FB5C9" strokeWidth="3" />
        {/* Ufer */}
        <path d="M0 44 h64 v30 H0 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
        <path d="M236 44 h64 v30 h-64 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
        {/* Ziel */}
        <path d="M268 42 l0 -26 l18 8 l-18 8" fill="#F6BD41" stroke="#2E4034" strokeWidth="3.5" strokeLinejoin="round" />

        {/* Planken */}
        <motion.g
          animate={wobble ? { rotate: [0, -2.4, 2.4, -1.2, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
          style={{ originX: '0.5', originY: '0.6' }}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <rect
              key={i}
              x={66 + i * 28}
              y={40}
              width={24}
              height={9}
              rx={3}
              fill="#B98A5E"
              stroke="#2E4034"
              strokeWidth="3"
            />
          ))}
        </motion.g>
      </svg>

      <motion.div
        className="ww-bruecke__funkel"
        animate={placed ? { x: [0, 18], y: [0, -14, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Funkel state={placed ? 'jubelt' : 'idle'} size={52} />
      </motion.div>
    </div>
  )
}

export const rechenBruecke: GameModule<BrueckeTask> = {
  id: 'rechen-bruecke',
  worldId: 'zahlen',
  title: 'Rechen-Brücke',
  subtitle: 'Plus, minus und das kleine Einmaleins',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="0" y="46" width="80" height="26" fill="#9FD0DF" />
      <path d="M0 46 h16 v26 H0 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="4" />
      <path d="M64 46 h16 v26 H64 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="4" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={16 + i * 13} y={40} width={11} height={8} rx={2} fill="#B98A5E" stroke="#2E4034" strokeWidth="3" />
      ))}
      <text x="40" y="26" fontSize="26" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">
        +
      </text>
    </svg>
  ),
  generateTask,
  Component: RechenBruecke,
}
