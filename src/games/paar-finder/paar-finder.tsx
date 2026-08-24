import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, randInt, sample, shuffle, type Rng } from '../rng'
import { anlaut, WORDS } from '../../learning/wordlist'
import { sfx } from '../../audio/AudioManager'
import { sprich } from '../../audio/tts'
import './paar-finder.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export interface Karte {
  id: string
  /** Karten mit gleichem paarId gehören zusammen */
  paarId: string
  text: string
  /** Vorlesetext beim Aufdecken */
  speak: string
}

export interface FinderData {
  karten: Karte[]
  paare: number
  /** Ab wie vielen Fehlversuchen es weniger Sterne gibt */
  freiVersuche: number
  frage: string
}

export type FinderTask = GameTask<FinderData>

const THEMEN: Record<string, string[]> = {
  tiere: ['🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🦁', '🐸', '🐵', '🐧', '🦉', '🐝'],
  essen: ['🍎', '🍌', '🍓', '🍇', '🍉', '🍒', '🍕', '🍞', '🧀', '🍪', '🥕', '🍋'],
  natur: ['🌳', '🌲', '🌷', '🌻', '🍄', '⭐', '🌙', '☀️', '❄️', '🌈', '🔥', '🍁'],
  dinge: ['🚗', '🚂', '⛵', '🚀', '⚽', '🎈', '🎁', '🎸', '📕', '🕯️', '👑', '🧦'],
}

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export function generateTask(difficulty: number, rng: Rng): FinderTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  const paareProStufe: Record<number, number> = {
    1: 3, 2: 4, 3: 6, 4: 8, 5: 8, 6: 6, 7: 10, 8: 6, 9: 12, 10: 12,
  }
  const paare = paareProStufe[lvl]

  let karten: Karte[] = []
  let frage = 'Finde die Paare!'

  if (lvl === 6) {
    // Bild ↔ Anlaut
    const worte = sample(
      rng,
      WORDS.filter((w) => w.wort.length >= 3),
      paare,
    )
    // Anlaute müssen eindeutig sein, sonst gäbe es zwei passende Karten
    const gesehen = new Set<string>()
    const eindeutig = worte.filter((w) => {
      const l = anlaut(w)
      if (gesehen.has(l)) return false
      gesehen.add(l)
      return true
    })
    const nachgefuellt = [...eindeutig]
    for (const w of shuffle(rng, WORDS)) {
      if (nachgefuellt.length >= paare) break
      const l = anlaut(w)
      if (gesehen.has(l)) continue
      gesehen.add(l)
      nachgefuellt.push(w)
    }
    karten = nachgefuellt.flatMap((w, i) => [
      { id: `b${i}`, paarId: `p${i}`, text: w.emoji, speak: w.wort },
      { id: `l${i}`, paarId: `p${i}`, text: anlaut(w), speak: anlaut(w) },
    ])
    frage = 'Finde Bild und Anfangsbuchstaben!'
  } else if (lvl === 8) {
    // Rechen-Paare: 2+3 ↔ 5
    const genutzt = new Set<number>()
    const paarListe: { term: string; wert: number }[] = []
    let guard = 0
    while (paarListe.length < paare && guard++ < 200) {
      const a = randInt(rng, 1, 9)
      const b = randInt(rng, 1, 9)
      const wert = a + b
      if (genutzt.has(wert)) continue // sonst passt eine Zahl zu zwei Termen
      genutzt.add(wert)
      paarListe.push({ term: `${a} + ${b}`, wert })
    }
    karten = paarListe.flatMap((p, i) => [
      { id: `t${i}`, paarId: `p${i}`, text: p.term, speak: `${p.term.replace('+', 'plus')}` },
      { id: `w${i}`, paarId: `p${i}`, text: String(p.wert), speak: String(p.wert) },
    ])
    frage = 'Finde Aufgabe und Ergebnis!'
  } else {
    // Klassisches Bild-Memory
    let pool: string[]
    if (lvl === 5) {
      // Themen-Mix
      pool = shuffle(rng, Object.values(THEMEN).flat())
    } else if (lvl === 10) {
      // ähnliche Motive – schwerer zu unterscheiden
      pool = shuffle(rng, THEMEN[pick(rng, Object.keys(THEMEN))])
      pool = [...pool, ...shuffle(rng, Object.values(THEMEN).flat())]
    } else {
      pool = shuffle(rng, THEMEN[pick(rng, Object.keys(THEMEN))])
    }
    const motive: string[] = []
    for (const m of pool) {
      if (motive.length >= paare) break
      if (!motive.includes(m)) motive.push(m)
    }
    karten = motive.flatMap((m, i) => [
      { id: `a${i}`, paarId: `p${i}`, text: m, speak: '' },
      { id: `b${i}`, paarId: `p${i}`, text: m, speak: '' },
    ])
  }

  return {
    data: {
      karten: shuffle(rng, karten),
      paare,
      freiVersuche: paare + 4,
      frage,
    },
    // Die "Lösung" ist die Menge der Paar-Ids – geprüft wird über das Brett.
    answer: karten.map((k) => k.paarId).filter((v, i, a) => a.indexOf(v) === i).sort(),
    speak: `${frage} Decke immer zwei Karten auf.`,
  }
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function PaarFinder({ task, onDone, onWrong, say }: GameComponentProps<FinderTask>) {
  const d = task.data
  const [offen, setOffen] = useState<string[]>([])
  const [gefunden, setGefunden] = useState<string[]>([])
  const [versuche, setVersuche] = useState(0)
  const [fehlversuche, setFehlversuche] = useState(0)
  const [start, setStart] = useState(() => Date.now())
  const [sperre, setSperre] = useState(false)
  const [wackelt, setWackelt] = useState<string[]>([])

  useEffect(() => {
    setOffen([])
    setGefunden([])
    setVersuche(0)
    setFehlversuche(0)
    setSperre(false)
    setWackelt([])
    setStart(Date.now())
  }, [task])

  function aufdecken(karte: Karte) {
    if (sperre) return
    if (offen.includes(karte.id) || gefunden.includes(karte.paarId)) return

    sfx('click')
    if (karte.speak) sprich(karte.speak)

    const nun = [...offen, karte.id]
    setOffen(nun)
    if (nun.length < 2) return

    setSperre(true)
    setVersuche((v) => v + 1)

    const [aId, bId] = nun
    const a = d.karten.find((k) => k.id === aId)!
    const b = d.karten.find((k) => k.id === bId)!

    if (a.paarId === b.paarId) {
      sfx('success')
      setTimeout(() => {
        const neuGefunden = [...gefunden, a.paarId]
        setGefunden(neuGefunden)
        setOffen([])
        setSperre(false)

        if (neuGefunden.length >= d.paare) {
          // Brett geschafft: mit wenigen Fehlversuchen zählt es als "richtig"
          const gutGespielt = versuche + 1 <= d.freiVersuche
          setTimeout(
            () => onDone({ correct: gutGespielt, usedHint: false, timeMs: Date.now() - start }),
            700,
          )
        }
      }, 520)
      return
    }

    // Kein Paar
    sfx('failSoft')
    setWackelt(nun)
    const neueFehl = fehlversuche + 1
    setFehlversuche(neueFehl)
    // Trost nur gelegentlich – sonst redet Funkel dem Kind die Konzentration weg
    if (neueFehl === 3) say('Merk dir gut, wo die Bilder waren.')
    onWrong(0)
    setTimeout(() => {
      setOffen([])
      setWackelt([])
      setSperre(false)
    }, 950)
  }

  const spalten = Math.min(4, Math.ceil(Math.sqrt(d.karten.length)))

  return (
    <>
      <p className="ww-finder__kopf">
        {d.frage}{' '}
        <span className="ww-finder__zaehler">
          {gefunden.length} / {d.paare}
        </span>
      </p>

      <div
        className="ww-finder__brett"
        style={{ gridTemplateColumns: `repeat(${spalten}, minmax(0, 1fr))` }}
      >
        {d.karten.map((k) => {
          const istOffen = offen.includes(k.id)
          const istGefunden = gefunden.includes(k.paarId)
          const zeigt = istOffen || istGefunden
          return (
            <motion.button
              key={k.id}
              type="button"
              className={`ww-karte ${zeigt ? 'ww-karte--offen' : ''} ${
                istGefunden ? 'ww-karte--gefunden' : ''
              } ${k.text.length > 2 ? 'ww-karte--text' : ''}`}
              onClick={() => aufdecken(k)}
              aria-label={zeigt ? `Karte zeigt ${k.speak || k.text}` : 'Verdeckte Karte'}
              animate={
                wackelt.includes(k.id)
                  ? { x: [0, -7, 7, -4, 0] }
                  : istGefunden
                    ? { scale: [1, 1.08, 1] }
                    : { x: 0, scale: 1 }
              }
              transition={{ duration: 0.42 }}
            >
              <span className="ww-karte__inner">
                {zeigt ? (
                  <span className="ww-karte__vorne">{k.text}</span>
                ) : (
                  <span className="ww-karte__ruecken" aria-hidden="true">
                    <Blatt />
                  </span>
                )}
              </span>
            </motion.button>
          )
        })}
      </div>
    </>
  )
}

/** Kartenrücken: das Wunderwald-Blatt. */
function Blatt() {
  return (
    <svg viewBox="0 0 60 60" width="70%" height="70%" aria-hidden="true">
      <path
        d="M10 50 Q6 20 30 12 Q54 6 52 30 Q50 52 26 52 Q16 52 10 50 Z"
        fill="#7FB069"
        stroke="#2E4034"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M13 50 Q30 34 48 20" fill="none" stroke="#2E4034" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export const paarFinder: GameModule<FinderTask> = {
  id: 'paar-finder',
  worldId: 'logik',
  title: 'Paar-Finder',
  subtitle: 'Merken und Paare finden',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="6" y="16" width="30" height="42" rx="6" fill="#7FB069" stroke="#2E4034" strokeWidth="4" />
      <rect x="44" y="16" width="30" height="42" rx="6" fill="#FBFDF8" stroke="#2E4034" strokeWidth="4" />
      <text x="59" y="46" fontSize="24" textAnchor="middle">🦊</text>
      <path d="M12 50 Q20 34 32 24" fill="none" stroke="#2E4034" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  generateTask,
  Component: PaarFinder,
  /** Sonderfall: 1 Runde = 1 Brett, nicht 6 Aufgaben. */
  tasksPerRound: 1,
}
