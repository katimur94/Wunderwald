import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { pick, sample, shuffle, type Rng } from '../rng'
import {
  ART_KATEGORIEN, KOMBI_RUNDEN, MERKMAL_KATEGORIEN, PAARE_LEICHT, PAARE_SCHWER,
  eindeutigeDinge, gehoertZu, kategorieById,
  type Ding, type Kategorie,
} from '../../learning/sortier-daten'
import { useDragDrop } from '../useDragDrop'
import { sprich } from '../../audio/tts'
import { sfx } from '../../audio/AudioManager'
import './sortier-werkstatt.css'

/* ------------------------------------------------------------------ */
/* Aufgabentypen                                                       */
/* ------------------------------------------------------------------ */

export type SortMode =
  | 'art'           // Körbe nach Art: Tiere, Obst, Fahrzeuge …
  | 'merkmal'       // Körbe nach Eigenschaft: fliegt, schwimmt, ist rot …
  | 'ohnePlatz'     // ein Ding passt in keinen Korb
  | 'zweiMerkmale'  // Art UND Eigenschaft zugleich
  | 'oberbegriff'   // ein Korb hat keinen Deckel — das Kind rät ihn am Ende

/** Der Tisch für alles, was nirgends hineingehört. */
export const TISCH = 'tisch'

export interface KorbSpec {
  id: string
  name: string
  /** null = Deckel noch unbekannt (Stufe 9–10) */
  deckel: string | null
}

export interface SortObjekt extends Ding {
  id: string
  /** Korb-Kennung oder TISCH */
  ziel: string
}

export interface SortData {
  mode: SortMode
  koerbe: KorbSpec[]
  /** Steht der Fragezeichen-Tisch daneben? */
  mitTisch: boolean
  dinge: SortObjekt[]
  frage: string
  /** Alle Ziele, die es gibt — Körbe plus ggf. Tisch */
  optionen: string[]
  /** Stufe 9–10: die Deckel, aus denen am Ende gewählt wird */
  deckelAuswahl?: { id: string; deckel: string; name: string }[]
  /** Stufe 9–10: welcher Deckel gehört auf den verdeckten Korb */
  deckelAntwort?: string
}

export type SortTask = GameTask<SortData>

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

const OBJEKTE_PRO_RUNDE = 6

function spec(k: Kategorie, verdeckt = false): KorbSpec {
  return { id: k.id, name: k.name, deckel: verdeckt ? null : k.deckel }
}

/**
 * Verteilt `anzahl` Objekte gleichmäßig auf die Körbe. Gezogen wird nur aus
 * den **eindeutigen** Dingen: Ein Ding, das in zwei offene Körbe passt,
 * hätte keine richtige Antwort.
 */
function verteile(rng: Rng, koerbe: Kategorie[], anzahl: number): SortObjekt[] {
  const proKorb = Math.floor(anzahl / koerbe.length)
  const rest = anzahl - proKorb * koerbe.length
  const gezogen: SortObjekt[] = []
  koerbe.forEach((k, i) => {
    const n = proKorb + (i < rest ? 1 : 0)
    const auswahl = sample(rng, eindeutigeDinge(k, koerbe), n)
    auswahl.forEach((ding) => gezogen.push({ ...ding, id: `o${gezogen.length}`, ziel: k.id }))
  })
  // Erst mischen, dann neu durchnummerieren: die Nummer ist die Reihenfolge.
  return shuffle(rng, gezogen).map((o, i) => ({ ...o, id: `o${i}` }))
}

function baue(
  mode: SortMode,
  koerbe: KorbSpec[],
  dinge: SortObjekt[],
  frage: string,
  speak: string,
  extra: Partial<SortData> = {},
): SortTask {
  const optionen = [...koerbe.map((k) => k.id), ...(extra.mitTisch ? [TISCH] : [])]
  return {
    data: { mode, koerbe, mitTisch: false, dinge, frage, optionen, ...extra },
    // Der Vertrag prüft die Aufgabe an ihrem ersten Objekt; dass **jedes**
    // Objekt genau einen richtigen Korb hat, prüft der Test eigens.
    answer: dinge[0].ziel,
    speak,
  }
}

export function generateTask(difficulty: number, rng: Rng): SortTask {
  const lvl = Math.min(10, Math.max(1, Math.round(difficulty)))

  /* ---------- Stufe 9–10: Oberbegriff raten ---------- */
  if (lvl >= 9) {
    const anzahlKoerbe = lvl === 9 ? 2 : 3
    const gewaehlt = sample(rng, ART_KATEGORIEN, anzahlKoerbe)
    const verdeckt = pick(rng, gewaehlt)
    const dinge = verteile(rng, gewaehlt, OBJEKTE_PRO_RUNDE)
    const falscheDeckel = sample(
      rng,
      ART_KATEGORIEN.filter((k) => !gewaehlt.some((g) => g.id === k.id)),
      2,
    )
    const auswahl = shuffle(rng, [verdeckt, ...falscheDeckel]).map((k) => ({
      id: k.id, deckel: k.deckel, name: k.name,
    }))
    return baue(
      'oberbegriff',
      gewaehlt.map((k) => spec(k, k.id === verdeckt.id)),
      dinge,
      'Ein Korb hat noch keinen Deckel!',
      'Sortier alles ein. Am Ende suchst du den passenden Deckel.',
      { deckelAuswahl: auswahl, deckelAntwort: verdeckt.id },
    )
  }

  /* ---------- Stufe 7–8: zwei Merkmale zugleich ---------- */
  if (lvl === 7 || lvl === 8) {
    const runde = pick(rng, KOMBI_RUNDEN)
    // Stufe 7 nimmt zwei Körbe der Runde, Stufe 8 alle drei.
    const koerbe = lvl === 7 ? sample(rng, runde.koerbe, 2) : runde.koerbe
    return baue(
      'zweiMerkmale',
      koerbe.map((k) => spec(k)),
      verteile(rng, koerbe, OBJEKTE_PRO_RUNDE),
      runde.frage,
      `${runde.frage} Schau genau hin — es kommt auf zwei Dinge an.`,
    )
  }

  /* ---------- Stufe 6: eines passt nirgendwo hin ---------- */
  if (lvl === 6) {
    const [aId, bId] = pick(rng, PAARE_SCHWER)
    const koerbe = [kategorieById(aId)!, kategorieById(bId)!]
    const dinge = verteile(rng, koerbe, OBJEKTE_PRO_RUNDE - 1)
    // Ein Ding aus einer dritten Kategorie, das in keinen der Körbe passt.
    const fremdeKategorie = pick(
      rng,
      ART_KATEGORIEN.filter((k) => k.id !== aId && k.id !== bId),
    )
    const passtNicht = sample(
      rng,
      fremdeKategorie.dinge.filter((x) => !koerbe.some((k) => gehoertZu(x, k))),
      1,
    )[0]
    const alle = shuffle(rng, [
      ...dinge,
      { ...passtNicht, id: 'x', ziel: TISCH },
    ]).map((o, i) => ({ ...o, id: `o${i}` }))
    return baue(
      'ohnePlatz',
      koerbe.map((k) => spec(k)),
      alle,
      'Eins passt in keinen Korb!',
      'Was nirgends hineingehört, legst du auf den Fragezeichen-Tisch.',
      { mitTisch: true },
    )
  }

  /* ---------- Stufe 5: nach Merkmal statt nach Art ---------- */
  if (lvl === 5) {
    // Zwei Merkmals-Körbe, die sich nicht überschneiden.
    let koerbe: Kategorie[] = []
    for (let versuch = 0; versuch < 30; versuch++) {
      const kandidaten = sample(rng, MERKMAL_KATEGORIEN, 2)
      const [a, b] = kandidaten
      if (eindeutigeDinge(a, kandidaten).length >= 3 && eindeutigeDinge(b, kandidaten).length >= 3) {
        koerbe = kandidaten
        break
      }
    }
    if (koerbe.length === 0) {
      koerbe = [kategorieById('fliegt')!, kategorieById('rot')!]
    }
    return baue(
      'merkmal',
      koerbe.map((k) => spec(k)),
      verteile(rng, koerbe, OBJEKTE_PRO_RUNDE),
      `${koerbe[0].frage.replace('?', '')} — oder ${koerbe[1].name}?`,
      `Hier zählt nicht, was es ist, sondern wie es ist. ${koerbe[0].frage}`,
    )
  }

  /* ---------- Stufe 4: drei Körbe nach Art ---------- */
  if (lvl === 4) {
    const koerbe = sample(rng, ART_KATEGORIEN, 3)
    return baue(
      'art',
      koerbe.map((k) => spec(k)),
      verteile(rng, koerbe, OBJEKTE_PRO_RUNDE),
      'Drei Körbe — sortier alles ein!',
      `Jetzt sind es drei Körbe: ${koerbe.map((k) => k.name).join(', ')}.`,
    )
  }

  /* ---------- Stufe 1–3: zwei Körbe nach Art ---------- */
  const [aId, bId] = pick(rng, lvl === 1 ? PAARE_LEICHT : PAARE_SCHWER)
  const koerbe = [kategorieById(aId)!, kategorieById(bId)!]
  return baue(
    'art',
    koerbe.map((k) => spec(k)),
    verteile(rng, koerbe, OBJEKTE_PRO_RUNDE),
    `${koerbe[0].name} oder ${koerbe[1].name}?`,
    `Sortier ein: ${koerbe[0].name} in den einen Korb, ${koerbe[1].name} in den anderen.`,
  )
}

/* ------------------------------------------------------------------ */
/* Komponente                                                          */
/* ------------------------------------------------------------------ */

export function SortierWerkstatt({
  task, onDone, onWrong, say, revealSolution,
}: GameComponentProps<SortTask>) {
  const d = task.data
  const [index, setIndex] = useState(0)
  const [einsortiert, setEinsortiert] = useState<Record<string, string>>({})
  const [tries, setTries] = useState(0)
  const [fehlerHier, setFehlerHier] = useState(0)
  const [zuklappt, setZuklappt] = useState<string | null>(null)
  const [start] = useState(() => Date.now())
  const [deckelPhase, setDeckelPhase] = useState(false)
  const [geschafft, setGeschafft] = useState(false)

  useEffect(() => {
    setIndex(0); setEinsortiert({}); setTries(0); setFehlerHier(0)
    setZuklappt(null); setDeckelPhase(false); setGeschafft(false)
  }, [task])

  const aktuell: SortObjekt | undefined = d.dinge[index]

  const inKorb = useMemo(() => {
    const map: Record<string, SortObjekt[]> = {}
    for (const o of d.dinge) {
      const ziel = einsortiert[o.id]
      if (!ziel) continue
      ;(map[ziel] ??= []).push(o)
    }
    return map
  }, [d.dinge, einsortiert])

  const fertigMelden = useCallback(
    (mitHilfe: boolean) => {
      setGeschafft(true)
      sfx('success')
      setTimeout(
        () => onDone({ correct: true, usedHint: mitHilfe, timeMs: Date.now() - start }),
        950,
      )
    },
    [onDone, start],
  )

  const sortiere = useCallback(
    (dragId: string, zoneId: string | null) => {
      if (!aktuell || aktuell.id !== dragId || geschafft || deckelPhase) return
      if (!zoneId) return

      if (zoneId === aktuell.ziel) {
        sfx('pop')
        setEinsortiert((v) => ({ ...v, [dragId]: zoneId }))
        setFehlerHier(0)
        const weiter = index + 1
        if (weiter >= d.dinge.length) {
          if (d.mode === 'oberbegriff') {
            setDeckelPhase(true)
            say('Welcher Deckel gehört auf den Korb ohne Bild?')
          } else {
            fertigMelden(tries > 1)
          }
        } else {
          setIndex(weiter)
        }
        return
      }

      // Falscher Korb: Deckel klappt kurz zu, das Ding hüpft zurück.
      const n = tries + 1
      const hier = fehlerHier + 1
      setTries(n)
      setFehlerHier(hier)
      setZuklappt(zoneId)
      sfx('failSoft')
      setTimeout(() => setZuklappt(null), 520)
      if (hier >= 2) {
        // Beim zweiten Fehler am selben Ding benennt Funkel die Kategorie.
        const richtig = d.koerbe.find((k) => k.id === aktuell.ziel)
        say(
          aktuell.ziel === TISCH
            ? `${aktuell.mitArtikel} passt in keinen Korb — leg es auf den Tisch.`
            : `${aktuell.mitArtikel} gehört zu ${richtig?.name ?? 'dem anderen Korb'}.`,
        )
      }
      onWrong(n)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aktuell, index, d, tries, fehlerHier, geschafft, deckelPhase, say, onWrong, fertigMelden],
  )

  const sprichDing = useCallback(
    (id: string | null) => {
      const o = d.dinge.find((x) => x.id === id)
      if (o) sprich(o.name)
    },
    [d.dinge],
  )

  const { drag, hoverZone, gewaehlt, start: startDrag, registerZone, registerGhost, tapZone } =
    useDragDrop({ onDrop: sortiere, onTapPlace: sortiere, onSelect: sprichDing })

  function waehleDeckel(id: string) {
    if (geschafft) return
    if (id === d.deckelAntwort) {
      fertigMelden(tries > 1)
    } else {
      const n = tries + 1
      setTries(n)
      sfx('failSoft')
      onWrong(n)
    }
  }

  const zielKorb = revealSolution && aktuell ? aktuell.ziel : null

  return (
    <div className="ww-sortier">
      <p className="ww-sortier__frage">{d.frage}</p>

      {/* ---------- Körbe ---------- */}
      <div className="ww-sortier__koerbe">
        {d.koerbe.map((k) => (
          <Korb
            key={k.id}
            spec={k}
            inhalt={inKorb[k.id] ?? []}
            hover={hoverZone === k.id}
            bereit={Boolean(gewaehlt)}
            zu={zuklappt === k.id}
            tipp={zielKorb === k.id}
            registerZone={registerZone}
            onTap={() => tapZone(k.id)}
          />
        ))}
        {d.mitTisch && (
          <Korb
            key={TISCH}
            spec={{ id: TISCH, name: 'passt nirgends', deckel: '❓' }}
            inhalt={inKorb[TISCH] ?? []}
            hover={hoverZone === TISCH}
            bereit={Boolean(gewaehlt)}
            zu={zuklappt === TISCH}
            tipp={zielKorb === TISCH}
            tisch
            registerZone={registerZone}
            onTap={() => tapZone(TISCH)}
          />
        )}
      </div>

      {/* ---------- Das Ding, das gerade dran ist ---------- */}
      <div className="ww-sortier__band">
        {deckelPhase ? (
          <p className="ww-sortier__hinweis">Welcher Deckel passt?</p>
        ) : aktuell && !geschafft ? (
          <motion.button
            key={aktuell.id}
            type="button"
            className={`ww-sortding ${drag?.id === aktuell.id ? 'ww-sortding--drag' : ''} ${
              gewaehlt === aktuell.id ? 'ww-sortding--gewaehlt' : ''
            }`}
            aria-pressed={gewaehlt === aktuell.id}
            onPointerDown={(e) => startDrag(aktuell.id, e)}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            aria-label={aktuell.name}
          >
            <span className="ww-sortding__bild" aria-hidden="true">{aktuell.emoji}</span>
            <span className="ww-sortding__name">{aktuell.name}</span>
          </motion.button>
        ) : (
          <p className="ww-sortier__hinweis">✨ Alles einsortiert!</p>
        )}
        <p className="ww-sortier__zaehler">
          {Math.min(index + (geschafft ? 0 : 1), d.dinge.length)} von {d.dinge.length}
        </p>
      </div>

      {/* ---------- Deckel raten ---------- */}
      {deckelPhase && d.deckelAuswahl && (
        <ul className="ww-sortier__deckel">
          {d.deckelAuswahl.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                className={`ww-deckel ${revealSolution && x.id === d.deckelAntwort ? 'ww-deckel--tipp' : ''}`}
                onClick={() => waehleDeckel(x.id)}
                aria-label={x.name}
              >
                <span className="ww-deckel__bild" aria-hidden="true">{x.deckel}</span>
                <span className="ww-deckel__name">{x.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {drag && aktuell && (
        <div
          ref={registerGhost}
          className="ww-sortding ww-sortding--fliegt"
          style={{ width: drag.width, height: drag.height }}
          aria-hidden="true"
        >
          <span className="ww-sortding__bild">{aktuell.emoji}</span>
        </div>
      )}
    </div>
  )
}

function Korb({
  spec, inhalt, hover, bereit, zu, tipp, tisch, registerZone, onTap,
}: {
  spec: KorbSpec
  inhalt: SortObjekt[]
  hover: boolean
  bereit: boolean
  zu: boolean
  tipp: boolean
  tisch?: boolean
  registerZone: (id: string, el: HTMLElement | null) => void
  onTap: () => void
}) {
  return (
    <div
      ref={(el) => registerZone(spec.id, el)}
      className={`ww-korb ${tisch ? 'ww-korb--tisch' : ''} ${hover ? 'ww-korb--hover' : ''} ${
        bereit ? 'ww-korb--bereit' : ''
      } ${zu ? 'ww-korb--zu' : ''} ${tipp ? 'ww-korb--tipp' : ''}`}
      onClick={onTap}
      role={bereit ? 'button' : undefined}
      aria-label={`Korb ${spec.name}, ${inhalt.length} Dinge`}
    >
      <span className="ww-korb__deckel" aria-hidden="true">
        {spec.deckel ?? '❔'}
      </span>
      <span className="ww-korb__name">{spec.name}</span>
      <span className="ww-korb__inhalt" aria-hidden="true">
        {inhalt.map((o) => (
          <span key={o.id} className="ww-korb__ding">{o.emoji}</span>
        ))}
      </span>
    </div>
  )
}

export const sortierWerkstatt: GameModule<SortTask> = {
  id: 'sortier-werkstatt',
  worldId: 'logik',
  title: 'Sortier-Werkstatt',
  subtitle: 'Ordnen nach Art und Merkmal',
  icon: (
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <path d="M8 34 L34 34 L30 66 L12 66 Z" fill="#E8D3B0" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      <path d="M46 34 L72 34 L68 66 L50 66 Z" fill="#E8D3B0" stroke="#2E4034" strokeWidth="4" strokeLinejoin="round" />
      <rect x="5" y="27" width="32" height="9" rx="4" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <rect x="43" y="27" width="32" height="9" rx="4" fill="#B98A5E" stroke="#2E4034" strokeWidth="4" />
      <circle cx="21" cy="14" r="8" fill="#7FB069" stroke="#2E4034" strokeWidth="4" />
      <rect x="51" y="7" width="15" height="15" rx="4" fill="#E4634F" stroke="#2E4034" strokeWidth="4" />
    </svg>
  ),
  generateTask,
  Component: SortierWerkstatt,
}
