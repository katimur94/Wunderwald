import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { numberDistractors, pick, randInt, shuffle, type Rng } from '../rng'
import { ChoiceRow } from '../../components/ChoiceRow'
import { sprich } from '../../audio/tts'
import { sfx } from '../../audio/AudioManager'
import './zahlen-ernte.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export type ErnteMode =
  | 'zaehlen'      // Wie viele siehst du?
  | 'zaehlenMix'   // zwei Sorten, nur eine zählen
  | 'vergleich'    // Wo sind mehr?
  | 'buendel'      // 11–20 in 5er-Reihen
  | 'ergaenzen'    // Wie viele fehlen bis 10/20?
  | 'sachaufgabe'  // vorgelesene Mini-Textaufgabe

export interface ErnteData {
  mode: ErnteMode
  /** Früchte am Baum (bei 'vergleich': linke Gruppe) */
  fruits: string[]
  /** zweite Gruppe – nur bei 'vergleich' */
  fruitsB?: string[]
  /** Sorte, nach der gefragt wird (bei 'zaehlenMix') */
  askFor?: string
  /** Zielzahl bei 'ergaenzen' */
  zielzahl?: number
  /** Sichtbarer Aufgabentext */
  frage: string
  options: number[]
  /** Zeilenweise gruppiert darstellen (Fünferbündel) */
  gruppiert?: boolean
}

export type ErnteTask = GameTask<ErnteData>

const OBST = ['🍎', '🍐', '🍊', '🍋', '🍒', '🍑']
const TIERE = [
  { emoji: '🐦', ein: 'ein Vogel', mehrz: 'Vögel', sitzt: 'sitzen', kommt: 'fliegen' },
  { emoji: '🐸', ein: 'ein Frosch', mehrz: 'Frösche', sitzt: 'sitzen', kommt: 'hüpfen' },
  { emoji: '🐝', ein: 'eine Biene', mehrz: 'Bienen', sitzt: 'sitzen', kommt: 'fliegen' },
  { emoji: '🐜', ein: 'eine Ameise', mehrz: 'Ameisen', sitzt: 'laufen', kommt: 'laufen' },
  { emoji: '🐿️', ein: 'ein Eichhörnchen', mehrz: 'Eichhörnchen', sitzt: 'sitzen', kommt: 'springen' },
]

function repeat(emoji: string, n: number): string[] {
  return Array.from({ length: n }, () => emoji)
}

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export function generateTask(difficulty: number, rng: Rng): ErnteTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  // Stufen 1–3: reines Zählen, wachsende Mengen
  if (lvl <= 3) {
    const max = lvl === 1 ? 4 : lvl === 2 ? 6 : 10
    const n = randInt(rng, 1, max)
    const frucht = pick(rng, OBST)
    return {
      data: {
        mode: 'zaehlen',
        fruits: repeat(frucht, n),
        frage: 'Wie viele siehst du?',
        options: shuffle(rng, [n, ...numberDistractors(rng, n, 2, 1, max + 2)]),
      },
      answer: n,
      speak: 'Wie viele Früchte siehst du?',
    }
  }

  // Stufe 4: zwei Sorten, nur eine zählen (Ablenker)
  if (lvl === 4) {
    const [a, b] = shuffle(rng, OBST).slice(0, 2)
    const nA = randInt(rng, 2, 8)
    const nB = randInt(rng, 2, 8)
    const fruits = shuffle(rng, [...repeat(a, nA), ...repeat(b, nB)])
    return {
      data: {
        mode: 'zaehlenMix',
        fruits,
        askFor: a,
        frage: `Wie viele ${a} siehst du?`,
        options: shuffle(rng, [nA, ...numberDistractors(rng, nA, 2, 1, 14)]),
      },
      answer: nA,
      speak: 'Zähle nur eine Sorte. Wie viele von der Frucht oben in der Frage siehst du?',
    }
  }

  // Stufe 5: Vergleich – wo sind mehr?
  if (lvl === 5) {
    const [a, b] = shuffle(rng, OBST).slice(0, 2)
    let nA = randInt(rng, 2, 9)
    let nB = randInt(rng, 2, 9)
    while (nA === nB) nB = randInt(rng, 2, 9)
    const mehr = Math.max(nA, nB)
    return {
      data: {
        mode: 'vergleich',
        fruits: repeat(a, nA),
        fruitsB: repeat(b, nB),
        frage: 'Wo sind mehr?',
        options: shuffle(rng, [nA, nB]),
      },
      answer: mehr,
      speak: 'Wo sind mehr Früchte? Tippe die größere Zahl.',
    }
  }

  // Stufe 6: 11–20, in Fünferreihen gebündelt
  if (lvl === 6) {
    const n = randInt(rng, 11, 20)
    const frucht = pick(rng, OBST)
    return {
      data: {
        mode: 'buendel',
        fruits: repeat(frucht, n),
        gruppiert: true,
        frage: 'Wie viele sind es?',
        options: shuffle(rng, [n, ...numberDistractors(rng, n, 2, 5, 25)]),
      },
      answer: n,
      speak: 'Zähle in Fünferreihen. Wie viele sind es zusammen?',
    }
  }

  // Stufen 7–8: Wie viele fehlen bis 10 bzw. 20?
  if (lvl <= 8) {
    const ziel = lvl === 7 ? 10 : 20
    const n = randInt(rng, 1, ziel - 1)
    const fehlen = ziel - n
    const frucht = pick(rng, OBST)
    return {
      data: {
        mode: 'ergaenzen',
        fruits: repeat(frucht, n),
        gruppiert: ziel === 20,
        zielzahl: ziel,
        frage: `Wie viele fehlen bis ${ziel}?`,
        options: shuffle(rng, [fehlen, ...numberDistractors(rng, fehlen, 2, 1, ziel)]),
      },
      answer: fehlen,
      speak: `Hier sind ${n} Früchte. Wie viele fehlen bis ${ziel}?`,
    }
  }

  // Stufen 9–10: kleine Sachaufgaben, vorgelesen
  const tier = pick(rng, TIERE)
  const max = lvl === 9 ? 9 : 14
  const a = randInt(rng, 2, max)
  const plus = rng() < (lvl === 9 ? 0.75 : 0.5)
  const b = plus ? randInt(rng, 1, Math.max(1, max - a)) : randInt(rng, 1, a - 1)
  const answer = plus ? a + b : a - b

  const satz = plus
    ? `${a} ${tier.mehrz} ${tier.sitzt} auf der Wiese. ${b} ${tier.kommt} dazu. Wie viele sind es jetzt?`
    : `${a} ${tier.mehrz} ${tier.sitzt} auf der Wiese. ${b} ${tier.kommt} weg. Wie viele bleiben?`

  return {
    data: {
      mode: 'sachaufgabe',
      fruits: repeat(tier.emoji, a),
      frage: satz,
      options: shuffle(rng, [answer, ...numberDistractors(rng, answer, 2, 0, 30)]),
    },
    answer,
    speak: satz,
  }
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function ZahlenErnte({ task, onDone, onWrong, revealSolution }: GameComponentProps<ErnteTask>) {
  const [tries, setTries] = useState(0)
  const [start, setStart] = useState(() => Date.now())
  const [wrongPick, setWrongPick] = useState<number | null>(null)
  const [counted, setCounted] = useState<number[]>([])

  const d = task.data

  useEffect(() => {
    setTries(0)
    setWrongPick(null)
    setCounted([])
    setStart(Date.now())
  }, [task])

  /** Zähl-Hilfe: beim Antippen einer Frucht zählt Funkel laut mit. */
  function tapFruit(index: number) {
    if (counted.includes(index)) return
    const next = [...counted, index]
    setCounted(next)
    sfx('pop')
    sprich(String(next.length))
  }

  function choose(v: number) {
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
      <p className="ww-ernte__frage">{d.frage}</p>

      {d.mode === 'vergleich' ? (
        <div className="ww-ernte__vergleich">
          <FruitPatch fruits={d.fruits} counted={counted} onTap={tapFruit} offset={0} />
          <span className="ww-ernte__vs" aria-hidden="true">oder</span>
          <FruitPatch
            fruits={d.fruitsB ?? []}
            counted={counted}
            onTap={tapFruit}
            offset={d.fruits.length}
          />
        </div>
      ) : (
        <Scene
          fruits={d.fruits}
          counted={counted}
          onTap={tapFruit}
          gruppiert={d.gruppiert}
          askFor={d.askFor}
          /* Tiere sitzen auf der Wiese, nicht am Baum */
          kind={d.mode === 'sachaufgabe' ? 'wiese' : 'baum'}
        />
      )}

      {d.mode === 'ergaenzen' && (
        <p className="ww-ernte__ziel">
          Ziel: <strong>{d.zielzahl}</strong>
        </p>
      )}

      <ChoiceRow
        options={d.options}
        onPick={choose}
        wrongValue={wrongPick}
        highlight={revealSolution ? (task.answer as number) : null}
      />
    </>
  )
}

function Scene({
  fruits,
  counted,
  onTap,
  gruppiert,
  askFor,
  kind,
}: {
  fruits: string[]
  counted: number[]
  onTap: (i: number) => void
  gruppiert?: boolean
  askFor?: string
  kind: 'baum' | 'wiese'
}) {
  const rows: string[][] = []
  if (gruppiert) {
    for (let i = 0; i < fruits.length; i += 5) rows.push(fruits.slice(i, i + 5))
  } else {
    rows.push(fruits)
  }
  let running = 0

  return (
    <div className={`ww-ernte__scene ww-ernte__scene--${kind}`}>
      {kind === 'baum' && <Crown />}

      <div className={`ww-ernte__fruits ${gruppiert ? 'ww-ernte__fruits--gruppiert' : ''}`}>
        {rows.map((row, r) => {
          const startIdx = running
          running += row.length
          return (
            <div className="ww-ernte__row" key={r}>
              {row.map((f, i) => {
                const idx = startIdx + i
                const dim = askFor !== undefined && f !== askFor
                return (
                  <motion.button
                    key={idx}
                    type="button"
                    className={`ww-fruit ${counted.includes(idx) ? 'ww-fruit--counted' : ''} ${
                      dim ? 'ww-fruit--dim' : ''
                    }`}
                    onClick={() => onTap(idx)}
                    aria-label={`Nummer ${idx + 1} antippen und mitzählen`}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: Math.min(0.4, idx * 0.035), type: 'spring', stiffness: 260 }}
                  >
                    <span aria-hidden="true">{f}</span>
                  </motion.button>
                )
              })}
            </div>
          )
        })}
      </div>

      {kind === 'baum' ? <div className="ww-ernte__trunk" aria-hidden="true" /> : <Meadow />}
    </div>
  )
}

/** Baumkrone als organischer Blob – bewusst keine zwei Kreise (die lesen sich wie Augen). */
function Crown() {
  return (
    <svg className="ww-ernte__crown" viewBox="0 0 320 96" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M18 92 Q0 62 24 44 Q22 16 58 14 Q78 -4 112 8 Q160 -10 206 8 Q244 -4 264 16 Q302 20 300 48 Q322 66 300 92 Z"
        fill="#7FB069"
        stroke="#2E4034"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M46 40 q22 -14 46 -4" fill="none" stroke="#63914F" strokeWidth="5" strokeLinecap="round" />
      <path d="M206 34 q24 -12 48 0" fill="none" stroke="#63914F" strokeWidth="5" strokeLinecap="round" />
    </svg>
  )
}

/** Wiese für die Sachaufgaben. */
function Meadow() {
  return (
    <svg className="ww-ernte__meadow" viewBox="0 0 320 46" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M0 20 Q60 6 130 16 Q210 28 320 12 L320 46 L0 46 Z"
        fill="#7FB069"
        stroke="#2E4034"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path d="M40 22 v-9 M62 24 v-8 M240 20 v-9 M266 22 v-8" stroke="#63914F" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

function FruitPatch({
  fruits,
  counted,
  onTap,
  offset,
}: {
  fruits: string[]
  counted: number[]
  onTap: (i: number) => void
  offset: number
}) {
  return (
    <div className="ww-ernte__patch">
      {fruits.map((f, i) => (
        <button
          key={i}
          type="button"
          className={`ww-fruit ${counted.includes(offset + i) ? 'ww-fruit--counted' : ''}`}
          onClick={() => onTap(offset + i)}
          aria-label={`Frucht ${i + 1}`}
        >
          <span aria-hidden="true">{f}</span>
        </button>
      ))}
    </div>
  )
}

export const zahlenErnte: GameModule<ErnteTask> = {
  id: 'zahlen-ernte',
  worldId: 'zahlen',
  title: 'Zahlen-Ernte',
  subtitle: 'Zählen, vergleichen und ergänzen',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <ellipse cx="40" cy="30" rx="32" ry="24" fill="#7FB069" stroke="#2E4034" strokeWidth="4" />
      <rect x="35" y="50" width="10" height="24" rx="4" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <circle cx="26" cy="26" r="7" fill="#E4634F" stroke="#2E4034" strokeWidth="3" />
      <circle cx="48" cy="20" r="7" fill="#E4634F" stroke="#2E4034" strokeWidth="3" />
      <circle cx="52" cy="38" r="7" fill="#F6BD41" stroke="#2E4034" strokeWidth="3" />
      <circle cx="28" cy="42" r="6" fill="#F6BD41" stroke="#2E4034" strokeWidth="3" />
    </svg>
  ),
  generateTask,
  Component: ZahlenErnte,
}
