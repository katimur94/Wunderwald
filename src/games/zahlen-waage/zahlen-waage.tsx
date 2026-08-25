import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, randInt, shuffle, type Rng } from '../rng'
import { useDragDrop } from '../useDragDrop'
import { BigButton } from '../../components/BigButton'
import { sprich } from '../../audio/tts'
import { sfx } from '../../audio/AudioManager'
import './zahlen-waage.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export type WaageMode =
  | 'gleich'        // links eine Zahl, rechts leer
  | 'ergaenzen'     // rechts liegt schon etwas, der Rest fehlt
  | 'zerlegen'      // zwei oder drei Gewichte zusammen
  | 'rechnung'      // links steht eine Aufgabe statt Gewichte
  | 'zehnerfreund'  // immer auf 10 oder 20 ergänzen
  | 'ungleich'      // die linke Seite soll schwerer bleiben

export type Richtung = 'gleich' | 'linksSchwerer'

export interface WaageData {
  mode: WaageMode
  /** Gewichte auf der linken Schale */
  links: number[]
  /** Stufe 6: links steht „5 + 3" statt zweier Gewichte */
  alsRechnung?: boolean
  /** Gewichte, die rechts schon liegen */
  rechtsFest: number[]
  /** Wie viele Gewichte das Kind noch auflegen muss */
  benoetigt: number
  /** Vorrat unter der Waage, jede Zahl genau einmal */
  vorrat: number[]
  richtung: Richtung
  frage: string
  /**
   * Alle Kombinationen aus dem Vorrat in der geforderten Größe, kanonisch
   * geschrieben. Genau eine davon löst die Aufgabe — das prüft der
   * Generator-Vertrag und stellt so sicher, dass es nie zwei Wege gibt.
   */
  kombinationen: string[]
}

export type WaageTask = GameTask<WaageData>

/* ------------------------------------------------------------------ */
/* Kombinatorik-Helfer                                                 */
/* ------------------------------------------------------------------ */

/** Kanonische Schreibweise einer Gewichts-Auswahl: aufsteigend, mit Plus. */
export function kanonisch(zahlen: number[]): string {
  return [...zahlen].sort((a, b) => a - b).join('+')
}

/** Alle Teilmengen der Größe k — der Vorrat ist klein, das bleibt billig. */
export function kombinationenAus(vorrat: number[], k: number): number[][] {
  if (k === 0) return [[]]
  if (k > vorrat.length) return []
  const out: number[][] = []
  const lauf = (ab: number, aktuell: number[]) => {
    if (aktuell.length === k) {
      out.push([...aktuell])
      return
    }
    for (let i = ab; i < vorrat.length; i++) {
      aktuell.push(vorrat[i])
      lauf(i + 1, aktuell)
      aktuell.pop()
    }
  }
  lauf(0, [])
  return out
}

/** Ist diese Auswahl eine Lösung? */
function loest(auswahl: number[], links: number, rechtsFest: number[], richtung: Richtung): boolean {
  const rechts = rechtsFest.reduce((a, b) => a + b, 0) + auswahl.reduce((a, b) => a + b, 0)
  return richtung === 'gleich' ? rechts === links : rechts < links
}

/**
 * Baut den Vorrat: die Lösung plus Ablenker. Ein Ablenker kommt nur dazu,
 * wenn danach immer noch **genau eine** Kombination die Waage löst.
 * Ohne diese Prüfung könnte 7 = 3+4 auch 2+5 sein — die Waage stünde
 * gerade, und die App sagte trotzdem „falsch".
 */
function baueVorrat(
  rng: Rng,
  links: number,
  rechtsFest: number[],
  loesung: number[],
  richtung: Richtung,
  vorratGroesse: number,
  maxZahl: number,
): number[] {
  const k = loesung.length
  const vorrat = [...loesung]
  let schutz = 0
  while (vorrat.length < vorratGroesse && schutz++ < 400) {
    const kandidat = randInt(rng, 1, maxZahl)
    if (vorrat.includes(kandidat)) continue
    const probe = [...vorrat, kandidat]
    const treffer = kombinationenAus(probe, k).filter((c) => loest(c, links, rechtsFest, richtung))
    if (treffer.length === 1) vorrat.push(kandidat)
  }
  // Notausgang: mit Gewichten auffuellen, die offensichtlich zu schwer sind.
  let n = links + rechtsFest.reduce((a, b) => a + b, 0) + 1
  while (vorrat.length < vorratGroesse) {
    if (!vorrat.includes(n)) vorrat.push(n)
    n += 1
  }
  return shuffle(rng, vorrat)
}

/**
 * Zerlegt `summe` in `teile` **verschiedene** Summanden, jeder mindestens 1.
 *
 * Verschieden ist wichtig: Zwei gleiche Gewichte auf einer Schale sind für
 * ein Kind kaum auseinanderzuhalten, und der Vorrat bliebe nicht eindeutig.
 * Der Weg führt über die Umkehrung a_i = b_i + i: eine nicht fallende Folge
 * b wird zu einer streng steigenden Folge a.
 */
function zerlege(rng: Rng, summe: number, teile: number): number[] {
  const basis = (teile * (teile + 1)) / 2
  let rest = Math.max(0, summe - basis)

  const zusatz: number[] = []
  for (let i = 0; i < teile - 1; i++) {
    const wert = randInt(rng, 0, rest)
    zusatz.push(wert)
    rest -= wert
  }
  zusatz.push(rest)
  zusatz.sort((a, b) => a - b)

  return zusatz.map((b, i) => b + i + 1)
}

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

function fertig(
  rng: Rng,
  mode: WaageMode,
  links: number[],
  rechtsFest: number[],
  loesung: number[],
  richtung: Richtung,
  frage: string,
  speak: string,
  vorratGroesse: number,
  maxZahl: number,
  alsRechnung = false,
): WaageTask {
  const linksSumme = links.reduce((a, b) => a + b, 0)
  const vorrat = baueVorrat(rng, linksSumme, rechtsFest, loesung, richtung, vorratGroesse, maxZahl)
  const kombinationen = kombinationenAus(vorrat, loesung.length).map(kanonisch)
  return {
    data: {
      mode, links, alsRechnung, rechtsFest, benoetigt: loesung.length,
      vorrat, richtung, frage, kombinationen,
    },
    answer: kanonisch(loesung),
    speak,
  }
}

export function generateTask(difficulty: number, rng: Rng): WaageTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  // Stufe 1: links eine Zahl, rechts leer — dieselbe Zahl nachlegen.
  if (lvl === 1) {
    const z = randInt(rng, 2, 5)
    return fertig(
      rng, 'gleich', [z], [], [z], 'gleich',
      'Mach die Waage gerade!',
      `Mach die Waage gerade! Links liegt ${z}.`,
      4, 8,
    )
  }

  // Stufen 2, 3, 5: rechts liegt schon ein Gewicht, eines fehlt.
  if (lvl === 2 || lvl === 3 || lvl === 5) {
    const max = lvl === 2 ? 6 : lvl === 3 ? 10 : 20
    const min = lvl === 2 ? 3 : lvl === 3 ? 5 : 11
    const ziel = randInt(rng, min, max)
    const liegt = randInt(rng, 1, ziel - 1)
    const fehlt = ziel - liegt
    return fertig(
      rng, 'ergaenzen', [ziel], [liegt], [fehlt], 'gleich',
      'Was fehlt rechts?',
      `Links liegt ${ziel}, rechts liegt ${liegt}. Was fehlt noch?`,
      lvl === 5 ? 6 : 5, max,
    )
  }

  // Stufe 4: zwei Gewichte zusammen ergeben die linke Zahl.
  if (lvl === 4) {
    const ziel = randInt(rng, 5, 10)
    const teile = zerlege(rng, ziel, 2)
    return fertig(
      rng, 'zerlegen', [ziel], [], teile, 'gleich',
      'Leg zwei Gewichte auf!',
      `Links liegt ${ziel}. Finde zwei Gewichte, die zusammen ${ziel} sind.`,
      5, ziel,
    )
  }

  // Stufe 6: links steht eine Rechnung, rechts kommt das Ergebnis.
  if (lvl === 6) {
    const a = randInt(rng, 2, 9)
    const b = randInt(rng, 1, Math.min(9, 15 - a))
    return fertig(
      rng, 'rechnung', [a, b], [], [a + b], 'gleich',
      `Wie viel ist ${a} + ${b}?`,
      `Links steht ${a} plus ${b}. Leg rechts die passende Zahl auf.`,
      5, 20, true,
    )
  }

  // Stufe 7: Zehnerfreunde — immer auf 10 oder 20 ergänzen.
  if (lvl === 7) {
    const ziel = pick(rng, [10, 20])
    const liegt = ziel === 10 ? randInt(rng, 1, 9) : randInt(rng, 11, 19)
    const fehlt = ziel - liegt
    return fertig(
      rng, 'zehnerfreund', [ziel], [liegt], [fehlt], 'gleich',
      `Ergänze auf ${ziel}!`,
      `${liegt} und wie viel sind ${ziel}?`,
      5, ziel,
    )
  }

  // Stufe 8: größere Zahlen, rechts liegt schon eines.
  if (lvl === 8) {
    const ziel = randInt(rng, 12, 20)
    const liegt = randInt(rng, 3, ziel - 2)
    const fehlt = ziel - liegt
    return fertig(
      rng, 'ergaenzen', [ziel], [liegt], [fehlt], 'gleich',
      'Was fehlt rechts?',
      `Links liegt ${ziel}, rechts liegt schon ${liegt}. Was fehlt?`,
      6, 20,
    )
  }

  // Stufe 9: drei Gewichte mischen.
  if (lvl === 9) {
    const ziel = randInt(rng, 9, 18)
    const teile = zerlege(rng, ziel, 3)
    return fertig(
      rng, 'zerlegen', [ziel], [], teile, 'gleich',
      'Leg drei Gewichte auf!',
      `Links liegt ${ziel}. Finde drei Gewichte, die zusammen ${ziel} sind.`,
      5, ziel,
    )
  }

  // Stufe 10: die linke Seite soll schwerer bleiben — nur ein Gewicht passt.
  const ziel = randInt(rng, 10, 20)
  const liegt = randInt(rng, 2, ziel - 3)
  const luft = ziel - liegt // alles echt darunter macht links schwerer
  const passend = randInt(rng, 1, luft - 1)
  return fertig(
    rng, 'ungleich', [ziel], [liegt], [passend], 'linksSchwerer',
    'Links soll schwerer bleiben!',
    `Links liegt ${ziel}, rechts liegt ${liegt}. Leg so auf, dass links schwerer bleibt.`,
    5, ziel + 6,
  )
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

interface Gewicht {
  id: string
  wert: number
}

export function ZahlenWaage({ task, onDone, onWrong, say, revealSolution }: GameComponentProps<WaageTask>) {
  const d = task.data
  const [gelegt, setGelegt] = useState<Gewicht[]>([])
  const [tries, setTries] = useState(0)
  const [start] = useState(() => Date.now())
  const [geschafft, setGeschafft] = useState(false)

  // Jede Vorratszahl bekommt eine eigene Kennung — zwei gleiche Zahlen
  // wären sonst nicht auseinanderzuhalten.
  const vorratGewichte = useMemo<Gewicht[]>(
    () => d.vorrat.map((wert, i) => ({ id: `g${i}`, wert })),
    [d.vorrat],
  )
  const gelegtIds = new Set(gelegt.map((g) => g.id))
  const vorrat = vorratGewichte.filter((g) => !gelegtIds.has(g.id))

  const linksSumme = d.links.reduce((a, b) => a + b, 0)
  const rechtsSumme =
    d.rechtsFest.reduce((a, b) => a + b, 0) + gelegt.reduce((a, b) => a + b.wert, 0)

  // Neigung: die Waage zeigt sofort, wohin es kippt. Gedeckelt, damit die
  // Schalen bei 20 gegen 1 nicht aus dem Bild laufen.
  const neigung = geschafft ? 0 : Math.max(-16, Math.min(16, (rechtsSumme - linksSumme) * 3))

  /** Gibt false zurück, wenn nichts passiert ist — dann bleibt die Auswahl. */
  const lege = useCallback(
    (dragId: string, zoneId: string | null) => {
      const g = vorratGewichte.find((x) => x.id === dragId)
      if (!g || geschafft) return false
      if (zoneId === 'schale') {
        if (gelegtIds.has(dragId)) return false
        if (gelegt.length >= d.benoetigt) {
          say('Erst ein Gewicht wieder herunternehmen.')
          sfx('failSoft')
          return false
        }
        sfx('pop')
        setGelegt((v) => [...v, g])
        return true
      }
      if (zoneId === 'vorrat' || zoneId === null) {
        if (!gelegtIds.has(dragId)) return false
        sfx('click')
        setGelegt((v) => v.filter((x) => x.id !== dragId))
        return true
      }
      return false
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vorratGewichte, gelegt, d.benoetigt, geschafft, say],
  )

  const sprichGewicht = useCallback(
    (id: string | null) => {
      const g = vorratGewichte.find((x) => x.id === id)
      if (g) sprich(String(g.wert))
    },
    [vorratGewichte],
  )

  const { drag, hoverZone, gewaehlt, start: startDrag, registerZone, registerGhost, tapZone } =
    useDragDrop({ onDrop: lege, onTapPlace: lege, onSelect: sprichGewicht })

  function pruefe() {
    if (gelegt.length === 0 || geschafft) return
    const richtig = kanonisch(gelegt.map((g) => g.wert)) === task.answer
    if (richtig) {
      setGeschafft(true)
      sfx('success')
      setTimeout(
        () => onDone({ correct: true, usedHint: tries > 1, timeMs: Date.now() - start }),
        900,
      )
    } else {
      const n = tries + 1
      setTries(n)
      onWrong(n)
      if (n >= 2) {
        // Nach dem zweiten Fehler räumt Funkel ab und zeigt den Weg.
        setGelegt([])
      }
    }
  }

  /** Nach dem 2. Fehler leuchtet das nächste richtige Gewicht. */
  const loesungswerte = String(task.answer).split('+').map(Number)
  const naechstesRichtige = revealSolution
    ? (() => {
        const offen = [...loesungswerte]
        gelegt.forEach((g) => {
          const i = offen.indexOf(g.wert)
          if (i >= 0) offen.splice(i, 1)
        })
        return vorrat.find((g) => offen.includes(g.wert))
      })()
    : undefined

  return (
    <div className="ww-waage">
      <p className="ww-waage__frage">{d.frage}</p>

      <div className="ww-waage__buehne">
        <Balken neigung={neigung} />

        <div className="ww-waage__schalen" style={{ transform: `rotate(${neigung}deg)` }}>
          <div className="ww-waage__schale ww-waage__schale--links">
            <div className="ww-waage__inhalt">
              {d.alsRechnung ? (
                <span className="ww-waage__term">{d.links.join(' + ')}</span>
              ) : (
                d.links.map((w, i) => <Stein key={i} wert={w} fest />)
              )}
            </div>
            <Schalenboden />
          </div>

          <div
            className={`ww-waage__schale ww-waage__schale--rechts ${
              hoverZone === 'schale' ? 'ww-waage__schale--hover' : ''
            } ${gewaehlt ? 'ww-waage__schale--bereit' : ''}`}
            ref={(el) => registerZone('schale', el)}
            onClick={() => tapZone('schale')}
            role={gewaehlt ? 'button' : undefined}
            aria-label={`Rechte Schale, ${rechtsSumme}`}
          >
            <div className="ww-waage__inhalt">
              {d.rechtsFest.map((w, i) => <Stein key={`f${i}`} wert={w} fest />)}
              {gelegt.map((g) => (
                <Stein
                  key={g.id}
                  wert={g.wert}
                  gewaehlt={gewaehlt === g.id}
                  /*
                   * Liegt schon ein Gewicht in der Hand, greift dieses hier
                   * nicht zu: Der Tipp gilt dann der Schale, nicht dem Stein,
                   * der zufaellig darauf liegt. Sonst koennte man ein zweites
                   * Gewicht nie ablegen, sobald das erste in der Mitte liegt.
                   */
                  onPointerDown={(e) => !geschafft && !gewaehlt && startDrag(g.id, e)}
                />
              ))}
            </div>
            <Schalenboden />
          </div>
        </div>
      </div>

      <p className="ww-waage__stand" aria-live="polite">
        {geschafft
          ? '✨ Die Waage steht gerade!'
          : d.richtung === 'linksSchwerer'
            ? rechtsSumme < linksSumme
              ? 'Links ist schwerer 👍'
              : 'Rechts ist noch zu schwer'
            : rechtsSumme === linksSumme
              ? 'Gleich schwer!'
              : rechtsSumme < linksSumme
                ? 'Rechts ist noch zu leicht'
                : 'Rechts ist zu schwer'}
      </p>

      <div
        className="ww-waage__vorrat"
        ref={(el) => registerZone('vorrat', el)}
        onClick={() => tapZone('vorrat')}
      >
        {vorrat.map((g) => (
          <motion.button
            key={g.id}
            type="button"
            className={`ww-gewicht ${drag?.id === g.id ? 'ww-gewicht--drag' : ''} ${
              gewaehlt === g.id ? 'ww-gewicht--gewaehlt' : ''
            } ${naechstesRichtige?.id === g.id ? 'ww-gewicht--tipp' : ''}`}
            aria-pressed={gewaehlt === g.id}
            onPointerDown={(e) => !geschafft && startDrag(g.id, e)}
            animate={naechstesRichtige?.id === g.id ? { scale: [1, 1.09, 1] } : { scale: 1 }}
            transition={naechstesRichtige?.id === g.id ? { duration: 1, repeat: Infinity } : { duration: 0.3 }}
            aria-label={`Gewicht ${g.wert}`}
          >
            {g.wert}
          </motion.button>
        ))}
      </div>

      <BigButton
        size="l"
        tone={geschafft ? 'papier' : 'blatt'}
        full
        disabled={gelegt.length === 0 || geschafft}
        onClick={pruefe}
      >
        Prüfen
      </BigButton>

      {drag && (
        <div
          ref={registerGhost}
          className="ww-gewicht ww-gewicht--fliegt"
          style={{ width: drag.width, height: drag.height }}
          aria-hidden="true"
        >
          {vorratGewichte.find((g) => g.id === drag.id)?.wert}
        </div>
      )}
    </div>
  )
}

function Stein({
  wert, fest, gewaehlt, onPointerDown,
}: {
  wert: number
  fest?: boolean
  gewaehlt?: boolean
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void
}) {
  if (fest) {
    return <span className="ww-gewicht ww-gewicht--fest" aria-label={`Gewicht ${wert}`}>{wert}</span>
  }
  return (
    <button
      type="button"
      className={`ww-gewicht ww-gewicht--liegt ${gewaehlt ? 'ww-gewicht--gewaehlt' : ''}`}
      onPointerDown={onPointerDown}
      aria-label={`Gewicht ${wert} wieder herunternehmen`}
    >
      {wert}
    </button>
  )
}

function Schalenboden() {
  return (
    <svg className="ww-waage__boden" viewBox="0 0 120 34" aria-hidden="true">
      <path
        d="M4 2 Q60 34 116 2"
        fill="#F6BD41"
        stroke="#2E4034"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Balken({ neigung }: { neigung: number }) {
  return (
    <svg className="ww-waage__balken" viewBox="0 0 320 120" aria-hidden="true">
      <path d="M150 108 L170 108 L164 44 L156 44 Z" fill="#B98A5E" stroke="#2E4034" strokeWidth="5" strokeLinejoin="round" />
      <rect x="118" y="104" width="84" height="14" rx="7" fill="#B98A5E" stroke="#2E4034" strokeWidth="5" />
      <motion.g animate={{ rotate: neigung }} transition={{ type: 'spring', stiffness: 90, damping: 12 }} style={{ transformOrigin: '160px 40px' }}>
        <rect x="28" y="33" width="264" height="14" rx="7" fill="#D9A441" stroke="#2E4034" strokeWidth="5" />
        <circle cx="160" cy="40" r="12" fill="#F6BD41" stroke="#2E4034" strokeWidth="5" />
      </motion.g>
    </svg>
  )
}

export const zahlenWaage: GameModule<WaageTask> = {
  id: 'zahlen-waage',
  worldId: 'zahlen',
  title: 'Zahlen-Waage',
  subtitle: 'Zerlegen und ergänzen',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <rect x="36" y="30" width="8" height="38" rx="3" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <rect x="24" y="64" width="32" height="8" rx="4" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <rect x="8" y="24" width="64" height="8" rx="4" fill="#D9A441" stroke="#2E4034" strokeWidth="4" />
      <path d="M10 34 Q20 50 30 34" fill="#F6BD41" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 34 Q60 50 70 34" fill="#F6BD41" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  ),
  generateTask,
  Component: ZahlenWaage,
}
