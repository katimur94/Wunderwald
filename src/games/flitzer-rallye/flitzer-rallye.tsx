import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AnswerReport, GameComponentProps, GameModule } from '../types'
import { mulberry32 } from '../rng'
import { useMeasuredBox } from '../paar-finder/useBoardLayout'
import { sfx } from '../../audio/AudioManager'
import { useActiveChild } from '../../store/useApp'
import { avatarOf } from '../../components/Avatar'
import { Uhr } from '../../components/Uhr'
import {
  baueRennstrecke,
  gegnerNachAntwort,
  generateTask,
  platzierung,
  platzSymbol,
  platzText,
  segmentAt,
  spurVon,
  starteGegner,
  streueFunken,
  SEG_LEN,
  SPUREN,
  TOR_ABSTAND,
  TOR_ABSTAND_NOCHMAL,
  ZIEL_ABSTAND,
  type Funke,
  type Gegner,
  type RallyeTask,
  type Segment,
} from './rallye'
import { render, type TorAnzeige } from './renderer'
import './flitzer-rallye.css'

export { generateTask }
export type { RallyeTask }

/* ------------------------------------------------------------------ */
/* Laufzustand — lebt in einer Ref, nie im React-State                 */
/* ------------------------------------------------------------------ */

interface Tor extends TorAnzeige {
  versuche: number
  passiert: boolean
  gestartet: number
}

interface Lauf {
  z: number
  x: number
  zielX: number
  speed: number
  boostBis: number
  schlammBis: number
  tor: Tor | null
  zielZ: number | null
  vorbei: boolean
  gegner: Gegner[]
  gegnerZiel: number[]
  funken: Funke[]
  gesammelt: number
  himmelX: number
  t: number
  /** Bericht für die letzte Aufgabe — wird erst an der Ziellinie abgegeben */
  offenerBericht: AnswerReport | null
  zielGemeldet: boolean
}

const BOOST_MS = 2600
const SCHLAMM_MS = 1500

function FlitzerRallye({
  task,
  difficulty,
  onDone,
  onWrong,
  revealSolution,
  taskNo = 0,
  tasksTotal = 6,
  paused = false,
}: GameComponentProps<RallyeTask>) {
  const child = useActiveChild()
  const avatar = avatarOf(child?.avatarId ?? 'fuchs')
  const { ref: szeneRef, box } = useMeasuredBox<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [platz, setPlatz] = useState(4)
  const [gesammelt, setGesammelt] = useState(0)
  const [meldung, setMeldung] = useState<'turbo' | 'schlamm' | null>(null)
  const [falschIdx, setFalschIdx] = useState<number | null>(null)
  const [ziel, setZiel] = useState<number | null>(null)
  const [gelenkt, setGelenkt] = useState(false)
  const [spur, setSpur] = useState(1)

  const d = task.data
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  /* Strecke und Gegner: einmal je Runde, aus dem Seed der ersten Aufgabe. */
  const strecke = useRef<Segment[] | null>(null)
  if (!strecke.current) strecke.current = baueRennstrecke(d.streckeSeed, lvl)
  const rng = useRef(mulberry32(d.streckeSeed ^ 0x5bd1e995))

  const lauf = useRef<Lauf | null>(null)
  if (!lauf.current) {
    const gegner = starteGegner(rng.current, avatar.emoji)
    lauf.current = {
      z: 0,
      x: 0,
      zielX: 0,
      speed: 0,
      boostBis: 0,
      schlammBis: 0,
      tor: null,
      zielZ: null,
      vorbei: false,
      gegner,
      gegnerZiel: gegner.map((g) => g.vorsprung),
      funken: [],
      gesammelt: 0,
      himmelX: 0,
      t: 0,
      offenerBericht: null,
      zielGemeldet: false,
    }
  }

  /* Callbacks und Props in Refs, damit die Frame-Schleife stabil bleibt. */
  const props = useRef({ onDone, onWrong, revealSolution, taskNo, tasksTotal, paused, tempo: d.tempo, lvl })
  props.current = { onDone, onWrong, revealSolution, taskNo, tasksTotal, paused, tempo: d.tempo, lvl }

  /* ---------- Neue Aufgabe: Tor voraus aufstellen ---------- */
  useEffect(() => {
    const l = lauf.current!
    const antwortIdx = d.optionen.indexOf(task.answer as string)
    l.tor = {
      z: l.z + TOR_ABSTAND * SEG_LEN,
      optionen: d.optionen,
      antwortIdx: antwortIdx < 0 ? 0 : antwortIdx,
      zeigeLoesung: false,
      falschIdx: null,
      versuche: 0,
      passiert: false,
      gestartet: performance.now(),
    }
    l.funken = streueFunken(rng.current, l.z, l.tor.z)
    setFalschIdx(null)
    setMeldung(null)
  }, [task, d.optionen])

  useEffect(() => {
    setPlatz(platzierung(lauf.current!.gegner))
  }, [])

  /* ---------- Steuern ---------- */
  const steuere = useCallback((zielX: number) => {
    const l = lauf.current!
    if (l.vorbei) return
    l.zielX = Math.max(-1, Math.min(1, zielX))
    setGelenkt(true)
    setSpur(spurVon(l.zielX))
  }, [])

  const steuereZuSpur = useCallback(
    (idx: number) => {
      sfx('click')
      steuere(SPUREN[Math.max(0, Math.min(2, idx))])
    },
    [steuere],
  )

  const zeigerAufSzene = useCallback(
    (clientX: number) => {
      const el = szeneRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const rel = (clientX - r.left) / Math.max(1, r.width)
      steuere((rel - 0.5) * 2.6)
    },
    [steuere, szeneRef],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const l = lauf.current!
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault()
        steuere(SPUREN[Math.max(0, spurVon(l.zielX) - 1)])
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault()
        steuere(SPUREN[Math.min(2, spurVon(l.zielX) + 1)])
      } else if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
        steuere(SPUREN[Number(e.code.slice(-1)) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steuere])

  /* ---------- Bildschirm wach halten, solange gefahren wird ---------- */
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    let aktiv = true
    const nav = navigator as Navigator & {
      wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> }
    }
    nav.wakeLock
      ?.request('screen')
      .then((l) => {
        if (aktiv) lock = l
        else void l.release()
      })
      .catch(() => {
        /* Ohne Wake Lock geht es auch — dann schaltet das Gerät wie sonst ab. */
      })
    return () => {
      aktiv = false
      void lock?.release()
    }
  }, [])

  /* ---------- Die Frame-Schleife ---------- */
  const bereit = box.width > 0 && box.height > 0
  useEffect(() => {
    if (!bereit) return
    const canvas = canvasRef.current
    const segments = strecke.current
    if (!canvas || !segments) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, box.width * box.height > 700_000 ? 1.5 : 2)
    canvas.width = Math.round(box.width * dpr)
    canvas.height = Math.round(box.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let raf = 0
    let vorher = performance.now()
    let falschTimer: ReturnType<typeof setTimeout> | null = null

    const tick = (jetzt: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (jetzt - vorher) / 1000)
      vorher = jetzt
      const l = lauf.current!
      const p = props.current

      if (!p.paused) {
        l.t += dt
        const frei = p.tempo
        const boost = l.boostBis > jetzt ? Math.min(1, (l.boostBis - jetzt) / 600) : 0
        const schlamm = l.schlammBis > jetzt ? Math.min(1, (l.schlammBis - jetzt) / 500) : 0

        /* Tempo: vor einem Tor gemächlich, nach dem Tor Turbo, im Schlamm zäh. */
        let maxSpeed = l.tor && !l.tor.passiert ? frei * 0.42 : frei
        if (boost > 0) maxSpeed = frei * 1.55
        if (schlamm > 0) maxSpeed = frei * 0.3
        if (Math.abs(l.x) > 1.08) maxSpeed *= 0.6
        if (l.vorbei) maxSpeed = 0
        l.speed += (maxSpeed - l.speed) * Math.min(1, dt * (l.speed < maxSpeed ? 1.5 : 2.6))
        if (l.tor && !l.tor.passiert && l.speed < frei * 0.2 && !l.vorbei) l.speed = Math.min(maxSpeed, l.speed + frei * dt)
        l.z += l.speed * dt

        /* Lenken: dem Finger folgen, in Kurven leicht nach außen driften. */
        l.x += (l.zielX - l.x) * Math.min(1, dt * 7)
        if (p.lvl >= 5) {
          const seg = segmentAt(segments, l.z)
          l.x -= seg.curve * (l.speed / frei) * dt * 0.1 * ((p.lvl - 4) / 6)
        }
        l.x = Math.max(-1.2, Math.min(1.2, l.x))
        l.himmelX += segmentAt(segments, l.z).curve * (l.speed / frei) * dt * 60

        /* Gegner gleiten auf ihren Zielvorsprung zu. */
        l.gegner = l.gegner.map((g, i) => ({
          ...g,
          vorsprung: g.vorsprung + (l.gegnerZiel[i] - g.vorsprung) * Math.min(1, dt * 0.9),
          x: SPUREN[i % 3] + Math.sin(l.t * 0.8 + i * 2) * 0.08,
        }))

        /* Funken einsammeln */
        for (const f of l.funken) {
          if (f.weg) continue
          if (Math.abs(f.z - l.z) < SEG_LEN * 0.7 && Math.abs(f.x - l.x) < 0.34) {
            f.weg = true
            l.gesammelt += 1
            sfx('star')
            setGesammelt(l.gesammelt)
          }
        }

        /* Tor durchfahren */
        const tor = l.tor
        if (tor && !tor.passiert && l.z >= tor.z) {
          tor.passiert = true
          const gewaehlt = spurVon(l.x)
          const richtig = gewaehlt === tor.antwortIdx
          const bericht: AnswerReport = {
            correct: true,
            usedHint: tor.versuche >= 2,
            timeMs: jetzt - tor.gestartet,
          }
          if (richtig) {
            l.boostBis = jetzt + BOOST_MS
            l.gegnerZiel = gegnerNachAntwort(
              l.gegner.map((g, i) => ({ ...g, vorsprung: l.gegnerZiel[i] })),
              true,
            ).map((g) => g.vorsprung)
            setPlatz(platzierung(l.gegner.map((g, i) => ({ ...g, vorsprung: l.gegnerZiel[i] }))))
            setMeldung('turbo')
            setTimeout(() => setMeldung((m) => (m === 'turbo' ? null : m)), 1400)
            if (p.taskNo >= p.tasksTotal - 1) {
              l.zielZ = l.z + ZIEL_ABSTAND * SEG_LEN
              l.offenerBericht = bericht
            } else {
              p.onDone(bericht)
            }
          } else {
            tor.versuche += 1
            l.schlammBis = jetzt + SCHLAMM_MS
            l.gegnerZiel = gegnerNachAntwort(
              l.gegner.map((g, i) => ({ ...g, vorsprung: l.gegnerZiel[i] })),
              false,
            ).map((g) => g.vorsprung)
            setPlatz(platzierung(l.gegner.map((g, i) => ({ ...g, vorsprung: l.gegnerZiel[i] }))))
            setMeldung('schlamm')
            setTimeout(() => setMeldung((m) => (m === 'schlamm' ? null : m)), 1400)
            tor.falschIdx = gewaehlt
            setFalschIdx(gewaehlt)
            if (falschTimer) clearTimeout(falschTimer)
            falschTimer = setTimeout(() => {
              tor.falschIdx = null
              setFalschIdx(null)
            }, 1000)
            p.onWrong(tor.versuche)
            // Dasselbe Tor steht ein Stück weiter noch einmal.
            tor.z = l.z + TOR_ABSTAND_NOCHMAL * SEG_LEN
            tor.passiert = false
            l.funken = streueFunken(rng.current, l.z, tor.z)
          }
        }
        if (tor) tor.zeigeLoesung = p.revealSolution && !tor.passiert

        /* Ziellinie */
        if (l.zielZ !== null && !l.vorbei && l.z >= l.zielZ) {
          l.vorbei = true
          sfx('fanfare')
          const endPlatz = platzierung(l.gegner.map((g, i) => ({ ...g, vorsprung: l.gegnerZiel[i] })))
          setZiel(endPlatz)
          setTimeout(() => {
            if (l.offenerBericht && !l.zielGemeldet) {
              l.zielGemeldet = true
              p.onDone(l.offenerBericht)
            }
          }, 2600)
        }
      }

      render(ctx, box.width, box.height, {
        segments,
        z: l.z,
        x: l.x,
        speed: l.speed,
        maxSpeed: p.tempo * 1.55,
        tor: l.tor,
        zielZ: l.zielZ,
        gegner: l.gegner,
        funken: l.funken,
        boost: l.boostBis > jetzt ? Math.min(1, (l.boostBis - jetzt) / 600) : 0,
        schlamm: l.schlammBis > jetzt ? Math.min(1, (l.schlammBis - jetzt) / 500) : 0,
        t: l.t,
        fahrer: { emoji: avatar.emoji, farbe: avatar.color },
        lenk: Math.max(-1, Math.min(1, (l.zielX - l.x) * 3)),
        himmelX: l.himmelX,
      })
    }

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      if (falschTimer) clearTimeout(falschTimer)
    }
  }, [bereit, box.width, box.height, avatar.emoji, avatar.color])

  const antwortIdx = d.optionen.indexOf(task.answer as string)
  const zaehlmenge = d.bild && [...d.bild].length > 2 ? [...d.bild] : null

  return (
    <div className="ww-rallye" data-aufgabe={taskNo}>
      <div
        ref={szeneRef}
        className="ww-rallye__szene"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          zeigerAufSzene(e.clientX)
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') zeigerAufSzene(e.clientX)
        }}
        aria-label="Rennstrecke — tippe links, in die Mitte oder rechts, um die Spur zu wechseln"
      >
        <canvas ref={canvasRef} className="ww-rallye__canvas" style={{ width: box.width, height: box.height }} />

        {/* Schild mit der Frage */}
        <div className="ww-rallye__schild" role="heading" aria-level={2}>
          {d.uhr ? (
            <Uhr stunde={d.uhr.stunde} minute={d.uhr.minute} size={72} ziffern={lvl < 9} className="ww-rallye__uhr" />
          ) : zaehlmenge ? (
            <span className="ww-rallye__menge" aria-hidden="true">
              {zaehlmenge.map((e, i) => (
                <span key={i}>{e}</span>
              ))}
            </span>
          ) : d.bild ? (
            <span className="ww-rallye__bild" aria-hidden="true">
              {d.bild}
            </span>
          ) : null}
          <span className={`ww-rallye__frage ${d.frage.length > 18 ? 'ww-rallye__frage--lang' : ''}`}>
            {d.frage}
          </span>
        </div>

        {/* Platz und Funken */}
        <div className="ww-rallye__hud" aria-live="polite">
          <span className="ww-rallye__platz">
            <span aria-hidden="true">🏁</span> {platz}.
          </span>
          {gesammelt > 0 && (
            <span className="ww-rallye__funken">
              <span aria-hidden="true">⭐</span> {gesammelt}
            </span>
          )}
        </div>

        <AnimatePresence>
          {meldung && (
            <motion.span
              key={meldung}
              className={`ww-rallye__meldung ww-rallye__meldung--${meldung}`}
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.2 }}
              aria-hidden="true"
            >
              {meldung === 'turbo' ? '🚀 Turbo!' : '💦 Schlamm!'}
            </motion.span>
          )}
        </AnimatePresence>

        {taskNo === 0 && !gelenkt && (
          <span className="ww-rallye__hinweis">👆 Tippe links · Mitte · rechts</span>
        )}

        <AnimatePresence>
          {ziel !== null && (
            <motion.div
              className="ww-rallye__ziel"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              role="status"
            >
              <span className="ww-rallye__zielflagge" aria-hidden="true">🏁</span>
              <strong>Ziel!</strong>
              <span className="ww-rallye__zielplatz">
                <span aria-hidden="true">{platzSymbol(ziel)}</span> {platzText(ziel)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spur wählen — die barrierefreie Steuerung, gleichzeitig die Antwortknöpfe */}
      <div className="ww-rallye__spuren" role="group" aria-label="Spur wählen">
        {d.optionen.map((opt, i) => {
          const tipp = revealSolution && i === antwortIdx
          return (
            <button
              key={`${taskNo}-${i}`}
              type="button"
              className={[
                'ww-rallye__spur',
                `ww-rallye__spur--${i}`,
                spur === i ? 'ww-rallye__spur--an' : '',
                falschIdx === i ? 'ww-rallye__spur--falsch' : '',
                tipp ? 'ww-rallye__spur--tipp' : '',
              ].join(' ')}
              onClick={() => steuereZuSpur(i)}
              aria-label={`Spur ${i + 1}: ${d.namen?.[opt] ?? opt}`}
              aria-pressed={spur === i}
            >
              <span className={`ww-rallye__spurtext ${[...opt].length > 8 ? 'ww-rallye__spurtext--lang' : ''}`}>
                {opt}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modul                                                               */
/* ------------------------------------------------------------------ */

export const flitzerRallye: GameModule<RallyeTask> = {
  id: 'flitzer-rallye',
  worldId: 'entdecker',
  title: 'Flitzer-Rallye',
  subtitle: 'Rennen fahren und durch das Tor mit der richtigen Antwort flitzen',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M6 70 Q40 50 74 70 L74 76 L6 76 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 66 L34 22 L46 22 L58 66 Z" fill="#8A8B8F" stroke="#2E4034" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 30 L40 60" stroke="#FBFDF8" strokeWidth="3" strokeDasharray="5 5" />
      <rect x="18" y="8" width="44" height="14" rx="4" fill="#F6BD41" stroke="#2E4034" strokeWidth="3" />
      <text x="40" y="19" fontSize="11" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">3 + 4</text>
      <g transform="translate(26 44)">
        <rect x="2" y="10" width="24" height="12" rx="4" fill="#E4634F" stroke="#2E4034" strokeWidth="3" />
        <rect x="8" y="3" width="12" height="8" rx="3" fill="#2E4034" />
        <circle cx="6" cy="24" r="4" fill="#2E4034" />
        <circle cx="22" cy="24" r="4" fill="#2E4034" />
      </g>
    </svg>
  ),
  generateTask,
  Component: FlitzerRallye,
  fillsStage: true,
  persistent: true,
  attemptWorldId: (task) => task.data.quelle,
}
