import { useEffect, useState } from 'react'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, randInt, sample, shuffle, type Rng } from '../rng'
import { ChoiceRow } from '../../components/ChoiceRow'
import { Bead, type BeadSpec } from './Bead'
import './muster-weber.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export type WeberMode = 'perlen' | 'zahlen' | 'matrix'

export interface WeberData {
  mode: WeberMode
  /** Perlenschnur bzw. Zahlenreihe – letzte Position ist null (die Lücke) */
  reihe: (BeadSpec | null)[]
  /** Zahlenreihe bei mode 'zahlen' */
  zahlen?: (number | null)[]
  /** 3×3-Matrix bei mode 'matrix', ein Feld ist null */
  matrix?: (BeadSpec | null)[]
  /** Auswahl unter der Reihe */
  optionen: BeadSpec[] | number[]
  frage: string
}

export type WeberTask = GameTask<WeberData>

export const FARBEN = ['#E4634F', '#6FB5C9', '#F6BD41', '#7FB069', '#9A7FC9'] as const
export const FORMEN = ['kreis', 'stern', 'quadrat', 'herz', 'dreieck'] as const

function bead(farbe: string, form: string, gross = true, anzahl = 1): BeadSpec {
  return { farbe, form, gross, anzahl }
}

function beadKey(b: BeadSpec): string {
  return `${b.farbe}|${b.form}|${b.gross}|${b.anzahl}`
}

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export function generateTask(difficulty: number, rng: Rng): WeberTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  /** Baut die Perlen-Aufgabe aus einer Musterfolge. */
  function perlenTask(muster: BeadSpec[], laenge: number, frage: string, speak: string): WeberTask {
    const voll = Array.from({ length: laenge }, (_, i) => muster[i % muster.length])
    const answer = voll[voll.length - 1]
    const reihe: (BeadSpec | null)[] = [...voll.slice(0, -1), null]

    // Distraktoren: andere Perlen aus dem Muster, sonst Varianten
    const kandidaten = muster.filter((m) => beadKey(m) !== beadKey(answer))
    const optionen: BeadSpec[] = [answer]
    for (const k of shuffle(rng, kandidaten)) {
      if (optionen.length >= 3) break
      if (!optionen.some((o) => beadKey(o) === beadKey(k))) optionen.push(k)
    }
    // Auffüllen mit Varianten der Lösung
    let guard = 0
    while (optionen.length < 3 && guard++ < 40) {
      const v = bead(
        pick(rng, FARBEN),
        pick(rng, FORMEN),
        answer.gross,
        answer.anzahl,
      )
      if (!optionen.some((o) => beadKey(o) === beadKey(v))) optionen.push(v)
    }

    return {
      data: { mode: 'perlen', reihe, optionen: shuffle(rng, optionen), frage },
      answer: beadKey(answer),
      speak,
    }
  }

  const zweiFarben = sample(rng, FARBEN, 2)
  const dreiFarben = sample(rng, FARBEN, 3)
  const zweiFormen = sample(rng, FORMEN, 2)

  // Stufe 1: AB-Muster, Farben
  if (lvl === 1) {
    const muster = zweiFarben.map((f) => bead(f, 'kreis'))
    return perlenTask(muster, 7, 'Welche Perle kommt als nächste?', 'Schau dir die Reihe an. Welche Perle kommt als nächste?')
  }

  // Stufe 2: AB mit Formen
  if (lvl === 2) {
    const farbe = pick(rng, FARBEN)
    const muster = zweiFormen.map((form) => bead(farbe, form))
    return perlenTask(muster, 7, 'Welche Perle kommt als nächste?', 'Welche Form kommt als nächste?')
  }

  // Stufe 3: ABC
  if (lvl === 3) {
    const muster = dreiFarben.map((f) => bead(f, pick(rng, FORMEN)))
    return perlenTask(muster, 7, 'Welche Perle kommt als nächste?', 'Das Muster hat drei Teile. Welcher kommt jetzt?')
  }

  // Stufe 4: AAB / ABB
  if (lvl === 4) {
    const [a, b] = zweiFarben.map((f) => bead(f, 'kreis'))
    const muster = rng() < 0.5 ? [a, a, b] : [a, b, b]
    return perlenTask(muster, 7, 'Welche Perle kommt als nächste?', 'Achte darauf, welche Perle doppelt kommt.')
  }

  // Stufe 5: Größe als Dimension
  if (lvl === 5) {
    const farbe = pick(rng, FARBEN)
    const form = pick(rng, FORMEN)
    const muster = [bead(farbe, form, true), bead(farbe, form, false)]
    return perlenTask(muster, 7, 'Welche Perle kommt als nächste?', 'Achte auf groß und klein.')
  }

  // Stufe 6: zwei Dimensionen gleichzeitig
  if (lvl === 6) {
    const [f1, f2] = zweiFarben
    const [s1, s2] = zweiFormen
    const muster = [bead(f1, s1), bead(f2, s2), bead(f1, s2), bead(f2, s1)]
    return perlenTask(muster, 7, 'Welche Perle kommt als nächste?', 'Hier ändern sich Farbe und Form. Welche Perle passt?')
  }

  // Stufen 7–8: Zahlenreihen
  if (lvl <= 8) {
    const schritte = lvl === 7 ? [1, 2] : [3, -2, 0]
    const schritt = pick(rng, schritte)
    const start = randInt(rng, 1, lvl === 7 ? 10 : 20)

    let zahlen: number[]
    if (schritt === 0) {
      // Verdopplung
      const s = randInt(rng, 1, 6)
      zahlen = [s, s * 2, s * 4, s * 8, s * 16]
    } else if (schritt < 0) {
      const s = Math.max(start, 5 * Math.abs(schritt) + 1)
      zahlen = Array.from({ length: 5 }, (_, i) => s + i * schritt)
    } else {
      zahlen = Array.from({ length: 5 }, (_, i) => start + i * schritt)
    }

    const answer = zahlen[zahlen.length - 1]
    const optionen = shuffle(rng, [
      answer,
      ...uniqueNumberDistractors(rng, answer, 2, schritt === 0 ? answer : Math.abs(schritt)),
    ])
    return {
      data: {
        mode: 'zahlen',
        reihe: [],
        zahlen: [...zahlen.slice(0, -1), null],
        optionen,
        frage: 'Welche Zahl kommt als nächste?',
      },
      answer,
      speak: `Die Reihe geht weiter. Welche Zahl kommt nach ${zahlen[zahlen.length - 2]}?`,
    }
  }

  // Stufen 9–10: 3×3-Matrix, ein Feld fehlt
  const farbenReihe = sample(rng, FARBEN, 3)
  const formenSpalte = sample(rng, FORMEN, 3)
  const felder: BeadSpec[] = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      felder.push(
        lvl === 9
          ? bead(farbenReihe[r], formenSpalte[c])
          : bead(farbenReihe[r], formenSpalte[c], true, c + 1),
      )
    }
  }
  const luecke = randInt(rng, 0, 8)
  const answer = felder[luecke]
  const matrix: (BeadSpec | null)[] = felder.map((f, i) => (i === luecke ? null : f))

  // Distraktoren: gleiche Farbe / falsche Form und umgekehrt
  const optionen: BeadSpec[] = [answer]
  let guard = 0
  while (optionen.length < 3 && guard++ < 60) {
    const kandidat = bead(
      pick(rng, farbenReihe),
      pick(rng, formenSpalte),
      true,
      lvl === 10 ? randInt(rng, 1, 3) : 1,
    )
    if (!optionen.some((o) => beadKey(o) === beadKey(kandidat))) optionen.push(kandidat)
  }

  return {
    data: {
      mode: 'matrix',
      reihe: [],
      matrix,
      optionen: shuffle(rng, optionen),
      frage: 'Welches Feld fehlt?',
    },
    answer: beadKey(answer),
    speak: 'Schau dir die Reihen und Spalten an. Welches Feld fehlt?',
  }
}

/** Zahlen-Distraktoren, die nah dran, aber nie gleich sind. */
function uniqueNumberDistractors(rng: Rng, answer: number, count: number, schritt: number): number[] {
  const out = new Set<number>()
  const offsets = shuffle(rng, [schritt, -schritt, 1, -1, 2, -2, schritt * 2])
  for (const off of offsets) {
    if (out.size >= count) break
    const v = answer + off
    if (v !== answer && v > 0) out.add(v)
  }
  let extra = 3
  while (out.size < count && extra < 60) {
    const v = answer + extra
    if (v !== answer) out.add(v)
    extra++
  }
  return [...out].slice(0, count)
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

function MusterWeber({ task, onDone, onWrong, revealSolution }: GameComponentProps<WeberTask>) {
  const d = task.data
  const [tries, setTries] = useState(0)
  const [start, setStart] = useState(() => Date.now())
  const [wrongPick, setWrongPick] = useState<string | number | null>(null)

  useEffect(() => {
    setTries(0)
    setWrongPick(null)
    setStart(Date.now())
  }, [task])

  function choose(v: string | number) {
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

  const istZahlen = d.mode === 'zahlen'

  return (
    <>
      <p className="ww-weber__frage">{d.frage}</p>

      {d.mode === 'perlen' && (
        <div className="ww-weber__schnur">
          <span className="ww-weber__faden" aria-hidden="true" />
          {d.reihe.map((b, i) =>
            b ? (
              <Bead key={i} spec={b} size={54} />
            ) : (
              <span key={i} className="ww-weber__luecke" aria-label="Hier fehlt eine Perle" />
            ),
          )}
        </div>
      )}

      {istZahlen && (
        <div className="ww-weber__zahlen">
          {d.zahlen?.map((z, i) => (
            <span key={i} className={`ww-weber__zahl ${z === null ? 'ww-weber__zahl--luecke' : ''}`}>
              {z === null ? '?' : z}
            </span>
          ))}
        </div>
      )}

      {d.mode === 'matrix' && (
        <div className="ww-weber__matrix" role="group" aria-label="Drei mal drei Felder, eines fehlt">
          {d.matrix?.map((b, i) => (
            <div key={i} className={`ww-weber__zelle ${b ? '' : 'ww-weber__zelle--luecke'}`}>
              {b ? <Bead spec={b} size={44} /> : <span aria-hidden="true">?</span>}
            </div>
          ))}
        </div>
      )}

      {istZahlen ? (
        <ChoiceRow
          options={d.optionen as number[]}
          onPick={choose}
          wrongValue={wrongPick as number | null}
          highlight={revealSolution ? (task.answer as number) : null}
        />
      ) : (
        <ChoiceRow
          options={(d.optionen as BeadSpec[]).map(beadKey)}
          onPick={choose}
          wrongValue={wrongPick as string | null}
          highlight={revealSolution ? (task.answer as string) : null}
          variant="perle"
          ariaLabel={() => 'Perle auswählen'}
          render={(key) => {
            const spec = (d.optionen as BeadSpec[]).find((o) => beadKey(o) === key)!
            return <Bead spec={spec} size={58} />
          }}
        />
      )}
    </>
  )
}

export const musterWeber: GameModule<WeberTask> = {
  id: 'muster-weber',
  worldId: 'logik',
  title: 'Muster-Weber',
  subtitle: 'Muster und Reihen weiterdenken',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M4 40 h72" stroke="#2E4034" strokeWidth="4" strokeLinecap="round" />
      <circle cx="16" cy="40" r="11" fill="#E4634F" stroke="#2E4034" strokeWidth="4" />
      <rect x="30" y="29" width="22" height="22" rx="5" fill="#6FB5C9" stroke="#2E4034" strokeWidth="4" />
      <circle cx="64" cy="40" r="11" fill="#E4634F" stroke="#2E4034" strokeWidth="4" />
    </svg>
  ),
  generateTask,
  Component: MusterWeber,
}
