import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, sample, shuffle, type Rng } from '../rng'
import {
  KOMPOSITA, REIM_GRUPPEN, REIM_IDS, WORDS, reimtSich, wortByName,
  type WordEntry,
} from '../../learning/wordlist'
import { BigButton } from '../../components/BigButton'
import { sprich } from '../../audio/tts'
import { sfx } from '../../audio/AudioManager'
import './reim-boot.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export type BootMode =
  | 'reim'        // Welche Kiste reimt sich auf das Wort im Boot?
  | 'keinReim'    // Welches Wort reimt sich NICHT?
  | 'silben'      // So oft auf die Trommel klopfen, wie das Wort Silben hat
  | 'kompositum'  // Zwei Kisten ergeben zusammen ein Wort

export interface Kiste {
  id: string
  wort: string
  emoji: string
}

export interface BootData {
  mode: BootMode
  /** Wort im Boot — bei 'silben' das zu klatschende, bei 'kompositum' das Ziel */
  wort: string
  emoji: string
  /** Silben des Bootworts, für Funkels Vorsprechen */
  silben: string[]
  kisten: Kiste[]
  frage: string
  /**
   * Alle Antworten, die das Kind geben kann: Kisten-Kennungen, bei
   * 'kompositum' geordnete Paare, bei 'silben' die möglichen Klopfzahlen.
   */
  optionen: string[]
}

export type BootTask = GameTask<BootData>

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

const kiste = (w: WordEntry, i: number): Kiste => ({ id: `k${i}`, wort: w.wort, emoji: w.emoji })

/** Wörter, die sich garantiert NICHT auf `wort` reimen. */
function fremdeWorte(rng: Rng, wort: WordEntry, anzahl: number): WordEntry[] {
  const moeglich = WORDS.filter((w) => w.wort !== wort.wort && !reimtSich(w, wort))
  return sample(rng, moeglich, anzahl)
}

/** Alle geordneten Paare aus den Kisten — die Reihenfolge macht das Wort. */
function paare(kisten: Kiste[]): string[] {
  const out: string[] = []
  for (const a of kisten) {
    for (const b of kisten) {
      if (a.id !== b.id) out.push(`${a.id}+${b.id}`)
    }
  }
  return out
}

export function generateTask(difficulty: number, rng: Rng): BootTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  /* ---------- Stufen 6 und 7: Silben klopfen ---------- */
  if (lvl === 6 || lvl === 7) {
    // Stufe 6 bleibt bei zwei Silben, Stufe 7 nimmt auch drei dazu.
    const erlaubt = lvl === 6 ? [1, 2] : [2, 3]
    const pool = WORDS.filter((w) => erlaubt.includes(w.silben.length))
    const wort = pick(rng, pool)
    const n = wort.silben.length
    return {
      data: {
        mode: 'silben',
        wort: wort.wort,
        emoji: wort.emoji,
        silben: wort.silben,
        kisten: [],
        frage: 'Wie oft klopfst du?',
        // Die Klopfzahlen, die überhaupt in Frage kommen.
        optionen: [1, 2, 3, 4].map(String),
      },
      answer: String(n),
      speak: `Klopf so oft auf die Trommel, wie ${wort.wort} Silben hat.`,
    }
  }

  /* ---------- Stufen 8 bis 10: zusammengesetzte Wörter ---------- */
  if (lvl >= 8) {
    const k = pick(rng, KOMPOSITA)
    const links = wortByName(k.links)!
    const rechts = wortByName(k.rechts)!
    // Ablenker: Wörter, die mit keinem der beiden Teile ein Wort ergeben.
    const teileImSpiel = new Set([k.links, k.rechts])
    const verboten = new Set(
      KOMPOSITA.filter((x) => teileImSpiel.has(x.links) || teileImSpiel.has(x.rechts))
        .flatMap((x) => [x.links, x.rechts]),
    )
    const anzahlAblenker = lvl === 8 ? 1 : lvl === 9 ? 2 : 3
    const ablenker = sample(
      rng,
      WORDS.filter((w) => !verboten.has(w.wort)),
      anzahlAblenker,
    )
    const gemischt = shuffle(rng, [links, rechts, ...ablenker])
    const kisten = gemischt.map(kiste)
    const idVon = (name: string) => kisten.find((x) => x.wort === name)!.id
    return {
      data: {
        mode: 'kompositum',
        wort: k.wort,
        emoji: k.emoji,
        silben: [],
        kisten,
        frage: `Bau das Wort ${k.wort}!`,
        optionen: paare(kisten),
      },
      answer: `${idVon(k.links)}+${idVon(k.rechts)}`,
      speak: `Welche zwei Bilder ergeben zusammen ${k.wort}?`,
    }
  }

  /* ---------- Stufe 5: Welches Wort reimt sich NICHT? ---------- */
  if (lvl === 5) {
    const gruppeId = pick(rng, REIM_IDS.filter((id) => REIM_GRUPPEN[id].length >= 2))
    const [a, b] = sample(rng, REIM_GRUPPEN[gruppeId], 2)
    const fremd = fremdeWorte(rng, a, 1)[0]
    const kisten = shuffle(rng, [a, b, fremd]).map(kiste)
    return {
      data: {
        mode: 'keinReim',
        wort: '',
        emoji: '❓',
        silben: [],
        kisten,
        frage: 'Welches Wort reimt sich NICHT?',
        optionen: kisten.map((x) => x.id),
      },
      answer: kisten.find((x) => x.wort === fremd.wort)!.id,
      speak: `Zwei Wörter reimen sich, eines nicht. Welches passt nicht dazu?`,
    }
  }

  /* ---------- Stufen 1 bis 4: Welche Kiste reimt sich? ---------- */
  const anzahlKisten = lvl <= 2 ? 2 : 3
  const gruppeId = pick(rng, REIM_IDS)
  const [imBoot, partner] = sample(rng, REIM_GRUPPEN[gruppeId], 2)
  const ablenker = fremdeWorte(rng, imBoot, anzahlKisten - 1)
  const kisten = shuffle(rng, [partner, ...ablenker]).map(kiste)
  return {
    data: {
      mode: 'reim',
      wort: imBoot.wort,
      emoji: imBoot.emoji,
      silben: imBoot.silben,
      kisten,
      frage: `Was reimt sich auf ${imBoot.wort}?`,
      optionen: kisten.map((x) => x.id),
    },
    answer: kisten.find((x) => x.wort === partner.wort)!.id,
    speak: `${imBoot.wort}. Welche Kiste reimt sich darauf?`,
  }
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

export function ReimBoot({
  task, onDone, onWrong, say, revealSolution, taskNo = 0, tasksTotal = 6,
}: GameComponentProps<BootTask>) {
  const d = task.data
  const [tries, setTries] = useState(0)
  const [start] = useState(() => Date.now())
  const [geschafft, setGeschafft] = useState(false)
  const [gewaehlt, setGewaehlt] = useState<string[]>([])
  const [klopfer, setKlopfer] = useState(0)
  const [wackelt, setWackelt] = useState<string | null>(null)

  // Bei jeder neuen Aufgabe von vorn — die Shell hält die Komponente montiert.
  useEffect(() => {
    setTries(0); setGeschafft(false); setGewaehlt([]); setKlopfer(0); setWackelt(null)
  }, [task])

  const richtig = useCallback(() => {
    setGeschafft(true)
    sfx('success')
    setTimeout(() => onDone({ correct: true, usedHint: tries > 1, timeMs: Date.now() - start }), 950)
  }, [onDone, tries, start])

  const falsch = useCallback(
    (was: string | null) => {
      const n = tries + 1
      setTries(n)
      setWackelt(was)
      sfx('failSoft')
      setTimeout(() => setWackelt(null), 500)
      onWrong(n)
    },
    [tries, onWrong],
  )

  /* ---------- Kiste antippen ---------- */
  function tippeKiste(k: Kiste) {
    if (geschafft) return
    sprich(k.wort) // Reime müssen hörbar sein
    if (d.mode === 'kompositum') {
      const naechste = gewaehlt.includes(k.id)
        ? gewaehlt.filter((x) => x !== k.id)
        : [...gewaehlt, k.id].slice(-2)
      setGewaehlt(naechste)
      if (naechste.length === 2) {
        if (naechste.join('+') === task.answer) richtig()
        else {
          falsch(k.id)
          setTimeout(() => setGewaehlt([]), 500)
        }
      }
      return
    }
    if (k.id === task.answer) richtig()
    else falsch(k.id)
  }

  /* ---------- Trommel ---------- */
  function klopfe() {
    if (geschafft) return
    sfx('drum')
    setKlopfer((n) => n + 1)
  }

  function pruefeKlopfen() {
    if (geschafft || klopfer === 0) return
    if (String(klopfer) === task.answer) richtig()
    else {
      falsch(null)
      setKlopfer(0)
    }
  }

  const zielSchritt = Math.min(taskNo + (geschafft ? 1 : 0), tasksTotal)
  const fahrt = tasksTotal > 0 ? zielSchritt / tasksTotal : 0

  return (
    <div className="ww-boot">
      <p className="ww-boot__frage">{d.frage}</p>

      {/* ---------- Bach mit Boot ---------- */}
      <div className="ww-boot__bach" aria-hidden="true">
        <svg className="ww-boot__wasser" viewBox="0 0 320 60" preserveAspectRatio="none">
          <path d="M0 26 Q40 14 80 26 Q120 38 160 26 Q200 14 240 26 Q280 38 320 26 L320 60 L0 60 Z" fill="#9FD0DF" />
          <path d="M0 38 Q40 28 80 38 Q120 48 160 38 Q200 28 240 38 Q280 48 320 38 L320 60 L0 60 Z" fill="#7FBFD4" />
        </svg>
        <motion.div
          className="ww-boot__schiff"
          animate={{ left: `calc(6% + ${fahrt * 74}%)`, y: [0, -4, 0] }}
          transition={{ left: { type: 'spring', stiffness: 70, damping: 14 }, y: { duration: 2.4, repeat: Infinity } }}
        >
          <span className="ww-boot__rumpf">⛵</span>
          {d.mode !== 'silben' && d.mode !== 'keinReim' && (
            <span className="ww-boot__ladung">{d.emoji}</span>
          )}
        </motion.div>
        <span className="ww-boot__ziel">🏁</span>
      </div>

      {/* ---------- Wort im Boot ---------- */}
      {d.mode !== 'keinReim' && (
        <button
          type="button"
          className="ww-boot__wort"
          onClick={() => sprich(d.wort)}
          aria-label={`${d.wort} anhören`}
        >
          <span className="ww-boot__wortbild" aria-hidden="true">{d.emoji}</span>
          <span className="ww-boot__worttext">{d.wort}</span>
        </button>
      )}

      {/* ---------- Silben klopfen ---------- */}
      {d.mode === 'silben' ? (
        <div className="ww-boot__trommelbox">
          <button
            type="button"
            className="ww-trommel"
            onClick={klopfe}
            aria-label="Auf die Trommel klopfen"
          >
            <motion.span
              aria-hidden="true"
              animate={{ scale: klopfer > 0 ? [1, 0.88, 1] : 1 }}
              transition={{ duration: 0.2 }}
              key={klopfer}
            >
              🥁
            </motion.span>
          </button>
          <p className="ww-boot__klopfer" aria-live="polite">
            {klopfer === 0 ? 'Noch nicht geklopft' : '👏 '.repeat(klopfer).trim()}
          </p>
          {revealSolution && (
            <p className="ww-boot__tipp">{d.silben.join(' – ')}</p>
          )}
          <div className="ww-boot__knoepfe">
            <BigButton size="m" tone="papier" onClick={() => setKlopfer(0)} disabled={klopfer === 0 || geschafft}>
              Nochmal
            </BigButton>
            <BigButton size="m" tone="blatt" onClick={pruefeKlopfen} disabled={klopfer === 0 || geschafft}>
              Fertig
            </BigButton>
          </div>
        </div>
      ) : (
        /* ---------- Kisten ---------- */
        <ul className="ww-boot__kisten">
          {d.kisten.map((k) => {
            const ausgewaehlt = gewaehlt.indexOf(k.id)
            const zeigen =
              revealSolution &&
              (d.mode === 'kompositum'
                ? String(task.answer).split('+').includes(k.id)
                : k.id === task.answer)
            return (
              <li key={k.id}>
                <motion.button
                  type="button"
                  className={`ww-kiste ${ausgewaehlt >= 0 ? 'ww-kiste--gewaehlt' : ''} ${
                    zeigen ? 'ww-kiste--tipp' : ''
                  }`}
                  onClick={() => tippeKiste(k)}
                  aria-pressed={ausgewaehlt >= 0}
                  animate={
                    wackelt === k.id
                      ? { x: [0, -9, 9, -5, 0] }
                      : zeigen
                        ? { scale: [1, 1.07, 1] }
                        : { x: 0, scale: 1 }
                  }
                  transition={zeigen ? { duration: 1, repeat: Infinity } : { duration: 0.4 }}
                  aria-label={k.wort}
                >
                  <span className="ww-kiste__bild" aria-hidden="true">{k.emoji}</span>
                  <span className="ww-kiste__wort">{k.wort}</span>
                  {d.mode === 'kompositum' && ausgewaehlt >= 0 && (
                    <span className="ww-kiste__nummer" aria-hidden="true">{ausgewaehlt + 1}</span>
                  )}
                </motion.button>
              </li>
            )
          })}
        </ul>
      )}

      {geschafft && (
        <motion.p
          className="ww-boot__jubel"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <span aria-hidden="true">✨</span> {d.mode === 'silben' ? d.silben.join(' – ') : d.wort || 'Genau!'}
        </motion.p>
      )}

      {/* Funkel sagt bei Bedarf noch einmal an, worum es geht. */}
      <button
        type="button"
        className="ww-boot__nochmal"
        onClick={() => say(task.speak)}
      >
        🔊 Nochmal hören
      </button>
    </div>
  )
}

export const reimBoot: GameModule<BootTask> = {
  id: 'reim-boot',
  worldId: 'buchstaben',
  title: 'Reim-Boot',
  subtitle: 'Reime, Silben und Wortpaare',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M6 52 L74 52 L64 68 L16 68 Z" fill="#E4634F" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      <rect x="37" y="16" width="6" height="36" rx="3" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <path d="M44 20 L66 44 L44 44 Z" fill="#F6BD41" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      <path d="M4 72 Q20 66 36 72 Q52 78 76 70" fill="none" stroke="#6FB5C9" strokeWidth="5" strokeLinecap="round" />
    </svg>
  ),
  generateTask,
  Component: ReimBoot,
}
