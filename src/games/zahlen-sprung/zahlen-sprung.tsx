import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { numberDistractors, pick, randInt, shuffle, type Rng } from '../rng'
import { useMeasuredBox } from '../paar-finder/useBoardLayout'
import { sfx } from '../../audio/AudioManager'
import { Funkel, type FunkelState } from '../../world/Funkel'
import {
  baueStrecke,
  wrapDelta,
  BODEN_H,
  BLOCK_H,
  BLOCK_Y,
  FUNKEL_H,
  FUNKEL_SCHIRM_X,
  GRAVITATION,
  SPRUNG_V0,
  type HindernisArt,
  type Strecke,
} from './strecke'
import './zahlen-sprung.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export type SprungArt =
  | 'erkennen'
  | 'zaehlen'
  | 'plus'
  | 'minus'
  | 'vergleich'
  | 'nachbar'
  | 'verdoppeln'
  | 'ergaenzen'
  | 'halbieren'
  | 'reihe'
  | 'mal'
  | 'zehner'
  | 'kette'
  | 'malluecke'

export interface SprungData {
  art: SprungArt
  /** Text auf dem Holzschild, z. B. "3 + 4 = ?" */
  schild: string
  /** Zählmenge auf dem Schild (Stufen 1–2) */
  menge: { emoji: string; anzahl: number } | null
  /** Punktebilder für Plus-Aufgaben (Stufe 3) */
  punkte: [number, number] | null
  /** Die drei Antwort-Blöcke in Streckenreihenfolge */
  bloecke: number[]
  /** Lauftempo in su/s */
  tempo: number
  /** Wie viele Hindernisse auf der Strecke stehen (0–3) */
  hindernisse: number
  /** Seed für die deterministische Strecke */
  streckeSeed: number
}

export type SprungTask = GameTask<SprungData>

const MENGEN = [
  { emoji: '🍎', name: 'Äpfel' },
  { emoji: '🍄', name: 'Pilze' },
  { emoji: '🍓', name: 'Erdbeeren' },
  { emoji: '🐞', name: 'Käfer' },
  { emoji: '🦋', name: 'Schmetterlinge' },
  { emoji: '🌰', name: 'Nüsse' },
] as const

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export function generateTask(difficulty: number, rng: Rng): SprungTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))
  const tempo = 22 + lvl * 1.6
  const hindernisse = lvl <= 2 ? 0 : lvl <= 4 ? 1 : lvl <= 7 ? 2 : 3
  const streckeSeed = Math.floor(rng() * 0x7fffffff)

  function build(
    art: SprungArt,
    schild: string,
    answer: number,
    speak: string,
    extras?: { menge?: SprungData['menge']; punkte?: SprungData['punkte']; optionen?: number[] },
  ): SprungTask {
    const spread = answer > 20 ? 100 : answer > 10 ? 40 : 20
    const bloecke =
      extras?.optionen ?? shuffle(rng, [answer, ...numberDistractors(rng, answer, 2, 0, spread)])
    return {
      data: {
        art,
        schild,
        menge: extras?.menge ?? null,
        punkte: extras?.punkte ?? null,
        bloecke,
        tempo,
        hindernisse,
        streckeSeed,
      },
      answer,
      speak,
    }
  }

  // Stufe 1: Ziffern 1–6 wiedererkennen, mit Zählmenge als Stütze
  if (lvl === 1) {
    const z = randInt(rng, 1, 6)
    const m = pick(rng, MENGEN)
    return build('erkennen', String(z), z, `Spring zum Block mit der ${z}!`, {
      menge: { emoji: m.emoji, anzahl: z },
    })
  }

  // Stufe 2: Mengen bis 9 zählen — oder Ziffern bis 10 erkennen
  if (lvl === 2) {
    if (rng() < 0.65) {
      const z = randInt(rng, 2, 9)
      const m = pick(rng, MENGEN)
      return build(
        'zaehlen',
        'Wie viele?',
        z,
        `Zähle die ${m.name}! Dann spring zum Block mit der richtigen Zahl.`,
        { menge: { emoji: m.emoji, anzahl: z } },
      )
    }
    const z = randInt(rng, 1, 10)
    return build('erkennen', String(z), z, `Spring zum Block mit der ${z}!`)
  }

  // Stufe 3: Plus bis 10, mit Punktebildern
  if (lvl === 3) {
    const a = randInt(rng, 1, 9)
    const b = randInt(rng, 1, 10 - a)
    return build('plus', `${a} + ${b} = ?`, a + b, `Wie viel ist ${a} plus ${b}? Spring zum richtigen Block!`, {
      punkte: [a, b],
    })
  }

  // Stufe 4: Minus bis 10 — oder größte/kleinste Zahl finden
  if (lvl === 4) {
    if (rng() < 0.5) {
      const a = randInt(rng, 2, 10)
      const b = randInt(rng, 1, a - 1)
      return build('minus', `${a} − ${b} = ?`, a - b, `Wie viel ist ${a} minus ${b}?`)
    }
    const werte = new Set<number>()
    while (werte.size < 3) werte.add(randInt(rng, 1, 20))
    const optionen = shuffle(rng, [...werte])
    const groesste = rng() < 0.5
    const answer = groesste ? Math.max(...optionen) : Math.min(...optionen)
    return build(
      'vergleich',
      groesste ? '⬆ Größte Zahl' : '⬇ Kleinste Zahl',
      answer,
      groesste
        ? 'Spring zum Block mit der größten Zahl!'
        : 'Spring zum Block mit der kleinsten Zahl!',
      { optionen },
    )
  }

  // Stufe 5: Plus/Minus bis 20 ohne Zehnerübergang — oder Nachbarzahlen
  if (lvl === 5) {
    const wurf = rng()
    if (wurf < 0.35) {
      const zehner = randInt(rng, 0, 1) * 10
      const a = zehner + randInt(rng, 1, 8)
      const b = randInt(rng, 1, 9 - (a % 10))
      return build('plus', `${a} + ${b} = ?`, a + b, `Wie viel ist ${a} plus ${b}?`)
    }
    if (wurf < 0.7) {
      const a = randInt(rng, 11, 19)
      const b = randInt(rng, 1, a % 10)
      return build('minus', `${a} − ${b} = ?`, a - b, `Wie viel ist ${a} minus ${b}?`)
    }
    if (rng() < 0.5) {
      const n = randInt(rng, 1, 19)
      return build('nachbar', `${n} → ?`, n + 1, `Welche Zahl kommt direkt nach ${n}?`)
    }
    const n = randInt(rng, 2, 20)
    return build('nachbar', `? → ${n}`, n - 1, `Welche Zahl kommt direkt vor ${n}?`)
  }

  // Stufe 6: Zehnerübergang — oder Verdoppeln
  if (lvl === 6) {
    const wurf = rng()
    if (wurf < 0.35) {
      const a = randInt(rng, 4, 9)
      const b = randInt(rng, 11 - a, 9)
      return build('plus', `${a} + ${b} = ?`, a + b, `Wie viel ist ${a} plus ${b}?`)
    }
    if (wurf < 0.7) {
      const a = randInt(rng, 11, 18)
      const b = randInt(rng, (a % 10) + 1, 9)
      return build('minus', `${a} − ${b} = ?`, a - b, `Wie viel ist ${a} minus ${b}?`)
    }
    const a = randInt(rng, 2, 10)
    return build('verdoppeln', `${a} + ${a} = ?`, a + a, `Verdopple! Wie viel ist ${a} plus ${a}?`)
  }

  // Stufe 7: Ergänzen — oder Halbieren
  if (lvl === 7) {
    if (rng() < 0.5) {
      const summe = randInt(rng, 8, 20)
      const b = randInt(rng, 1, summe - 1)
      return build('ergaenzen', `? + ${b} = ${summe}`, summe - b, `Was fehlt? Wie viel plus ${b} ergibt ${summe}?`)
    }
    const h = randInt(rng, 2, 10)
    return build('halbieren', `${h * 2} : 2 = ?`, h, `Wie viel ist die Hälfte von ${h * 2}?`)
  }

  // Stufe 8: Zahlenreihen fortsetzen — oder 2er-, 5er-, 10er-Einmaleins
  if (lvl === 8) {
    if (rng() < 0.5) {
      const schritt = pick(rng, [2, 5, 10])
      const start = schritt * randInt(rng, 1, 4)
      const folge = [start, start + schritt, start + 2 * schritt]
      return build(
        'reihe',
        `${folge.join(', ')}, ?`,
        start + 3 * schritt,
        `Wie geht die Reihe weiter? ${folge.join(', ')} — und dann?`,
      )
    }
    const reihe = pick(rng, [2, 5, 10])
    const n = randInt(rng, 1, 10)
    return build('mal', `${reihe} · ${n} = ?`, reihe * n, `Wie viel ist ${reihe} mal ${n}?`)
  }

  // Stufe 9: Einmaleins gemischt — oder runde Zehner bis 100
  if (lvl === 9) {
    if (rng() < 0.5) {
      const a = randInt(rng, 2, 10)
      const b = randInt(rng, 2, 10)
      return build('mal', `${a} · ${b} = ?`, a * b, `Wie viel ist ${a} mal ${b}?`)
    }
    if (rng() < 0.5) {
      const a = randInt(rng, 1, 8) * 10
      const b = randInt(rng, 1, 10 - a / 10) * 10
      return build('zehner', `${a} + ${b} = ?`, a + b, `Wie viel ist ${a} plus ${b}?`)
    }
    const a = randInt(rng, 2, 10) * 10
    const b = randInt(rng, 1, a / 10 - 1) * 10
    return build('zehner', `${a} − ${b} = ?`, a - b, `Wie viel ist ${a} minus ${b}?`)
  }

  // Stufe 10: Klammer-Ketten — oder Einmaleins mit Lücke
  if (rng() < 0.5) {
    const a = randInt(rng, 2, 9)
    const b = randInt(rng, 1, 9)
    if (rng() < 0.5) {
      const c = randInt(rng, 1, a + b - 1)
      return build(
        'kette',
        `(${a} + ${b}) − ${c} = ?`,
        a + b - c,
        `Rechne zuerst in der Klammer: ${a} plus ${b}. Davon ${c} weg.`,
      )
    }
    const d = randInt(rng, 1, 9)
    return build(
      'kette',
      `(${a} + ${b}) + ${d} = ?`,
      a + b + d,
      `Rechne zuerst in der Klammer: ${a} plus ${b}. Dazu ${d}.`,
    )
  }
  const a = randInt(rng, 2, 9)
  const x = randInt(rng, 2, 9)
  return build('malluecke', `${a} · ? = ${a * x}`, x, `${a} mal wie viel ergibt ${a * x}?`)
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

/** Veränderlicher Laufzustand — lebt in einer Ref, nie im React-State. */
interface Lauf {
  s: number
  v: number
  y: number
  vy: number
  springend: boolean
  /** verhindert, dass ein Sprung zwei Blöcke trifft */
  sprungVerbraucht: boolean
  /** Blockindex, zu dem Funkel gerade selbst hinläuft */
  ziel: number | null
  /** Sprungwunsch kurz vor der Landung wird gemerkt (Puffer für Kinderfinger) */
  sprungGewuenscht: number
  /** Hindernis-Karenz nach einem Rempler */
  rempelSperre: number
  vorbei: boolean
  eingesammelt: Set<number>
}

function ZahlenSprung({ task, onDone, onWrong, revealSolution, taskNo }: GameComponentProps<SprungTask>) {
  const d = task.data
  const { ref: szeneRef, box } = useMeasuredBox<HTMLDivElement>()

  const [kaputt, setKaputt] = useState<number | null>(null)
  const [getroffen, setGetroffen] = useState<number | null>(null)
  const [funkenZahl, setFunkenZahl] = useState(0)
  const [gehuepft, setGehuepft] = useState(false)
  const [laune, setLaune] = useState<FunkelState>('idle')

  const start = useRef(Date.now())
  const triesRef = useRef(0)
  const kaputtTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ---------- Maße: 1 su = 1 % der Szenenhöhe ---------- */
  const ppu = box.height > 0 ? box.height / 100 : 0
  const breiteSu = ppu > 0 ? box.width / ppu : 0
  const bereit = ppu > 0 && breiteSu > 0

  const strecke: Strecke | null = useMemo(
    () => (bereit ? baueStrecke(d.streckeSeed, breiteSu, d.hindernisse) : null),
    [bereit, d.streckeSeed, breiteSu, d.hindernisse],
  )

  const richtigIdx = d.bloecke.indexOf(task.answer as number)

  /* ---------- Element-Refs für die Frame-Schleife ---------- */
  const funkelRef = useRef<HTMLDivElement | null>(null)
  const staubRef = useRef<HTMLDivElement | null>(null)
  const bodenRef = useRef<HTMLDivElement | null>(null)
  const huegelFernRef = useRef<HTMLDivElement | null>(null)
  const huegelNahRef = useRef<HTMLDivElement | null>(null)
  const blockRefs = useRef<(HTMLButtonElement | null)[]>([])
  const hindernisRefs = useRef<(HTMLDivElement | null)[]>([])
  const funkenRefs = useRef<(HTMLDivElement | null)[]>([])

  const lauf = useRef<Lauf>({
    s: 0,
    v: d.tempo,
    y: 0,
    vy: 0,
    springend: false,
    sprungVerbraucht: false,
    ziel: null,
    sprungGewuenscht: 0,
    rempelSperre: 0,
    vorbei: false,
    eingesammelt: new Set(),
  })

  /* Die Schleife liest Layout und Strecke aus Refs — so bleibt sie stabil. */
  const rahmen = useRef({ ppu, breiteSu, strecke })
  rahmen.current = { ppu, breiteSu, strecke }

  const springe = useCallback(() => {
    const l = lauf.current
    if (l.vorbei) return
    if (l.springend) {
      l.sprungGewuenscht = performance.now()
      return
    }
    l.springend = true
    l.sprungVerbraucht = false
    l.vy = SPRUNG_V0
    sfx('hop')
    setGehuepft(true)
  }, [])

  /* ---------- Treffer auf einen Block ---------- */
  const treffeBlock = useCallback(
    (idx: number) => {
      const l = lauf.current
      if (l.vorbei) return
      l.ziel = null
      if (idx === richtigIdx) {
        l.vorbei = true
        setGetroffen(idx)
        setLaune('jubelt')
        sfx('pop')
        onDone({ correct: true, usedHint: triesRef.current >= 2, timeMs: Date.now() - start.current })
        return
      }
      triesRef.current += 1
      setKaputt(idx)
      setLaune('troestet')
      if (kaputtTimer.current) clearTimeout(kaputtTimer.current)
      kaputtTimer.current = setTimeout(() => {
        setKaputt(null)
        setLaune('idle')
      }, 900)
      onWrong(triesRef.current)
    },
    [richtigIdx, onDone, onWrong],
  )

  /* ---------- Block angetippt: Funkel flitzt hin und springt selbst ---------- */
  const steuereZu = useCallback((idx: number) => {
    const l = lauf.current
    if (l.vorbei) return
    l.ziel = idx
    setGehuepft(true)
  }, [])

  /* ---------- Aufgabe gewechselt: Zustand zurücksetzen ---------- */
  useEffect(() => {
    triesRef.current = 0
    setKaputt(null)
    setGetroffen(null)
    setFunkenZahl(0)
    setLaune('idle')
    start.current = Date.now()
    lauf.current = {
      s: 0,
      v: d.tempo,
      y: 0,
      vy: 0,
      springend: false,
      sprungVerbraucht: false,
      ziel: null,
      sprungGewuenscht: 0,
      rempelSperre: 0,
      vorbei: false,
      eingesammelt: new Set(),
    }
    return () => {
      if (kaputtTimer.current) clearTimeout(kaputtTimer.current)
    }
  }, [task, d.tempo])

  /* ---------- Tastatur: Leertaste springt, 1–3 wählt einen Block ---------- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault()
        springe()
      } else if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) {
        steuereZu(Number(e.code.slice(-1)) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [springe, steuereZu])

  /* ---------- Die Frame-Schleife ---------- */
  useEffect(() => {
    if (!bereit) return
    let raf = 0
    let vorher = performance.now()

    const tick = (jetzt: number) => {
      raf = requestAnimationFrame(tick)
      // Nach Tab-Wechseln oder Rucklern keine Riesenschritte machen.
      const dt = Math.min(0.05, (jetzt - vorher) / 1000)
      vorher = jetzt

      const { ppu, strecke } = rahmen.current
      if (!strecke || ppu <= 0) return
      const l = lauf.current
      const L = strecke.laenge

      /* Tempo: selbst gesteuert Richtung Ziel-Block, sonst Reisetempo. */
      if (l.ziel !== null) {
        const dZiel = wrapDelta(strecke.bloecke[l.ziel], l.s, L)
        l.v = Math.max(-110, Math.min(130, dZiel * 2.6))
        if (Math.abs(dZiel) < 3 && !l.springend && !l.vorbei) {
          l.springend = true
          l.sprungVerbraucht = false
          l.vy = SPRUNG_V0
          sfx('hop')
        }
      } else if (l.vorbei) {
        l.v += (0 - l.v) * Math.min(1, dt * 5)
      } else {
        l.v += (d.tempo - l.v) * Math.min(1, dt * 3)
      }

      l.s = (((l.s + l.v * dt) % L) + L) % L

      /* Sprungphysik */
      if (l.springend) {
        l.y += l.vy * dt
        l.vy -= GRAVITATION * dt
        if (l.y <= 0) {
          l.y = 0
          l.vy = 0
          l.springend = false
          if (staubRef.current) {
            staubRef.current.classList.remove('ww-sprung__staub--an')
            void staubRef.current.offsetWidth
            staubRef.current.classList.add('ww-sprung__staub--an')
          }
          // Gemerkter Sprungwunsch: sofort wieder hoch.
          if (performance.now() - l.sprungGewuenscht < 160 && !l.vorbei) {
            l.springend = true
            l.sprungVerbraucht = false
            l.vy = SPRUNG_V0
            sfx('hop')
          }
        }
      }

      const blockPx = Math.max(46, BLOCK_H * ppu)
      const blockSu = blockPx / ppu
      const kopf = l.y + FUNKEL_H

      /* Block-Treffer: nur im Steigen, ein Treffer je Sprung. */
      if (l.springend && !l.sprungVerbraucht && l.vy > 0 && kopf >= BLOCK_Y && !l.vorbei) {
        const fenster = blockSu * 0.5 + 5
        let bester = -1
        let besterAbstand = Infinity
        strecke.bloecke.forEach((bx, i) => {
          const abstand = Math.abs(wrapDelta(bx, l.s, L))
          if (abstand < fenster && abstand < besterAbstand) {
            bester = i
            besterAbstand = abstand
          }
        })
        if (bester >= 0) {
          l.sprungVerbraucht = true
          l.vy = Math.min(l.vy, -60)
          treffeBlock(bester)
        }
      }

      /* Funken einsammeln */
      strecke.funken.forEach((f, i) => {
        if (l.eingesammelt.has(i)) return
        const abstand = Math.abs(wrapDelta(f.x, l.s, L))
        if (abstand < 7 && Math.abs(f.y - (l.y + FUNKEL_H * 0.55)) < 10) {
          l.eingesammelt.add(i)
          sfx('star')
          setFunkenZahl(l.eingesammelt.size)
          const el = funkenRefs.current[i]
          if (el) el.classList.add('ww-sprung__funke--weg')
        }
      })

      /* Hindernisse: sanfter Rempler, nie Strafe. */
      if (l.ziel === null && !l.vorbei && l.y < 6 && jetzt > l.rempelSperre) {
        for (const h of strecke.hindernisse) {
          if (Math.abs(wrapDelta(h.x, l.s, L)) < 7) {
            l.rempelSperre = jetzt + 900
            l.s = ((l.s - 16) % L + L) % L
            sfx('rustle')
            if (funkelRef.current) {
              funkelRef.current.classList.remove('ww-sprung__funkel--rempler')
              void funkelRef.current.offsetWidth
              funkelRef.current.classList.add('ww-sprung__funkel--rempler')
            }
            break
          }
        }
      }

      /* ---------- Zeichnen ---------- */
      const ankerPx = box.width * FUNKEL_SCHIRM_X
      const px = (weltX: number) => ankerPx + wrapDelta(weltX, l.s, L) * ppu

      if (funkelRef.current) {
        const neigung = l.springend ? (l.vy > 0 ? -10 : 7) : 0
        funkelRef.current.style.transform = `translateY(${-l.y * ppu}px) rotate(${neigung}deg)`
      }
      if (bodenRef.current) bodenRef.current.style.backgroundPositionX = `${-l.s * ppu}px`
      if (huegelNahRef.current) huegelNahRef.current.style.backgroundPositionX = `${-l.s * ppu * 0.45}px`
      if (huegelFernRef.current) huegelFernRef.current.style.backgroundPositionX = `${-l.s * ppu * 0.2}px`

      const male = (el: HTMLElement | null, weltX: number) => {
        if (!el) return
        const x = px(weltX)
        if (x < -120 || x > box.width + 120) {
          el.style.visibility = 'hidden'
        } else {
          el.style.visibility = 'visible'
          el.style.transform = `translateX(${x}px)`
        }
      }
      strecke.bloecke.forEach((bx, i) => male(blockRefs.current[i], bx))
      strecke.hindernisse.forEach((h, i) => male(hindernisRefs.current[i], h.x))
      strecke.funken.forEach((f, i) => male(funkenRefs.current[i], f.x))
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bereit, task, d.tempo, treffeBlock, box.width])

  /* ---------- Render ---------- */
  const blockPx = Math.max(46, BLOCK_H * ppu)
  const bodenPx = BODEN_H * ppu
  const funkelGroesse = Math.max(56, FUNKEL_H * ppu * 1.15)
  const hindernisBreite = Math.max(30, 11 * ppu)
  const funkeBreite = Math.max(22, 6 * ppu)

  return (
    <div className="ww-sprung" data-aufgabe={taskNo ?? 0}>
      {/* Holzschild mit der Aufgabe */}
      <div className="ww-sprung__schild" role="heading" aria-level={2}>
        <span className={`ww-sprung__frage ${d.schild.length > 8 ? 'ww-sprung__frage--lang' : ''}`}>
          {d.schild}
        </span>
        {d.menge && (
          <span className="ww-sprung__menge" aria-hidden="true">
            {Array.from({ length: d.menge.anzahl }, (_, i) => (
              <span key={i}>{d.menge!.emoji}</span>
            ))}
          </span>
        )}
        {d.punkte && (
          <span className="ww-sprung__punktezeile" aria-hidden="true">
            <PunkteGruppe n={d.punkte[0]} />
            <span className="ww-sprung__punkteplus">+</span>
            <PunkteGruppe n={d.punkte[1]} />
          </span>
        )}
      </div>

      {/* Die laufende Szene */}
      <div
        ref={szeneRef}
        className="ww-sprung__szene"
        onPointerDown={springe}
        aria-label="Spielfläche — tippen lässt Funkel springen"
      >
        <div ref={huegelFernRef} className="ww-sprung__huegel ww-sprung__huegel--fern" aria-hidden="true" />
        <div ref={huegelNahRef} className="ww-sprung__huegel ww-sprung__huegel--nah" aria-hidden="true" />
        <div className="ww-sprung__wolke ww-sprung__wolke--eins" aria-hidden="true" />
        <div className="ww-sprung__wolke ww-sprung__wolke--zwei" aria-hidden="true" />

        {bereit && strecke && (
          <>
            {/* Antwort-Blöcke: von unten anspringen — oder antippen */}
            {strecke.bloecke.map((_, i) => {
              const tipp = revealSolution && i === richtigIdx
              return (
                <button
                  key={i}
                  ref={(el) => (blockRefs.current[i] = el)}
                  type="button"
                  className={[
                    'ww-sprung__block',
                    kaputt === i ? 'ww-sprung__block--kaputt' : '',
                    getroffen === i ? 'ww-sprung__block--getroffen' : '',
                    tipp ? 'ww-sprung__block--tipp' : '',
                  ].join(' ')}
                  style={{
                    width: blockPx,
                    height: blockPx,
                    bottom: bodenPx + BLOCK_Y * ppu,
                    marginLeft: -blockPx / 2,
                    fontSize: Math.max(19, blockPx * 0.42),
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    steuereZu(i)
                  }}
                  aria-label={`Block mit der ${d.bloecke[i]}`}
                >
                  <span className="ww-sprung__blockwert">{d.bloecke[i]}</span>
                  {getroffen === i &&
                    Array.from({ length: 6 }, (_, k) => (
                      <i
                        key={k}
                        className="ww-sprung__splitter"
                        style={{ '--winkel': `${k * 60}deg` } as CSSProperties}
                      />
                    ))}
                </button>
              )
            })}

            {/* Hindernisse */}
            {strecke.hindernisse.map((h, i) => (
              <div
                key={i}
                ref={(el) => (hindernisRefs.current[i] = el)}
                className="ww-sprung__hindernis"
                style={{
                  bottom: bodenPx,
                  width: hindernisBreite,
                  height: Math.max(24, 9 * ppu),
                  marginLeft: -hindernisBreite / 2,
                }}
                aria-hidden="true"
              >
                <Hindernis art={h.art} />
              </div>
            ))}

            {/* Funken */}
            {strecke.funken.map((f, i) => (
              <div
                key={i}
                ref={(el) => (funkenRefs.current[i] = el)}
                className="ww-sprung__funke"
                style={{ bottom: bodenPx + f.y * ppu, width: funkeBreite, marginLeft: -funkeBreite / 2 }}
                aria-hidden="true"
              >
                <FunkeStern />
              </div>
            ))}
          </>
        )}

        {/* Funkel läuft an fester Schirmposition */}
        <div
          className="ww-sprung__laeufer"
          style={{
            left: box.width * FUNKEL_SCHIRM_X,
            bottom: bodenPx,
            width: funkelGroesse,
            marginLeft: -funkelGroesse / 2,
          }}
        >
          <div ref={funkelRef} className="ww-sprung__funkel">
            <Funkel state={laune} size={funkelGroesse} />
          </div>
          <div ref={staubRef} className="ww-sprung__staub" aria-hidden="true" />
        </div>

        <div ref={bodenRef} className="ww-sprung__boden" style={{ height: bodenPx }} aria-hidden="true" />

        {/* Gesammelte Funken */}
        {funkenZahl > 0 && (
          <span className="ww-sprung__zaehler" aria-label={`${funkenZahl} Funken gesammelt`}>
            <FunkeStern /> × {funkenZahl}
          </span>
        )}

        {/* Erste Runde: kurzer Hinweis, wie man springt */}
        {(taskNo ?? 0) === 0 && !gehuepft && (
          <span className="ww-sprung__hinweis">👆 Tippen = springen</span>
        )}
      </div>
    </div>
  )
}

function PunkteGruppe({ n }: { n: number }) {
  return (
    <span className="ww-sprung__punktegruppe">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="ww-sprung__punkt" />
      ))}
    </span>
  )
}

function FunkeStern() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 1 L14.6 9.4 L23 12 L14.6 14.6 L12 23 L9.4 14.6 L1 12 L9.4 9.4 Z"
        fill="#F6BD41"
        stroke="#2E4034"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Hindernis({ art }: { art: HindernisArt }) {
  if (art === 'busch') {
    return (
      <svg viewBox="0 0 44 36" aria-hidden="true">
        <circle cx="13" cy="24" r="11" fill="#7FB069" stroke="#2E4034" strokeWidth="3" />
        <circle cx="31" cy="24" r="11" fill="#7FB069" stroke="#2E4034" strokeWidth="3" />
        <circle cx="22" cy="15" r="11" fill="#8FBE7A" stroke="#2E4034" strokeWidth="3" />
      </svg>
    )
  }
  if (art === 'stein') {
    return (
      <svg viewBox="0 0 44 36" aria-hidden="true">
        <path
          d="M8 34 Q2 22 12 12 Q24 4 36 14 Q44 24 36 34 Z"
          fill="#B8C4BC"
          stroke="#2E4034"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M16 18 q6 -4 12 0" fill="none" stroke="#2E4034" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 44 36" aria-hidden="true">
      <rect x="2" y="12" width="40" height="20" rx="9" fill="#B98A5E" stroke="#2E4034" strokeWidth="3" />
      <ellipse cx="38" cy="22" rx="5" ry="8" fill="#D9B08C" stroke="#2E4034" strokeWidth="3" />
      <ellipse cx="38" cy="22" rx="2" ry="3.5" fill="none" stroke="#2E4034" strokeWidth="2" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Modul                                                               */
/* ------------------------------------------------------------------ */

export const zahlenSprung: GameModule<SprungTask> = {
  id: 'zahlen-sprung',
  worldId: 'zahlen',
  title: 'Zahlen-Sprung',
  subtitle: 'Renn, spring und triff das Ergebnis',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="0" y="62" width="80" height="18" fill="#7FB069" stroke="#2E4034" strokeWidth="4" />
      <rect x="42" y="14" width="26" height="26" rx="6" fill="#F6BD41" stroke="#2E4034" strokeWidth="4" />
      <text
        x="55"
        y="34"
        fontSize="20"
        fontFamily="Fredoka, sans-serif"
        fontWeight="600"
        fill="#2E4034"
        textAnchor="middle"
      >
        7
      </text>
      <path
        d="M10 58 Q22 30 46 44"
        fill="none"
        stroke="#E4634F"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 8"
      />
      <circle cx="14" cy="56" r="8" fill="#E4634F" stroke="#2E4034" strokeWidth="3.5" />
      <path d="M9 51 L6 44 L14 48 Z" fill="#E4634F" stroke="#2E4034" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  ),
  generateTask,
  Component: ZahlenSprung,
  fillsStage: true,
}
