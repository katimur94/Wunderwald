import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, sample, shuffle, type Rng } from '../rng'
import {
  WORDS,
  wordsWithLetters,
  wordsWithSyllables,
  type WordEntry,
} from '../../learning/wordlist'
import { useDragDrop } from '../useDragDrop'
import { sprich } from '../../audio/tts'
import { sfx } from '../../audio/AudioManager'
import './wort-baukasten.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export type BaukastenMode = 'silben' | 'buchstaben' | 'satz'

export interface Baustein {
  id: string
  text: string
}

export interface BaukastenData {
  mode: BaukastenMode
  emoji: string
  wort: string
  /** Die Bausteine in der richtigen Reihenfolge – das ist die Lösung */
  loesung: string[]
  /** Alle verfügbaren Bausteine, gemischt (inkl. Ablenker) */
  bausteine: Baustein[]
  /** Satzschablone bei mode 'satz', z. B. "Der ___ schläft" */
  satz?: string
  frage: string
}

export type BaukastenTask = GameTask<BaukastenData>

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

const SATZ_SCHABLONEN = [
  { vorne: 'Der', hinten: 'schläft.', passt: (w: WordEntry) => TIERE_MASK.includes(w.wort) },
  { vorne: 'Die', hinten: 'schläft.', passt: (w: WordEntry) => TIERE_FEM.includes(w.wort) },
  { vorne: 'Das', hinten: 'ist groß.', passt: (w: WordEntry) => DINGE_NEUT.includes(w.wort) },
  { vorne: 'Der', hinten: 'ist bunt.', passt: (w: WordEntry) => DINGE_MASK.includes(w.wort) },
  { vorne: 'Die', hinten: 'ist rund.', passt: (w: WordEntry) => DINGE_FEM.includes(w.wort) },
]

const TIERE_MASK = ['Hund', 'Fuchs', 'Igel', 'Tiger', 'Löwe', 'Panda', 'Wurm', 'Frosch', 'Vogel']
const TIERE_FEM = ['Katze', 'Maus', 'Biene', 'Ente', 'Eule', 'Schlange', 'Schnecke']
const DINGE_NEUT = ['Haus', 'Boot', 'Buch', 'Ei', 'Nest', 'Herz', 'Dach', 'Ohr', 'Eis']
const DINGE_MASK = ['Ball', 'Baum', 'Hut', 'Ring', 'Stern', 'Pilz', 'Mond', 'Zug']
const DINGE_FEM = ['Blume', 'Sonne', 'Torte', 'Uhr', 'Krone', 'Melone', 'Tomate', 'Orange']

const byWord = new Map(WORDS.map((w) => [w.wort, w]))

function makeBausteine(rng: Rng, loesung: string[], ablenker: string[]): Baustein[] {
  const all = [
    ...loesung.map((text, i) => ({ id: `l${i}`, text })),
    ...ablenker.map((text, i) => ({ id: `a${i}`, text })),
  ]
  return shuffle(rng, all)
}

/** Ablenker-Silben aus anderen Wörtern, die nicht in der Lösung vorkommen. */
function silbenAblenker(rng: Rng, loesung: string[], count: number): string[] {
  const pool = [...new Set(WORDS.flatMap((w) => w.silben))].filter((s) => !loesung.includes(s))
  return sample(rng, pool, count)
}

/** Ablenker-Buchstaben, die im Wort nicht vorkommen. */
function buchstabenAblenker(rng: Rng, wort: string, count: number): string[] {
  const drin = new Set(wort.toLowerCase().split(''))
  const pool = 'abcdefghiklmnoprstuwz'.split('').filter((c) => !drin.has(c))
  return sample(rng, pool, count)
}

export function generateTask(difficulty: number, rng: Rng): BaukastenTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  // Stufen 1–2: zweisilbige Wörter aus 2 Silbenbausteinen (+1 Ablenker ab Stufe 2)
  if (lvl <= 2) {
    const word = pick(rng, wordsWithSyllables(2))
    const ablenker = lvl === 1 ? [] : silbenAblenker(rng, word.silben, 1)
    return silbenTask(rng, word, ablenker)
  }

  // Stufen 3–4: dreisilbige Wörter
  if (lvl <= 4) {
    const word = pick(rng, wordsWithSyllables(3))
    const ablenker = silbenAblenker(rng, word.silben, lvl === 3 ? 1 : 2)
    return silbenTask(rng, word, ablenker)
  }

  // Stufen 5–6: Wort aus einzelnen Buchstaben (3–4 Buchstaben)
  if (lvl <= 6) {
    const word = pick(rng, wordsWithLetters(3, 4))
    const ablenker = lvl === 5 ? [] : buchstabenAblenker(rng, word.wort, 1)
    return buchstabenTask(rng, word, ablenker)
  }

  // Stufen 7–8: 5–6 Buchstaben, mit Ablenkern
  if (lvl <= 8) {
    const word = pick(rng, wordsWithLetters(5, 6))
    const ablenker = buchstabenAblenker(rng, word.wort, lvl === 7 ? 1 : 2)
    return buchstabenTask(rng, word, ablenker)
  }

  // Stufen 9–10: Lückensatz bauen
  const schablone = pick(
    rng,
    SATZ_SCHABLONEN.filter((s) => WORDS.some((w) => s.passt(w) && byWord.has(w.wort))),
  )
  const kandidaten = WORDS.filter((w) => schablone.passt(w))
  const word = pick(rng, kandidaten)
  const ablenkerWorte = sample(
    rng,
    kandidaten.filter((w) => w.wort !== word.wort),
    lvl === 9 ? 1 : 2,
  ).map((w) => w.wort)

  const satz = `${schablone.vorne} ___ ${schablone.hinten}`
  return {
    data: {
      mode: 'satz',
      emoji: word.emoji,
      wort: word.wort,
      loesung: [word.wort],
      bausteine: makeBausteine(rng, [word.wort], ablenkerWorte),
      satz,
      frage: 'Welches Wort passt in die Lücke?',
    },
    answer: [word.wort],
    speak: `${schablone.vorne} … ${schablone.hinten} Welches Wort passt in die Lücke?`,
  }
}

function silbenTask(rng: Rng, word: WordEntry, ablenker: string[]): BaukastenTask {
  return {
    data: {
      mode: 'silben',
      emoji: word.emoji,
      wort: word.wort,
      loesung: word.silben,
      bausteine: makeBausteine(rng, word.silben, ablenker),
      frage: 'Bau das Wort aus den Silben.',
    },
    answer: word.silben,
    speak: `Bau das Wort ${word.wort} aus den Silben.`,
  }
}

function buchstabenTask(rng: Rng, word: WordEntry, ablenker: string[]): BaukastenTask {
  const loesung = word.wort.split('')
  return {
    data: {
      mode: 'buchstaben',
      emoji: word.emoji,
      wort: word.wort,
      loesung,
      bausteine: makeBausteine(rng, loesung, ablenker),
      frage: 'Bau das Wort aus den Buchstaben.',
    },
    answer: loesung,
    speak: `Bau das Wort ${word.wort} Buchstabe für Buchstabe.`,
  }
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function WortBaukasten({ task, onDone, onWrong, revealSolution }: GameComponentProps<BaukastenTask>) {
  const d = task.data
  const [slots, setSlots] = useState<(Baustein | null)[]>(() => d.loesung.map(() => null))
  const [tries, setTries] = useState(0)
  const [start, setStart] = useState(() => Date.now())
  const [bounceId, setBounceId] = useState<string | null>(null)
  const [fertig, setFertig] = useState(false)

  useEffect(() => {
    setSlots(d.loesung.map(() => null))
    setTries(0)
    setBounceId(null)
    setFertig(false)
    setStart(Date.now())
  }, [task, d.loesung])

  const usedIds = new Set(slots.filter(Boolean).map((s) => s!.id))
  const vorrat = d.bausteine.filter((b) => !usedIds.has(b.id))

  const place = useCallback(
    (dragId: string, zoneId: string | null) => {
      if (fertig) return
      const stein = d.bausteine.find((b) => b.id === dragId)
      if (!stein) return

      // Zurück in den Vorrat gelegt
      if (zoneId === null || zoneId === 'vorrat') {
        setSlots((s) => s.map((x) => (x?.id === dragId ? null : x)))
        return
      }

      const slotIndex = Number(zoneId.replace('slot-', ''))
      if (Number.isNaN(slotIndex)) return

      const richtig = d.loesung[slotIndex] === stein.text

      if (!richtig) {
        // Falscher Baustein hüpft zurück
        sfx('failSoft')
        setBounceId(dragId)
        setTimeout(() => setBounceId(null), 520)
        const n = tries + 1
        setTries(n)
        onWrong(n)
        return
      }

      sfx('pop')
      // Funkel spricht jedes korrekt platzierte Stück
      sprich(d.mode === 'buchstaben' ? stein.text.toUpperCase() : stein.text)

      const next = slots.map((x, i) => (i === slotIndex ? stein : x?.id === dragId ? null : x))
      setSlots(next)

      if (next.every((x, i) => x?.text === d.loesung[i])) {
        setFertig(true)
        sfx('success')
        setTimeout(() => sprich(d.wort), 260)
        setTimeout(
          () => onDone({ correct: true, usedHint: tries >= 2, timeMs: Date.now() - start }),
          1100,
        )
      }
    },
    [d, slots, tries, fertig, onDone, onWrong, start],
  )

  const { drag, hoverZone, start: startDrag, registerZone } = useDragDrop({ onDrop: place })

  /** Nach dem 2. Fehler zeigt Funkel den nächsten richtigen Baustein. */
  const naechsterRichtiger = revealSolution
    ? d.bausteine.find(
        (b) => !usedIds.has(b.id) && b.text === d.loesung[slots.findIndex((s) => s === null)],
      )
    : undefined

  return (
    <>
      <div className="ww-bau__kopf">
        <button
          type="button"
          className="ww-bau__bild"
          onClick={() => sprich(d.wort)}
          aria-label={`${d.wort} anhören`}
        >
          <span aria-hidden="true">{d.emoji}</span>
        </button>
        <p className="ww-bau__frage">{d.frage}</p>
      </div>

      {d.satz && (
        <p className="ww-bau__satz">
          {d.satz.split('___')[0]}
          <span className="ww-bau__satzluecke" />
          {d.satz.split('___')[1]}
        </p>
      )}

      <div className={`ww-bau__slots ww-bau__slots--${d.mode} ${fertig ? 'ww-bau__slots--fertig' : ''}`}>
        {slots.map((s, i) => (
          <div
            key={i}
            ref={(el) => registerZone(`slot-${i}`, el)}
            className={`ww-slot ${s ? 'ww-slot--voll' : ''} ${
              hoverZone === `slot-${i}` ? 'ww-slot--hover' : ''
            }`}
            aria-label={s ? `Feld ${i + 1}: ${s.text}` : `Leeres Feld ${i + 1}`}
          >
            {s && (
              <button
                type="button"
                className="ww-stein ww-stein--gesetzt"
                onPointerDown={(e) => !fertig && startDrag(s.id, e)}
                aria-label={`${s.text} wieder herausnehmen`}
              >
                {s.text}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="ww-bau__vorrat" ref={(el) => registerZone('vorrat', el)}>
        {vorrat.map((b) => (
          <motion.button
            key={b.id}
            type="button"
            className={`ww-stein ${drag?.id === b.id ? 'ww-stein--drag' : ''} ${
              naechsterRichtiger?.id === b.id ? 'ww-stein--tipp' : ''
            }`}
            onPointerDown={(e) => startDrag(b.id, e)}
            animate={
              bounceId === b.id
                ? { x: [0, -10, 10, -6, 0], y: [0, -14, 0] }
                : naechsterRichtiger?.id === b.id
                  ? { scale: [1, 1.08, 1] }
                  : { x: 0, y: 0, scale: 1 }
            }
            transition={
              naechsterRichtiger?.id === b.id
                ? { duration: 1, repeat: Infinity }
                : { duration: 0.45 }
            }
            aria-label={`Baustein ${b.text}`}
          >
            {b.text}
          </motion.button>
        ))}
      </div>

      {/* Der Baustein, der gerade am Finger klebt */}
      {drag && (
        <div
          className="ww-stein ww-stein--fliegt"
          style={{
            left: drag.x - drag.dx,
            top: drag.y - drag.dy,
            width: drag.width,
            height: drag.height,
          }}
          aria-hidden="true"
        >
          {d.bausteine.find((b) => b.id === drag.id)?.text}
        </div>
      )}

      {fertig && (
        <motion.p
          className="ww-bau__fertig"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <span aria-hidden="true">✨</span> {d.wort} <span aria-hidden="true">✨</span>
        </motion.p>
      )}
    </>
  )
}

export const wortBaukasten: GameModule<BaukastenTask> = {
  id: 'wort-baukasten',
  worldId: 'buchstaben',
  title: 'Wort-Baukasten',
  subtitle: 'Silben und Buchstaben zu Wörtern bauen',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="6" y="30" width="30" height="24" rx="6" fill="#F6BD41" stroke="#2E4034" strokeWidth="4" />
      <rect x="44" y="30" width="30" height="24" rx="6" fill="#7FB069" stroke="#2E4034" strokeWidth="4" />
      <text x="21" y="48" fontSize="16" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">Ha</text>
      <text x="59" y="48" fontSize="16" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">se</text>
      <path d="M40 20 v-10 M34 16 l6 -6 l6 6" fill="none" stroke="#2E4034" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  generateTask,
  Component: WortBaukasten,
}
