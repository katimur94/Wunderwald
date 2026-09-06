import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Funkel, type FunkelState } from '../world/Funkel'
import { SpeechBubble } from '../world/SpeechBubble'
import { StarCounter } from '../components/StarCounter'
import { BigButton } from '../components/BigButton'
import { Confetti } from '../components/Confetti'
import { Sheet } from '../components/Sheet'
import { PlantSvg } from '../garden/PlantSvg'
import {
  aktualisiereBesucher,
  duengen,
  ernten,
  freieBeete,
  gartenVon,
  giessen,
  hatDurst,
  istReif,
  jaeten,
  merkeBekannt,
  neueBeete,
  offenerMeilenstein,
  pflanzen,
  schneckeVertreiben,
  simuliereGarten,
  welke,
} from '../garden/garden'
import {
  besucherById,
  DEKO,
  dekoById,
  dekoLaden,
  pflanzeById,
  samenLaden,
  type Pflanze,
} from '../garden/arten'
import { exportiereGartenBild } from '../world/forest-image'
import {
  aktuelleTageszeit,
  companionLevel,
  darfGiessen,
  istDunkel,
  merkeGiesstag,
  starsToNextCompanionLevel,
  unlockedOutfits,
} from '../world/forest-objects'
import { updateChild } from '../db/children'
import { useActiveChild, useApp, useSettings } from '../store/useApp'
import { audio, sfx } from '../audio/AudioManager'
import { sprich, stopSpeaking } from '../audio/tts'
import { dayKey } from '../learning/session'
import type { Garden, GardenBed } from '../db/types'
import './MyGarden.css'

type Werkzeug = 'hand' | 'kanne' | 'duenger'

const STUNDEN_TEXT = (h: number) => (h < 30 ? 'etwa 1 Tag' : h < 54 ? 'etwa 2 Tage' : h < 78 ? 'etwa 3 Tage' : 'etwa 4 Tage')

export function MyGarden() {
  const navigate = useNavigate()
  const child = useActiveChild()
  const settings = useSettings()
  const { refreshChildren } = useApp()

  const [werkzeug, setWerkzeug] = useState<Werkzeug>('hand')
  const [aktivSlot, setAktivSlot] = useState<number | null>(null)
  const [ladenSlot, setLadenSlot] = useState<number | null>(null)
  const [ladenTab, setLadenTab] = useState<'samen' | 'deko'>('samen')
  const [outfitsOffen, setOutfitsOffen] = useState(false)
  const [bubble, setBubble] = useState('')
  const [funkelState, setFunkelState] = useState<FunkelState>('idle')
  const [feier, setFeier] = useState(false)
  const [giesstSlot, setGiesstSlot] = useState<number | null>(null)
  const [pulsSlot, setPulsSlot] = useState<number | null>(null)
  const [ernteSlot, setErnteSlot] = useState<number | null>(null)
  const [rausnehmenFrage, setRausnehmenFrage] = useState(false)
  const [bereit, setBereit] = useState(false)

  const zeit = useMemo(() => aktuelleTageszeit(), [])
  const heute = dayKey()
  /*
   * Für welches Kind die Zeit schon verrechnet wurde. Ein Ref statt eines
   * Booleans: Wechselt die Adresse direkt von einem Kind zum nächsten, bleibt
   * dieser Screen montiert — und das zweite Kind braucht seine eigene Runde.
   */
  const gespeichertFuer = useRef<string | null>(null)

  const say = useCallback(
    (text: string, state: FunkelState = 'spricht') => {
      setBubble(text)
      setFunkelState(state)
      if (settings.ttsOn) sprich(text, { onEnd: () => setFunkelState('idle') })
      else setTimeout(() => setFunkelState('idle'), 1600)
    },
    [settings.ttsOn],
  )

  useEffect(() => {
    audio.setEnabled(settings.soundOn)
    return () => stopSpeaking()
  }, [settings.soundOn])

  const garden: Garden | null = child ? gartenVon(child) : null

  /** Schreibt den Garten (und optional Sterne) und lädt das Kind neu. */
  const speichere = useCallback(
    async (neu: Garden, extra: { stars?: number; starsTotal?: number; wateredDays?: string[]; milestones?: string[] } = {}) => {
      if (!child) return
      await updateChild(child.id, { garden: neu, ...extra })
      await refreshChildren()
    },
    [child, refreshChildren],
  )

  /* ---------- Beim Betreten: Zeit vergeht, Funkel berichtet ---------- */
  useEffect(() => {
    if (!child || gespeichertFuer.current === child.id) return
    gespeichertFuer.current = child.id
    setBereit(false)
    let abgebrochen = false
    void (async () => {
      const jetzt = Date.now()
      const start = gartenVon(child, jetzt)
      const sim = simuliereGarten(start, jetzt)
      const { garden: mitBesuch, neu } = aktualisiereBesucher(sim.garden)
      await updateChild(child.id, { garden: mitBesuch })
      if (abgebrochen) return
      await refreshChildren()
      setBereit(true)

      if (neu.length > 0) {
        const b = besucherById(neu[0])
        sfx('fanfare')
        setFeier(true)
        say(b?.text ?? 'Ein Tier ist zu Besuch!', 'jubelt')
        setTimeout(() => setFeier(false), 2600)
      } else if (sim.gereift.length > 0) {
        say(`${sim.gereift[0]} ist reif! Tippe drauf und ernte.`, 'jubelt')
      } else if (sim.durstig.length > 0) {
        say(
          sim.durstig.length === 1
            ? `${sim.durstig[0]} hat Durst. Hol die Gießkanne!`
            : `${sim.durstig.length} Pflanzen haben Durst. Hol die Gießkanne!`,
        )
      } else if (sim.unkraut > 0) {
        say('Da wächst Unkraut in deinen Beeten. Zupf es raus!')
      } else if (sim.schnecken > 0) {
        say('Eine Schnecke knabbert an deinen Pflanzen. Tipp sie an, dann verschwindet sie.')
      } else if (mitBesuch.beds.length === 0) {
        say('Dein Garten ist noch leer. Tippe auf ein Beet und pflanze deinen ersten Samen!')
      } else {
        say('Willkommen in deinem Garten! Deine Pflanzen sind zufrieden.')
      }
    })()
    return () => {
      abgebrochen = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id])

  if (!child || !garden) return null

  const beete = new Map(garden.beds.map((b) => [b.slot, b]))
  const laden = samenLaden(child.starsTotal)
  const deko = dekoLaden(child.starsTotal)
  const outfits = unlockedOutfits(child.starsTotal)
  const funkelLevel = companionLevel(child.starsTotal)
  const besucher = garden.visitors.map(besucherById).filter((b): b is NonNullable<typeof b> => Boolean(b))
  const durstige = garden.beds.filter(hatDurst).length
  const reife = garden.beds.filter(istReif).length

  function nachAenderung(neu: Garden): { garden: Garden; text: string | null } {
    const { garden: g2, neu: neueBesucher } = aktualisiereBesucher(neu)
    const b = neueBesucher.length ? besucherById(neueBesucher[0]) : null
    return { garden: g2, text: b?.text ?? null }
  }

  function feiere(text: string) {
    sfx('fanfare')
    setFeier(true)
    say(text, 'jubelt')
    setTimeout(() => setFeier(false), 2600)
  }

  /* ---------- Gießen ---------- */
  async function giesse(slot: number) {
    const bed = beete.get(slot)
    if (!bed || !garden) return
    const art = pflanzeById(bed.speciesId)
    if (bed.water >= 95) {
      sfx('pop')
      say(`${art?.name ?? 'Die Pflanze'} hat genug Wasser. Schau, ob eine andere Durst hat.`)
      return
    }
    sfx('plant')
    const jetzt = Date.now()
    const { bed: neu, schub } = giessen(bed, jetzt)
    setGiesstSlot(slot)
    setTimeout(() => setGiesstSlot(null), 1100)
    if (schub) {
      setPulsSlot(slot)
      setTimeout(() => setPulsSlot(null), 800)
    }
    const beds = garden.beds.map((b) => (b.slot === slot ? neu : b))
    const { garden: g2, text } = nachAenderung({ ...garden, beds })
    await speichere(g2, { wateredDays: merkeGiesstag(child!.wateredDays, heute) })
    const rest = beds.filter(hatDurst).length
    if (text) feiere(text)
    else if (schub && rest === 0) say(`Schön! ${art?.name ?? 'Die Pflanze'} streckt sich. Jetzt hat keine mehr Durst.`, 'jubelt')
    else if (schub) say(`Das tut gut! ${art?.name ?? 'Die Pflanze'} ist ein Stück gewachsen.`, 'jubelt')
    else say('Gegossen!')
  }

  /* ---------- Jäten und Schnecke ---------- */
  async function jaete(slot: number) {
    const bed = beete.get(slot)
    if (!bed || !garden) return
    sfx('rustle')
    const { bed: neu, schub } = jaeten(bed, Date.now())
    if (schub) {
      setPulsSlot(slot)
      setTimeout(() => setPulsSlot(null), 800)
    }
    const beds = garden.beds.map((b) => (b.slot === slot ? neu : b))
    await speichere({ ...garden, beds, compost: garden.compost + 1 })
    say(neu.weeds > 0 ? 'Eins weg — da ist noch mehr Unkraut.' : 'Unkraut weg! Das kommt auf den Kompost und wird Dünger.')
  }

  async function schnecke(slot: number) {
    const bed = beete.get(slot)
    if (!bed || !garden) return
    sfx('hop')
    const { bed: neu } = schneckeVertreiben(bed, Date.now())
    const beds = garden.beds.map((b) => (b.slot === slot ? neu : b))
    await speichere({ ...garden, beds })
    say('Die Schnecke kriecht davon. Der Igel freut sich schon auf sie.')
  }

  /* ---------- Düngen ---------- */
  async function duenge(slot: number) {
    const bed = beete.get(slot)
    if (!bed || !garden) return
    if (garden.compost <= 0) {
      sfx('failSoft')
      say('Der Kompost ist leer. Zupf Unkraut, dann gibt es wieder Dünger.', 'troestet')
      return
    }
    if (istReif(bed)) {
      say('Die ist schon reif — ernte sie lieber.')
      return
    }
    sfx('plant')
    const { bed: neu } = duengen(bed, Date.now())
    setPulsSlot(slot)
    setTimeout(() => setPulsSlot(null), 800)
    const beds = garden.beds.map((b) => (b.slot === slot ? neu : b))
    await speichere({ ...garden, beds, compost: garden.compost - 1 })
    say('Gedüngt! Die nächsten Stunden wächst sie doppelt so schnell.', 'jubelt')
  }

  /* ---------- Ernten ---------- */
  async function ernte(slot: number) {
    const bed = beete.get(slot)
    if (!bed || !garden) return
    const art = pflanzeById(bed.speciesId)
    if (!art || !istReif(bed)) return
    sfx('star')
    setErnteSlot(slot)
    setTimeout(() => setErnteSlot(null), 900)
    const jetzt = Date.now()
    const e = ernten(bed, art, jetzt)
    const beds = e.bed ? garden.beds.map((b) => (b.slot === slot ? e.bed! : b)) : garden.beds.filter((b) => b.slot !== slot)
    let g2: Garden = merkeBekannt({ ...garden, beds, harvestsTotal: garden.harvestsTotal + 1 }, art.id)
    const ausbau = neueBeete(g2)
    g2 = ausbau.garden
    const milestones = [...(child!.milestones ?? [])]
    const ms = offenerMeilenstein(g2.harvestsTotal, milestones)
    let sterne = e.sterne
    if (ms) {
      milestones.push(ms.id)
      sterne += ms.bonus
    }
    const { garden: g3, text: besuchText } = nachAenderung(g2)
    await speichere(g3, {
      stars: child!.stars + sterne,
      starsTotal: child!.starsTotal + sterne,
      milestones,
    })
    setAktivSlot(null)
    if (ms) feiere(`${ms.text} ${ms.bonus} Extra-Sterne!`)
    else if (ausbau.dazu > 0) feiere(`${e.text} Und schau: Dein Garten hat ${ausbau.dazu} neue Beete bekommen!`)
    else if (besuchText) feiere(`${e.text} ${besuchText}`)
    else {
      sfx('success')
      say(e.text, 'jubelt')
    }
  }

  /* ---------- Rausnehmen ---------- */
  async function rausnehmen(slot: number) {
    if (!garden) return
    sfx('rustle')
    const beds = garden.beds.filter((b) => b.slot !== slot)
    await speichere({ ...garden, beds })
    setAktivSlot(null)
    setRausnehmenFrage(false)
    say('Das Beet ist wieder frei. Was pflanzt du als Nächstes?')
  }

  /* ---------- Pflanzen ---------- */
  async function pflanze(art: Pflanze) {
    if (!garden) return
    if (child!.stars < art.kosten) {
      sfx('failSoft')
      say(`${art.name} kostet ${art.kosten} Sterne. Spiel noch eine Runde, dann klappt es!`, 'troestet')
      return
    }
    const frei = freieBeete(garden)
    const slot = ladenSlot !== null && frei.includes(ladenSlot) ? ladenSlot : frei[0]
    if (slot === undefined) {
      sfx('failSoft')
      say('Alle Beete sind voll. Ernte etwas oder nimm eine Pflanze raus.', 'troestet')
      return
    }
    sfx('plant')
    const neu = pflanzen(slot, art, Date.now())
    const g2 = merkeBekannt({ ...garden, beds: [...garden.beds, neu] }, art.id)
    await speichere(g2, { stars: child!.stars - art.kosten })
    setLadenSlot(null)
    setPulsSlot(slot)
    setTimeout(() => setPulsSlot(null), 800)
    say(`${art.name} gepflanzt! Gieß ${art.mitArtikel} jeden Tag, dann ist sie in ${STUNDEN_TEXT(art.stundenBisReif)} reif.`, 'jubelt')
  }

  async function kaufeDeko(id: string) {
    if (!garden) return
    const d = dekoById(id)
    if (!d) return
    if (garden.decor.some((x) => x.decorId === id)) {
      say(`${d.name} steht schon in deinem Garten.`)
      return
    }
    if (child!.stars < d.kosten) {
      sfx('failSoft')
      say(`${d.name} kostet ${d.kosten} Sterne. Spiel noch eine Runde, dann klappt es!`, 'troestet')
      return
    }
    sfx('plant')
    const g2 = { ...garden, decor: [...garden.decor, { slot: garden.decor.length, decorId: id }] }
    const { garden: g3, text } = nachAenderung(g2)
    await speichere(g3, { stars: child!.stars - d.kosten })
    setLadenSlot(null)
    if (text) feiere(text)
    else say(`${d.name} steht jetzt am Gartenrand.`, 'jubelt')
  }

  /* ---------- Beet angetippt ---------- */
  function beetGetippt(slot: number) {
    const bed = beete.get(slot)
    if (!bed) {
      sfx('click')
      setAktivSlot(null)
      setLadenTab('samen')
      setLadenSlot(slot)
      return
    }
    if (werkzeug === 'kanne') {
      void giesse(slot)
      return
    }
    if (werkzeug === 'duenger') {
      void duenge(slot)
      return
    }
    sfx('pop')
    setRausnehmenFrage(false)
    setAktivSlot(aktivSlot === slot ? null : slot)
    const art = pflanzeById(bed.speciesId)
    if (art && aktivSlot !== slot) {
      if (istReif(bed)) say(`${art.name} ist reif! Ernte sie.`, 'jubelt')
      else if (hatDurst(bed)) say(`${art.name} hat Durst. Gieß sie!`)
      else if (bed.growth < 0.25) say(`${art.name} keimt gerade. Gieß sie jeden Tag, dann wächst sie.`)
      else say(`${art.name} wächst. Noch ein bisschen Geduld.`)
    }
  }

  async function waehleOutfit(outfitId: string | null) {
    sfx('pop')
    await updateChild(child!.id, { companion: { ...child!.companion, level: funkelLevel, outfitId } })
    await refreshChildren()
    setOutfitsOffen(false)
  }

  async function bildSpeichern() {
    try {
      sfx('star')
      const name = await exportiereGartenBild(garden!, child!.nickname, zeit)
      say(`Dein Garten liegt jetzt als Bild bereit: ${name}`, 'jubelt')
    } catch {
      say('Das Bild hat leider nicht geklappt.', 'troestet')
    }
  }

  const aktivBed = aktivSlot !== null ? beete.get(aktivSlot) : undefined
  const aktivArt = aktivBed ? pflanzeById(aktivBed.speciesId) : undefined
  const kannGiessenHeute = darfGiessen(child, heute)

  return (
    <main className={`ww-vollbild ww-garten ww-garten--${zeit} ww-garten--${werkzeug}`}>
      <Confetti active={feier} />

      <header className="ww-garten__top">
        <button
          type="button"
          className="ww-iconbtn"
          onClick={() => {
            sfx('click')
            stopSpeaking()
            navigate(`/kind/${child.id}`)
          }}
          aria-label="Zurück zur Karte"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1>Mein Garten</h1>
        <button
          type="button"
          className="ww-buchbtn"
          onClick={() => {
            sfx('click')
            stopSpeaking()
            navigate(`/kind/${child.id}/waldbuch`)
          }}
          aria-label="Gartenbuch öffnen"
        >
          <span aria-hidden="true">📖</span>
        </button>
        <StarCounter stars={child.stars} size="s" />
      </header>

      <section className="ww-garten__scene" aria-label={`Dein Garten mit ${garden.beds.length} Pflanzen`}>
        <GartenHintergrund zeit={zeit} />

        <div className="ww-garten__feld">
          {/* Gartenrand: Deko und Besucher */}
          <div className="ww-garten__rand" aria-label="Gartenrand">
            <span className="ww-garten__zaun" aria-hidden="true" />
            {garden.decor.map((d) => {
              const def = dekoById(d.decorId)
              return def ? (
                <span
                  key={d.decorId}
                  className={`ww-garten__deko ${istDunkel(zeit) && (d.decorId === 'laterne') ? 'ww-garten__deko--leuchtet' : ''}`}
                  title={def.name}
                  role="img"
                  aria-label={def.name}
                >
                  {def.emoji}
                </span>
              ) : null
            })}
            {besucher.map((b, i) => (
              <motion.span
                key={b.id}
                className="ww-garten__besucher"
                role="img"
                aria-label={b.name}
                animate={{ y: [0, -6, 0], x: [0, i % 2 ? 8 : -8, 0] }}
                transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                onClick={() => {
                  sfx(b.id === 'vogel' ? 'bird' : b.id === 'hase' ? 'hop' : 'rustle')
                  say(b.fakten[Math.floor(Math.random() * b.fakten.length)])
                }}
              >
                {b.emoji}
              </motion.span>
            ))}
          </div>

          {/* Beete */}
          <div className="ww-garten__beete">
            {Array.from({ length: garden.bedCount }, (_, slot) => {
              const bed = beete.get(slot)
              const art = bed ? pflanzeById(bed.speciesId) : undefined
              const durst = bed ? hatDurst(bed) : false
              const reif = bed ? istReif(bed) : false
              return (
                <div
                  key={slot}
                  className={[
                    'ww-beet',
                    bed ? 'ww-beet--voll' : 'ww-beet--leer',
                    aktivSlot === slot ? 'ww-beet--aktiv' : '',
                    durst ? 'ww-beet--durst' : '',
                    reif ? 'ww-beet--reif' : '',
                    giesstSlot === slot ? 'ww-beet--giesst' : '',
                    ernteSlot === slot ? 'ww-beet--ernte' : '',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    className="ww-beet__knopf"
                    onClick={() => beetGetippt(slot)}
                    aria-label={
                      bed && art
                        ? `${art.name} auf Beet ${slot + 1}${reif ? ', reif' : durst ? ', hat Durst' : ''}`
                        : `Leeres Beet ${slot + 1} — hier etwas pflanzen`
                    }
                  >
                    <span className="ww-beet__erde" aria-hidden="true" />
                    {bed && art ? (
                      <motion.span
                        className="ww-beet__pflanze"
                        animate={pulsSlot === slot ? { scale: [1, 1.14, 1], y: [0, -6, 0] } : { scale: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                      >
                        <PlantSvg form={art.form} growth={bed.growth} welk={welke(bed)} farbe={art.farbe} />
                      </motion.span>
                    ) : (
                      <span className="ww-beet__plus" aria-hidden="true">+</span>
                    )}
                    {bed && (
                      <span className={`ww-beet__wasser ${durst ? 'ww-beet__wasser--leer' : ''}`} aria-hidden="true">
                        <i style={{ width: `${Math.round(bed.water)}%` }} />
                      </span>
                    )}
                    {durst && <span className="ww-beet__durst" aria-hidden="true">💧</span>}
                    {reif && <span className="ww-beet__reif" aria-hidden="true">✨</span>}
                    {bed?.fertilizedUntil && bed.fertilizedUntil > Date.now() && (
                      <span className="ww-beet__duenger" aria-hidden="true">⚡</span>
                    )}
                    {giesstSlot === slot && (
                      <span className="ww-beet__regen" aria-hidden="true">
                        <i /><i /><i /><i /><i />
                      </span>
                    )}
                  </button>

                  {/* Unkraut und Schnecke sind eigene Knöpfe — wer sie antippt, hilft der Pflanze. */}
                  {bed && bed.weeds > 0 &&
                    Array.from({ length: bed.weeds }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`ww-beet__unkraut ww-beet__unkraut--${i}`}
                        onClick={() => jaete(slot)}
                        aria-label="Unkraut zupfen"
                      >
                        🌿
                      </button>
                    ))}
                  {bed?.snail && (
                    <motion.button
                      type="button"
                      className="ww-beet__schnecke"
                      onClick={() => schnecke(slot)}
                      aria-label="Schnecke vertreiben"
                      animate={{ x: [0, 6, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      🐌
                    </motion.button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Aktionsblase am Beet */}
        <AnimatePresence>
          {aktivBed && aktivArt && aktivSlot !== null && werkzeug === 'hand' && (
            <motion.div
              className="ww-aktionen ww-aktionen--garten"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <span className="ww-aktionen__name">
                {aktivArt.name}
                <small>
                  {istReif(aktivBed)
                    ? 'reif!'
                    : `${Math.round(aktivBed.growth * 100)} % gewachsen${hatDurst(aktivBed) ? ' · hat Durst' : ''}`}
                </small>
              </span>
              {istReif(aktivBed) ? (
                <button type="button" className="ww-aktionen__haupt" onClick={() => ernte(aktivSlot)}>
                  🧺 Ernten
                </button>
              ) : (
                <button type="button" className="ww-aktionen__haupt" onClick={() => giesse(aktivSlot)}>
                  💧 Gießen
                </button>
              )}
              {!istReif(aktivBed) && garden.compost > 0 && (
                <button type="button" onClick={() => duenge(aktivSlot)}>
                  ✨ Düngen
                </button>
              )}
              <button
                type="button"
                className="ww-aktionen__leise"
                onClick={() => (rausnehmenFrage ? rausnehmen(aktivSlot) : setRausnehmenFrage(true))}
              >
                {rausnehmenFrage ? 'Wirklich rausnehmen?' : 'Rausnehmen'}
              </button>
              <button
                type="button"
                className="ww-aktionen__zu"
                onClick={() => {
                  setAktivSlot(null)
                  setRausnehmenFrage(false)
                }}
                aria-label="Schließen"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="ww-garten__funkel"
          animate={{ x: ['0%', '38%', '12%', '58%', '0%'] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        >
          <button
            type="button"
            className="ww-garten__funkelbtn"
            onClick={() => {
              sfx('pop')
              setOutfitsOffen(true)
            }}
            aria-label="Funkel anziehen"
          >
            <Funkel state={funkelState} size={72} outfitId={child.companion.outfitId} />
          </button>
        </motion.div>
      </section>

      <div className="ww-garten__bubble">
        <SpeechBubble text={bubble} side="top" compact />
      </div>

      <footer className="ww-garten__foot">
        <button
          type="button"
          className={`ww-werkzeug ${werkzeug === 'kanne' ? 'ww-werkzeug--an' : ''} ${durstige > 0 ? 'ww-werkzeug--noetig' : ''}`}
          onClick={() => {
            sfx('click')
            setAktivSlot(null)
            const neu = werkzeug === 'kanne' ? 'hand' : 'kanne'
            setWerkzeug(neu)
            if (neu === 'kanne') {
              say(
                durstige > 0
                  ? `Tippe die Pflanzen mit dem Wassertropfen an. ${durstige === 1 ? 'Eine hat' : `${durstige} haben`} Durst.`
                  : 'Tippe eine Pflanze an, um sie zu gießen.',
              )
            }
          }}
          aria-label={werkzeug === 'kanne' ? 'Gießkanne weglegen' : 'Gießkanne nehmen'}
          aria-pressed={werkzeug === 'kanne'}
        >
          <span aria-hidden="true">🪣</span>
          {durstige > 0 && <span className="ww-werkzeug__zahl">{durstige}</span>}
        </button>

        <button
          type="button"
          className={`ww-werkzeug ${werkzeug === 'duenger' ? 'ww-werkzeug--an' : ''} ${garden.compost === 0 ? 'ww-werkzeug--leer' : ''}`}
          onClick={() => {
            sfx('click')
            setAktivSlot(null)
            if (garden.compost === 0) {
              say('Der Kompost ist leer. Zupf Unkraut aus den Beeten — daraus wird Dünger.')
              return
            }
            const neu = werkzeug === 'duenger' ? 'hand' : 'duenger'
            setWerkzeug(neu)
            if (neu === 'duenger') say('Tippe eine Pflanze an, die schneller wachsen soll.')
          }}
          aria-label={`Dünger, ${garden.compost} Portionen`}
          aria-pressed={werkzeug === 'duenger'}
        >
          <span aria-hidden="true">✨</span>
          {garden.compost > 0 && <span className="ww-werkzeug__zahl">{garden.compost}</span>}
        </button>

        <BigButton
          tone="blatt"
          size="m"
          icon="🌱"
          onClick={() => {
            sfx('click')
            setWerkzeug('hand')
            setAktivSlot(null)
            setLadenTab('samen')
            setLadenSlot(freieBeete(garden)[0] ?? -1)
          }}
        >
          Laden
        </BigButton>

        <button type="button" className="ww-werkzeug" onClick={bildSpeichern} aria-label="Meinen Garten als Bild speichern">
          <span aria-hidden="true">📷</span>
        </button>

        <p className="ww-garten__zaehler">
          {garden.beds.length} / {garden.bedCount} Beete
          {reife > 0 && <> · 🧺 {reife} reif</>}
          {!kannGiessenHeute && bereit && <> · 💧 heute gegossen</>}
        </p>
      </footer>

      {/* ---------- Laden: Samen und Deko ---------- */}
      <AnimatePresence>
        {ladenSlot !== null && (
          <Sheet
            title={ladenTab === 'samen' ? 'Was möchtest du pflanzen?' : 'Etwas für den Gartenrand'}
            onClose={() => setLadenSlot(null)}
            aside={<StarCounter stars={child.stars} size="s" />}
          >
            <div className="ww-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={ladenTab === 'samen'}
                className={`ww-tab ${ladenTab === 'samen' ? 'ww-tab--an' : ''}`}
                onClick={() => setLadenTab('samen')}
              >
                🌱 Samen
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={ladenTab === 'deko'}
                className={`ww-tab ${ladenTab === 'deko' ? 'ww-tab--an' : ''}`}
                onClick={() => setLadenTab('deko')}
              >
                🏡 Deko
              </button>
            </div>

            {ladenTab === 'samen' ? (
              <>
                <ul className="ww-shop__list ww-shop__list--samen">
                  {laden.map((art) => {
                    const bezahlbar = child.stars >= art.kosten
                    return (
                      <li key={art.id}>
                        <button
                          type="button"
                          className={`ww-shopitem ww-shopitem--samen ${bezahlbar ? '' : 'ww-shopitem--teuer'}`}
                          onClick={() => pflanze(art)}
                          aria-label={`${art.name}, ${art.kosten} Sterne, reif in ${STUNDEN_TEXT(art.stundenBisReif)}`}
                        >
                          <span className="ww-shopitem__pflanze" aria-hidden="true">
                            <PlantSvg form={art.form} growth={1} welk={0} farbe={art.farbe} />
                          </span>
                          <span className="ww-shopitem__name">{art.name}</span>
                          <span className="ww-shopitem__dauer">{STUNDEN_TEXT(art.stundenBisReif)}</span>
                          <span className="ww-shopitem__preis">{art.kosten} ⭐</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {laden.length < 15 && (
                  <p className="ww-hint ww-shop__mehr">
                    Sammle weiter Sterne — dann gibt es hier bald neue Samen.
                  </p>
                )}
              </>
            ) : (
              <>
                <ul className="ww-shop__list">
                  {deko.map((d) => {
                    const hat = garden.decor.some((x) => x.decorId === d.id)
                    const bezahlbar = child.stars >= d.kosten
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          className={`ww-shopitem ${hat ? 'ww-shopitem--an' : bezahlbar ? '' : 'ww-shopitem--teuer'}`}
                          onClick={() => kaufeDeko(d.id)}
                        >
                          <span className="ww-shopitem__bild" aria-hidden="true">{d.emoji}</span>
                          <span className="ww-shopitem__name">{d.name}</span>
                          <span className={`ww-shopitem__preis ${hat ? 'ww-shopitem__preis--frei' : ''}`}>
                            {hat ? 'steht da' : `${d.kosten} ⭐`}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {deko.length < DEKO.length && (
                  <p className="ww-hint ww-shop__mehr">Mit mehr Sternen gibt es hier mehr zu entdecken.</p>
                )}
              </>
            )}
          </Sheet>
        )}
      </AnimatePresence>

      {/* ---------- Funkel-Outfits ---------- */}
      <AnimatePresence>
        {outfitsOffen && (
          <Sheet
            title="Funkel anziehen"
            onClose={() => setOutfitsOffen(false)}
            aside={<span className="ww-garten__level">Stufe {funkelLevel}</span>}
          >
            {outfits.length === 0 ? (
              <p className="ww-hint">
                Funkel bekommt sein erstes Halstuch bei 50 Sternen. Noch{' '}
                {starsToNextCompanionLevel(child.starsTotal)} Sterne!
              </p>
            ) : (
              <ul className="ww-shop__list ww-shop__list--outfits">
                <li>
                  <button
                    type="button"
                    className={`ww-shopitem ${child.companion.outfitId === null ? 'ww-shopitem--an' : ''}`}
                    onClick={() => waehleOutfit(null)}
                  >
                    <Funkel state="idle" size={56} outfitId={null} />
                    <span className="ww-shopitem__name">Ohne</span>
                  </button>
                </li>
                {outfits.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className={`ww-shopitem ${child.companion.outfitId === o.id ? 'ww-shopitem--an' : ''}`}
                      onClick={() => waehleOutfit(o.id)}
                    >
                      <Funkel state="idle" size={56} outfitId={o.id} />
                      <span className="ww-shopitem__name">{o.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="ww-hint ww-shop__mehr">
              Nächste Stufe in {starsToNextCompanionLevel(child.starsTotal)} Sternen.
            </p>
          </Sheet>
        )}
      </AnimatePresence>
    </main>
  )
}

/** Himmel, Hügel und Wiese hinter den Beeten. */
function GartenHintergrund({ zeit }: { zeit: ReturnType<typeof aktuelleTageszeit> }) {
  return (
    <div className="ww-garten__bg" aria-hidden="true">
      <svg className="ww-garten__terrain" viewBox="0 0 400 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="gartenSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CFE7F2" />
            <stop offset="100%" stopColor="#E7F2DE" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#gartenSky)" />
        <path d="M-10 92 Q70 54 150 90 Q230 126 410 76 L410 310 L-10 310 Z" fill="#BFD9AE" />
        <path d="M-10 128 Q110 100 210 132 Q310 164 410 122 L410 310 L-10 310 Z" fill="#AFD199" />
        <path d="M-10 158 Q140 140 260 162 Q340 176 410 158 L410 310 L-10 310 Z" fill="#CFE6B8" />
      </svg>
      <span className={`ww-garten__sonne ww-garten__sonne--${zeit}`} />
      <span className="ww-garten__wolke ww-garten__wolke--a" />
      <span className="ww-garten__wolke ww-garten__wolke--b" />
      <span className={`ww-garten__schleier ww-garten__schleier--${zeit}`} />
    </div>
  )
}

export { type GardenBed }
