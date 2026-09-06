import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameComponentProps, GameModule, GameTask, TaskContext } from '../types'
import type { Rng } from '../rng'
import { useMeasuredBox } from '../paar-finder/useBoardLayout'
import { Uhr } from '../../components/Uhr'
import { sfx } from '../../audio/AudioManager'
import { sprich } from '../../audio/tts'
import { zieheGemischteFrage } from '../flitzer-rallye/rallye'
import type { WorldId } from '../../db/types'
import './ballon-platzer.css'

/* ------------------------------------------------------------------ */
/* Aufgabe                                                             */
/* ------------------------------------------------------------------ */

export interface BallonData {
  quelle: WorldId
  frage: string
  bild?: string
  uhr?: { stunde: number; minute: number }
  optionen: string[]
  namen?: Record<string, string>
  /** Steigtempo in Prozent der Szenenhöhe je Sekunde */
  tempo: number
  /** Seitliches Schwanken */
  schwung: number
}

export type BallonTask = GameTask<BallonData>

export function generateTask(difficulty: number, rng: Rng, ctx?: TaskContext): BallonTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))
  const { answer, speak, ...frage } = zieheGemischteFrage(difficulty, rng, ctx)
  return {
    data: {
      ...frage,
      tempo: 9 + lvl * 1.4,
      schwung: 4 + lvl * 1.1,
    },
    answer,
    speak: speak.replace(/Fahr durch das Tor/g, 'Tippe den Ballon').replace(/durch das richtige Tor/g, 'auf den richtigen Ballon'),
  }
}

const BALLON_FARBEN = ['#E4634F', '#F6BD41', '#6FB5C9', '#9A7FC9', '#7FB069']

interface Ballon {
  /** Prozent der Szenenbreite */
  x: number
  /** Prozent der Szenenhöhe, 0 = oben */
  y: number
  phase: number
  /** wieder aufgestiegen nach einem Platzer */
  geplatzt: boolean
  platzBis: number
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function BallonPlatzer({ task, onDone, onWrong, revealSolution, taskNo = 0, paused = false }: GameComponentProps<BallonTask>) {
  const d = task.data
  const { ref: szeneRef, box } = useMeasuredBox<HTMLDivElement>()
  const ballonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [platzer, setPlatzer] = useState<number | null>(null)
  const [geloest, setGeloest] = useState(false)
  const [getippt, setGetippt] = useState(false)
  const tries = useRef(0)
  const start = useRef(Date.now())
  const geloestRef = useRef(false)

  const ballons = useRef<Ballon[]>([])
  const props = useRef({ paused, tempo: d.tempo, schwung: d.schwung })
  props.current = { paused, tempo: d.tempo, schwung: d.schwung }

  /* Neue Aufgabe: Ballons unten neu aufstellen, in zufälliger Reihenfolge. */
  useEffect(() => {
    const n = d.optionen.length
    const spalten = [...Array(n).keys()].sort(() => (Math.random() < 0.5 ? -1 : 1))
    ballons.current = d.optionen.map((_, i) => ({
      x: ((spalten[i] + 0.5) / n) * 100,
      y: 96 + i * 20,
      phase: Math.random() * Math.PI * 2,
      geplatzt: false,
      platzBis: 0,
    }))
    tries.current = 0
    start.current = Date.now()
    geloestRef.current = false
    setGeloest(false)
    setPlatzer(null)
  }, [task, d.optionen])

  /* Frame-Schleife: Ballons steigen, schwanken und kommen unten wieder. */
  useEffect(() => {
    let raf = 0
    let vorher = performance.now()
    const tick = (jetzt: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (jetzt - vorher) / 1000)
      vorher = jetzt
      const p = props.current
      if (p.paused || geloestRef.current) return
      ballons.current.forEach((b, i) => {
        if (b.geplatzt) {
          if (jetzt > b.platzBis) {
            b.geplatzt = false
            b.y = 110
            b.x = 12 + Math.random() * 76
          }
        } else {
          b.y -= p.tempo * dt
          b.phase += dt * 1.6
          if (b.y < -22) {
            b.y = 110
            b.x = 12 + Math.random() * 76
          }
        }
        const el = ballonRefs.current[i]
        if (el) {
          const sway = Math.sin(b.phase) * p.schwung
          el.style.transform = `translate(-50%, 0) translate(${(b.x + sway) * 0.01 * box.width}px, ${b.y * 0.01 * box.height}px) rotate(${sway * 0.6}deg)`
          el.style.visibility = b.geplatzt ? 'hidden' : 'visible'
        }
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [box.width, box.height])

  const tippe = useCallback(
    (i: number) => {
      if (geloestRef.current) return
      setGetippt(true)
      const opt = d.optionen[i]
      const b = ballons.current[i]
      if (opt === task.answer) {
        geloestRef.current = true
        setGeloest(true)
        setPlatzer(i)
        sfx('pop')
        setTimeout(
          () => onDone({ correct: true, usedHint: tries.current >= 2, timeMs: Date.now() - start.current }),
          700,
        )
        return
      }
      tries.current += 1
      if (b) {
        b.geplatzt = true
        b.platzBis = performance.now() + 1200
      }
      setPlatzer(i)
      setTimeout(() => setPlatzer((p) => (p === i ? null : p)), 600)
      onWrong(tries.current)
    },
    [d.optionen, task.answer, onDone, onWrong],
  )

  const zaehlmenge = d.bild && [...d.bild].length > 2 ? [...d.bild] : null

  return (
    <div className="ww-ballon" data-aufgabe={taskNo}>
      <div className="ww-ballon__schild" role="heading" aria-level={2}>
        {d.uhr ? (
          <Uhr stunde={d.uhr.stunde} minute={d.uhr.minute} size={70} />
        ) : zaehlmenge ? (
          <span className="ww-ballon__menge" aria-hidden="true">
            {zaehlmenge.map((e, i) => (
              <span key={i}>{e}</span>
            ))}
          </span>
        ) : d.bild ? (
          <button
            type="button"
            className="ww-ballon__bild"
            onClick={() => {
              sfx('pop')
              sprich(task.speak)
            }}
            aria-label="Frage noch einmal hören"
          >
            {d.bild}
          </button>
        ) : null}
        <span className={`ww-ballon__frage ${d.frage.length > 18 ? 'ww-ballon__frage--lang' : ''}`}>{d.frage}</span>
      </div>

      <div ref={szeneRef} className="ww-ballon__himmel" aria-label="Ballons steigen auf — tippe den richtigen">
        <span className="ww-ballon__wolke ww-ballon__wolke--a" aria-hidden="true" />
        <span className="ww-ballon__wolke ww-ballon__wolke--b" aria-hidden="true" />
        {d.optionen.map((opt, i) => {
          const tipp = revealSolution && opt === task.answer
          const lang = [...opt].length > 6
          return (
            <button
              key={`${taskNo}-${i}`}
              ref={(el) => (ballonRefs.current[i] = el)}
              type="button"
              className={[
                'ww-ballon__ballon',
                platzer === i ? (geloest ? 'ww-ballon__ballon--treffer' : 'ww-ballon__ballon--platzt') : '',
                tipp ? 'ww-ballon__ballon--tipp' : '',
              ].join(' ')}
              style={{ '--farbe': BALLON_FARBEN[i % BALLON_FARBEN.length] } as React.CSSProperties}
              onPointerDown={(e) => {
                e.preventDefault()
                tippe(i)
              }}
              aria-label={d.namen?.[opt] ?? opt}
            >
              <span className={`ww-ballon__text ${lang ? 'ww-ballon__text--lang' : ''}`}>{opt}</span>
              <span className="ww-ballon__knoten" aria-hidden="true" />
              <span className="ww-ballon__schnur" aria-hidden="true" />
            </button>
          )
        })}
        {taskNo === 0 && !getippt && <span className="ww-ballon__hinweis">👆 Tippe den richtigen Ballon</span>}
      </div>
    </div>
  )
}

export const ballonPlatzer: GameModule<BallonTask> = {
  id: 'ballon-platzer',
  worldId: 'entdecker',
  title: 'Ballon-Platzer',
  subtitle: 'Die Antworten steigen auf — tipp den richtigen Ballon, bevor er weg ist',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <ellipse cx="30" cy="30" rx="16" ry="20" fill="#E4634F" stroke="#2E4034" strokeWidth="4" />
      <path d="M30 50 L30 72" stroke="#2E4034" strokeWidth="3" />
      <ellipse cx="56" cy="40" rx="13" ry="16" fill="#6FB5C9" stroke="#2E4034" strokeWidth="4" />
      <path d="M56 56 L54 74" stroke="#2E4034" strokeWidth="3" />
      <text x="30" y="36" fontSize="16" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#FBFDF8" textAnchor="middle">7</text>
      <text x="56" y="45" fontSize="14" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">5</text>
      <path d="M10 14 L14 10 M12 18 L18 16" stroke="#F6BD41" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  generateTask,
  Component: BallonPlatzer,
  fillsStage: true,
}
