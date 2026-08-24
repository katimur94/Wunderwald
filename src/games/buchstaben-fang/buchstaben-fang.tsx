import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, sample, shuffle, type Rng } from '../rng'
import {
  AEHNLICHE_LAUTE,
  ALPHABET,
  ANLAUTE,
  ANLAUTE_EINFACH,
  ANLAUTE_HAEUFIG,
  anlaut,
  endlaut,
  KLARE_WORTE,
  WORDS,
  withAnlautKlar,
  type WordEntry,
} from '../../learning/wordlist'
import { ChoiceRow } from '../../components/ChoiceRow'
import { sprich } from '../../audio/tts'
import './buchstaben-fang.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export type FangMode =
  | 'anlaut'      // Womit beginnt … ?
  | 'endlaut'     // Womit endet … ?
  | 'luecke'      // Welcher Buchstabe fehlt? H_us
  | 'grossKlein'  // Großbuchstabe → passender Kleinbuchstabe
  | 'lesen'       // Wort steht da, 3 Emojis zur Auswahl

export interface FangData {
  mode: FangMode
  /** Das Bild oben (nicht bei 'lesen') */
  emoji?: string
  /** Das Wort, um das es geht */
  wort: string
  /** Anzeige mit Lücke, z. B. "H_us" */
  luecke?: string
  frage: string
  /** Buchstaben-Blätter (bei 'lesen': Emojis) */
  options: string[]
}

export type FangTask = GameTask<FangData>

/* ------------------------------------------------------------------ */
/* Distraktoren                                                        */
/* ------------------------------------------------------------------ */

/** Zufällige Buchstaben, die nicht die Lösung sind. */
function letterDistractors(rng: Rng, answer: string, count: number, pool: string[]): string[] {
  const candidates = pool.filter((l) => l !== answer)
  const picked = sample(rng, candidates, count)
  if (picked.length >= count) return picked
  // Auffüllen aus dem Alphabet, falls der Pool zu klein war.
  const rest = sample(
    rng,
    ALPHABET.filter((l) => l !== answer && !picked.includes(l)),
    count - picked.length,
  )
  return [...picked, ...rest]
}

/** Ähnlich klingende Distraktoren bevorzugen (B/P, D/T, G/K …). */
function confusableDistractors(rng: Rng, answer: string, count: number): string[] {
  const near = (AEHNLICHE_LAUTE[answer] ?? []).filter((l) => l !== answer)
  const out = sample(rng, near, Math.min(count, near.length))
  if (out.length >= count) return out
  return [...out, ...letterDistractors(rng, answer, count - out.length, ANLAUTE.filter((l) => !out.includes(l)))]
}

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export function generateTask(difficulty: number, rng: Rng): FangTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  // Stufen 1–3 arbeiten nur mit klaren Anlauten: kein "Sch-", "Bl-", "St-".
  // Erst ab Stufe 4 kommen Mehrlauter und Konsonantenhäufungen dazu.

  // Stufe 1: nur A/M/O/S/E, 2 Blätter
  if (lvl === 1) {
    const letter = pick(rng, ANLAUTE_EINFACH)
    const word = pick(rng, withAnlautKlar(letter))
    return anlautTask(rng, word, letterDistractors(rng, letter, 1, ANLAUTE_EINFACH))
  }

  // Stufe 2: mehr Buchstaben, 3 Blätter
  if (lvl === 2) {
    const word = pick(rng, KLARE_WORTE.filter((w) => ANLAUTE_HAEUFIG.includes(anlaut(w))))
    return anlautTask(rng, word, letterDistractors(rng, anlaut(word), 2, ANLAUTE_HAEUFIG))
  }

  // Stufe 3: alle klaren Anlaute, 4 Blätter
  if (lvl === 3) {
    const word = pick(rng, KLARE_WORTE)
    return anlautTask(rng, word, letterDistractors(rng, anlaut(word), 3, ANLAUTE))
  }

  // Stufe 4: ähnlich klingende Distraktoren
  if (lvl === 4) {
    const word = pick(rng, WORDS.filter((w) => (AEHNLICHE_LAUTE[anlaut(w)] ?? []).length >= 2))
    return anlautTask(rng, word, confusableDistractors(rng, anlaut(word), 3))
  }

  // Stufe 5: Endlaut statt Anlaut
  if (lvl === 5) {
    const word = pick(rng, WORDS)
    const answer = endlaut(word)
    const options = shuffle(rng, [answer, ...letterDistractors(rng, answer, 3, ANLAUTE)])
    return {
      data: {
        mode: 'endlaut',
        emoji: word.emoji,
        wort: word.wort,
        frage: `Mit welchem Buchstaben endet … ${word.wort}?`,
        options,
      },
      answer,
      speak: `Mit welchem Buchstaben endet ${word.wort}?`,
    }
  }

  // Stufe 6: Welcher Buchstabe fehlt?
  if (lvl === 6) {
    const word = pick(rng, WORDS.filter((w) => w.wort.length >= 3 && w.wort.length <= 8))
    const idx = 1 + Math.floor(rng() * (word.wort.length - 2)) // nie erster/letzter
    const answer = word.wort[idx].toUpperCase()
    const luecke = word.wort.slice(0, idx) + '_' + word.wort.slice(idx + 1)
    const options = shuffle(rng, [answer, ...confusableDistractors(rng, answer, 3)])
    return {
      data: {
        mode: 'luecke',
        emoji: word.emoji,
        wort: word.wort,
        luecke,
        frage: 'Welcher Buchstabe fehlt?',
        options,
      },
      answer,
      speak: `Welcher Buchstabe fehlt in ${word.wort}?`,
    }
  }

  // Stufen 7–8: Großbuchstabe → passender Kleinbuchstabe
  if (lvl <= 8) {
    const gross = pick(rng, lvl === 7 ? ANLAUTE_HAEUFIG : ANLAUTE)
    const answer = gross.toLowerCase()
    const distraktoren = confusableDistractors(rng, gross, 3).map((l) => l.toLowerCase())
    return {
      data: {
        mode: 'grossKlein',
        wort: gross,
        frage: `Welcher kleine Buchstabe gehört zu ${gross}?`,
        options: shuffle(rng, [answer, ...distraktoren]),
      },
      answer,
      speak: `Fang den kleinen Buchstaben, der zu dem großen ${gross} gehört.`,
    }
  }

  // Stufen 9–10: erstes Wort lesen – Wort steht da, 3 bzw. 4 Emojis zur Auswahl.
  // Die Bilder müssen unterscheidbar sein, sonst gäbe es zwei richtige Antworten.
  const count = lvl === 9 ? 3 : 4
  const chosen: WordEntry[] = []
  const seenEmoji = new Set<string>()
  for (const w of sample(rng, WORDS, WORDS.length)) {
    if (seenEmoji.has(w.emoji)) continue
    seenEmoji.add(w.emoji)
    chosen.push(w)
    if (chosen.length === count) break
  }
  const target = chosen[0]
  return {
    data: {
      mode: 'lesen',
      wort: target.wort,
      frage: 'Lies das Wort. Welches Bild passt?',
      options: shuffle(rng, chosen.map((w) => w.emoji)),
    },
    answer: target.emoji,
    speak: 'Lies das Wort und tippe das passende Bild.',
  }
}

function anlautTask(rng: Rng, word: WordEntry, distraktoren: string[]): FangTask {
  const answer = anlaut(word)
  return {
    data: {
      mode: 'anlaut',
      emoji: word.emoji,
      wort: word.wort,
      frage: `Mit welchem Buchstaben beginnt … ${word.wort}?`,
      options: shuffle(rng, [answer, ...distraktoren]),
    },
    answer,
    speak: `Mit welchem Buchstaben beginnt ${word.wort}?`,
  }
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function BuchstabenFang({ task, onDone, onWrong, revealSolution }: GameComponentProps<FangTask>) {
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
      {d.mode === 'lesen' ? (
        <p className="ww-fang__lesewort">{d.wort}</p>
      ) : d.mode === 'grossKlein' ? (
        <p className="ww-fang__gross">{d.wort}</p>
      ) : (
        <button
          type="button"
          className="ww-fang__bild"
          onClick={() => sprich(d.wort)}
          aria-label={`${d.wort} – noch einmal anhören`}
        >
          <span aria-hidden="true">{d.emoji}</span>
        </button>
      )}

      {d.luecke && <p className="ww-fang__luecke">{d.luecke}</p>}

      <p className="ww-fang__frage">{d.frage}</p>

      <ChoiceRow
        options={d.options}
        onPick={choose}
        wrongValue={wrongPick}
        highlight={revealSolution ? (task.answer as string) : null}
        variant={d.mode === 'lesen' ? 'zahl' : 'blatt'}
        ariaLabel={(v) => (d.mode === 'lesen' ? 'Bild auswählen' : `Buchstabe ${v}`)}
        render={(v) =>
          d.mode === 'lesen' ? (
            <span aria-hidden="true">{v}</span>
          ) : (
            <motion.span
              aria-hidden="true"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              {v}
            </motion.span>
          )
        }
      />
    </>
  )
}

export const buchstabenFang: GameModule<FangTask> = {
  id: 'buchstaben-fang',
  worldId: 'buchstaben',
  title: 'Buchstaben-Fang',
  subtitle: 'Anlaute hören und Buchstaben fangen',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M14 60 Q10 26 42 20 Q70 16 66 44 Q62 68 34 66 Q20 65 14 60 Z" fill="#7FB069" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      <path d="M18 62 Q40 46 62 32" fill="none" stroke="#2E4034" strokeWidth="3" />
      <text x="42" y="52" fontSize="30" fontFamily="Fredoka, sans-serif" fontWeight="600" fill="#2E4034" textAnchor="middle">
        A
      </text>
    </svg>
  ),
  generateTask,
  Component: BuchstabenFang,
}
