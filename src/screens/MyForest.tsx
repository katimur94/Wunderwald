import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Funkel, type FunkelState } from '../world/Funkel'
import { SpeechBubble } from '../world/SpeechBubble'
import { StarCounter } from '../components/StarCounter'
import { BigButton } from '../components/BigButton'
import { Confetti } from '../components/Confetti'
import { Sheet } from '../components/Sheet'
import {
  aktuelleTageszeit,
  ausKiste,
  BEREICHE,
  companionLevel,
  darfGiessen,
  emojiOf,
  FOREST_OBJECTS,
  freeSlots,
  inKiste,
  istDunkel,
  istGiessbar,
  istTier,
  makeForestItem,
  neuerBereich,
  objectById,
  offeneBereiche,
  pendingGift,
  scaleOf,
  shopFor,
  starsToNextCompanionLevel,
  unlockedOutfits,
  verschiebe,
  wandereTier,
  type ForestObject,
  ANSICHT_VON_OBEN,
} from '../world/forest-objects'
import { exportiereWaldBild } from '../world/forest-image'
import { updateChild } from '../db/children'
import { useActiveChild, useApp, useSettings } from '../store/useApp'
import { audio, sfx } from '../audio/AudioManager'
import { sprich, stopSpeaking } from '../audio/tts'
import { dayKey } from '../learning/session'
import { waldbuchFakt } from '../world/waldbuch-daten'
import type { ForestItem } from '../db/types'
import './MyForest.css'

type Modus =
  | { art: 'ruhe' }
  | { art: 'pflanzen'; objekt: ForestObject }
  | { art: 'kiste'; index: number; objectId: string }
  | { art: 'verschieben'; vonSlot: number }
  | { art: 'giessen' }

export function MyForest() {
  const navigate = useNavigate()
  const child = useActiveChild()
  const settings = useSettings()
  const { refreshChildren } = useApp()

  const [modus, setModus] = useState<Modus>({ art: 'ruhe' })
  const [aktionSlot, setAktionSlot] = useState<number | null>(null)
  const [shopOffen, setShopOffen] = useState(false)
  const [shopTab, setShopTab] = useState<'pflanzen' | 'kiste'>('pflanzen')
  const [outfitsOffen, setOutfitsOffen] = useState(false)
  const [bubble, setBubble] = useState('')
  const [funkelState, setFunkelState] = useState<FunkelState>('idle')
  const [feier, setFeier] = useState(false)
  const [frischerSlot, setFrischerSlot] = useState<number | null>(null)
  const [wackelSlot, setWackelSlot] = useState<number | null>(null)

  const zeit = useMemo(() => aktuelleTageszeit(), [])
  const heute = dayKey()

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

  /* ---------- Beim Laden: Wachsen, Wandern, Geschenke, neue Bereiche ---------- */
  useEffect(() => {
    if (!child) return
    let abgebrochen = false

    async function pflegen() {
      if (!child) return
      const { growForest, needsGrowth } = await import('../world/forest-objects')
      const gewachsen = needsGrowth(child.forest, heute)
      let forest = gewachsen ? growForest(child.forest, heute) : [...child.forest]
      const milestones = [...(child.milestones ?? [])]
      let meldung: string | null = null
      let jubel = false

      // Neuer Bereich?
      const bereich = neuerBereich(forest.length, milestones)
      if (bereich) {
        milestones.push(`bereich-${bereich.zone}`)
        meldung = bereich.text
        jubel = true
      }

      // Geschenk oder Set-Bonus?
      const geschenk = !bereich ? pendingGift({ ...child, forest }) : null
      if (geschenk) {
        const frei = freeSlots(forest, geschenk.objectId)
        if (frei.length > 0) forest.push(makeForestItem(geschenk.objectId, frei[0], heute))
        milestones.push(geschenk.id)
        meldung = geschenk.text
        jubel = true
      }

      // Ein Tier wechselt gelegentlich den Platz
      if (!bereich && !geschenk) {
        const wanderung = wandereTier(forest, Math.random)
        if (wanderung) forest = wanderung.forest
      }

      const etwasGeaendert =
        gewachsen || !!bereich || !!geschenk || forest !== child.forest
      if (etwasGeaendert) {
        await updateChild(child.id, { forest, milestones })
        if (abgebrochen) return
        await refreshChildren()
      }

      if (jubel) {
        sfx('fanfare')
        setFeier(true)
        say(meldung!, 'jubelt')
        setTimeout(() => setFeier(false), 2800)
      } else if (gewachsen) {
        say('Schau mal, über Nacht ist alles ein Stück gewachsen!', 'jubelt')
      } else {
        say('Willkommen in deinem Wald. Möchtest du etwas pflanzen?')
      }
    }

    void pflegen()
    return () => {
      abgebrochen = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id])

  if (!child) return null

  const belegung = new Map(child.forest.map((f) => [f.slot, f]))
  const inventar = child.inventory ?? []
  const bereiche = offeneBereiche(child.forest.length)
  const offeneZonen = bereiche.map((b) => b.zone)
  // Von oben nach unten wie in einer echten Landschaft: Huegel, Wiese, Bach.
  const streifen = ANSICHT_VON_OBEN
    .map((z) => bereiche.find((b) => b.zone === z))
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
  const shop = shopFor(child.starsTotal)
  const outfits = unlockedOutfits(child.starsTotal)
  const funkelLevel = companionLevel(child.starsTotal)
  const kannGiessen = darfGiessen(child, heute)

  /** Welche Slots sind gerade Ziel? */
  const zielSlots = (() => {
    if (modus.art === 'pflanzen') return new Set(freeSlots(child.forest, modus.objekt.id))
    if (modus.art === 'kiste') return new Set(freeSlots(child.forest, modus.objectId))
    if (modus.art === 'verschieben') {
      const objectId = belegung.get(modus.vonSlot)?.objectId
      return new Set(objectId ? freeSlots(child.forest, objectId) : [])
    }
    return new Set<number>()
  })()

  function abbrechen() {
    setModus({ art: 'ruhe' })
    setAktionSlot(null)
  }

  /* ---------- Shop: Objekt wählen ---------- */
  function waehle(obj: ForestObject) {
    if (!child) return
    if (child.stars < obj.kosten) {
      sfx('failSoft')
      say(`${obj.name} kostet ${obj.kosten} Sterne. Spiel noch eine Runde, dann klappt es!`, 'troestet')
      return
    }
    const frei = freeSlots(child.forest, obj.id)
    if (frei.length === 0) {
      sfx('failSoft')
      say(`Für ${obj.name} ist gerade kein Platz frei. Räum etwas in die Kiste!`, 'troestet')
      return
    }
    sfx('click')
    setModus({ art: 'pflanzen', objekt: obj })
    setShopOffen(false)
    const zonen = obj.zonen?.map((z) => BEREICHE.find((b) => b.zone === z)?.name).filter(Boolean)
    say(
      zonen && zonen.length < 3
        ? `Such einen Platz — ${obj.name} mag es ${zonen.join(' oder ')}.`
        : `Such dir einen freien Platz für ${obj.name}.`,
    )
  }

  /* ---------- Slot antippen ---------- */
  async function slotGetippt(slot: number) {
    if (!child) return
    const item = belegung.get(slot)

    // Ziel für Pflanzen / Kiste / Verschieben
    if (modus.art !== 'ruhe' && modus.art !== 'giessen' && !item && zielSlots.has(slot)) {
      if (modus.art === 'pflanzen') {
        sfx('plant')
        await updateChild(child.id, {
          forest: [...child.forest, makeForestItem(modus.objekt.id, slot, heute)],
          stars: child.stars - modus.objekt.kosten,
        })
        say(`${modus.objekt.name} gepflanzt! Komm morgen wieder, dann ist ${modus.objekt.name} gewachsen.`, 'jubelt')
      } else if (modus.art === 'kiste') {
        sfx('plant')
        const { forest, inventory } = ausKiste(child.forest, inventar, modus.index, slot, heute)
        await updateChild(child.id, { forest, inventory })
        say('Wieder da! Steht jetzt an seinem neuen Platz.', 'jubelt')
      } else if (modus.art === 'verschieben') {
        sfx('pop')
        await updateChild(child.id, { forest: verschiebe(child.forest, modus.vonSlot, slot) })
        say('Umgestellt!')
      }
      await refreshChildren()
      setFrischerSlot(slot)
      setTimeout(() => setFrischerSlot(null), 900)
      abbrechen()
      return
    }

    if (!item) return

    // Gießen
    if (modus.art === 'giessen') {
      if (!istGiessbar(item)) {
        sfx('failSoft')
        setWackelSlot(slot)
        setTimeout(() => setWackelSlot(null), 500)
        say('Das hier braucht kein Wasser. Such eine Pflanze oder einen Baum!')
        return
      }
      sfx('plant')
      const forest = child.forest.map((f) =>
        f.slot === slot ? { ...f, growthDays: f.growthDays + 1 } : f,
      )
      await updateChild(child.id, { forest, lastWatered: heute })
      await refreshChildren()
      setFrischerSlot(slot)
      setTimeout(() => setFrischerSlot(null), 900)
      abbrechen()
      say('Gegossen! Das tut gut. Morgen darfst du wieder.', 'jubelt')
      return
    }

    const def = objectById(item.objectId)

    if (def && istTier(item.objectId)) {
      // Tier: eigener Klang, Hüpfer und ein Satz aus dem Waldbuch
      sfx(def.klang ?? 'pop')
      setWackelSlot(slot)
      setTimeout(() => setWackelSlot(null), 700)
      say(waldbuchFakt(item.objectId) ?? `Das ist ${def.name}.`)
    } else if (def && (def.kategorie === 'pflanze' || def.kategorie === 'baum')) {
      // Pflanze: kleines Wippen, sonst nichts. Alles reagiert, nichts verlangt etwas.
      sfx('pop')
      setWackelSlot(slot)
      setTimeout(() => setWackelSlot(null), 600)
    } else {
      sfx('click')
    }

    // Die Aktionsblase gibt es fuer JEDES Objekt — auch Tiere muessen sich
    // umstellen und einlagern lassen.
    setAktionSlot(aktionSlot === slot ? null : slot)
  }

  async function inDieKiste(slot: number) {
    if (!child) return
    sfx('pop')
    const { forest, inventory } = inKiste(child.forest, inventar, slot)
    await updateChild(child.id, { forest, inventory })
    await refreshChildren()
    setAktionSlot(null)
    say('Ab in die Kiste. Du kannst es jederzeit wieder hinstellen — kostenlos.')
  }

  async function waehleOutfit(outfitId: string | null) {
    if (!child) return
    sfx('pop')
    await updateChild(child.id, {
      companion: { ...child.companion, level: funkelLevel, outfitId },
    })
    await refreshChildren()
    setOutfitsOffen(false)
  }

  async function bildSpeichern() {
    if (!child) return
    try {
      sfx('star')
      const name = await exportiereWaldBild(child.forest, child.nickname, zeit, offeneZonen)
      say(`Dein Wald liegt jetzt als Bild bereit: ${name}`, 'jubelt')
    } catch {
      say('Das Bild hat leider nicht geklappt.', 'troestet')
    }
  }

  const aktionItem = aktionSlot !== null ? belegung.get(aktionSlot) : undefined

  return (
    <main className={`ww-vollbild ww-forest ww-forest--${zeit}`}>
      <Confetti active={feier} />

      <header className="ww-forest__top">
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
        <h1>Mein Wald</h1>
        <StarCounter stars={child.stars} size="s" />
      </header>

      <section
        className={`ww-forest__scene ${modus.art !== 'ruhe' ? 'ww-forest__scene--aktiv' : ''}`}
        aria-label={`Dein Wald mit ${child.forest.length} Dingen`}
      >
        <ForestBackdrop zeit={zeit} />

        <div className="ww-forest__zonen">
          {streifen.map((b) => (
            <div key={b.zone} className={`ww-zone ww-zone--${b.zone}`}>
              <div className="ww-zone__grid">
                {Array.from({ length: b.anzahl }, (_, i) => {
                  const slot = b.von + i
                  const item = belegung.get(slot)
                  const istZiel = zielSlots.has(slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={`ww-slotcell ${item ? 'ww-slotcell--voll' : ''} ${
                        istZiel ? 'ww-slotcell--frei' : ''
                      } ${aktionSlot === slot ? 'ww-slotcell--aktiv' : ''}`}
                      onClick={() => slotGetippt(slot)}
                      disabled={!item && !istZiel}
                      aria-label={
                        item
                          ? `${objectById(item.objectId)?.name ?? 'Objekt'} auf Platz ${slot + 1}`
                          : `Freier Platz ${slot + 1}`
                      }
                    >
                      {item && (
                        <PlantedItem
                          item={item}
                          frisch={frischerSlot === slot}
                          wackelt={wackelSlot === slot}
                          leuchtet={istDunkel(zeit) && item.objectId === 'laterne'}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Aktionsblase am angetippten Objekt */}
        <AnimatePresence>
          {aktionItem && aktionSlot !== null && modus.art === 'ruhe' && (
            <motion.div
              className="ww-aktionen"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <span className="ww-aktionen__name">
                {objectById(aktionItem.objectId)?.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  sfx('click')
                  setModus({ art: 'verschieben', vonSlot: aktionSlot })
                  setAktionSlot(null)
                  say('Such einen neuen Platz. Das kostet nichts.')
                }}
              >
                Verschieben
              </button>
              <button type="button" onClick={() => inDieKiste(aktionSlot)}>
                In die Kiste
              </button>
              <button type="button" className="ww-aktionen__zu" onClick={() => setAktionSlot(null)}>
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="ww-forest__funkel"
          animate={{ x: ['0%', '38%', '12%', '58%', '0%'] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        >
          <button
            type="button"
            className="ww-forest__funkelbtn"
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

      <div className="ww-forest__bubble">
        <SpeechBubble text={bubble} side="top" compact />
      </div>

      <footer className="ww-forest__foot">
        {modus.art !== 'ruhe' ? (
          <>
            <p className="ww-forest__hinweis">
              {modus.art === 'giessen'
                ? '💧 Welche Pflanze soll Wasser?'
                : modus.art === 'verschieben'
                  ? '↔️ Wohin damit?'
                  : `${modus.art === 'pflanzen' ? modus.objekt.darstellung[0] : '📦'} Tippe einen freien Platz`}
            </p>
            <BigButton tone="papier" size="m" onClick={() => { abbrechen(); sfx('click') }}>
              Abbrechen
            </BigButton>
          </>
        ) : (
          <>
            <BigButton
              tone="blatt"
              size="m"
              icon="🌱"
              onClick={() => {
                sfx('click')
                setShopTab('pflanzen')
                setShopOffen(true)
              }}
            >
              Pflanzen
            </BigButton>

            <button
              type="button"
              className={`ww-kanne ${kannGiessen ? '' : 'ww-kanne--leer'}`}
              onClick={() => {
                sfx('click')
                if (!kannGiessen) {
                  say('Heute ist schon gegossen. Morgen wieder!')
                  return
                }
                setModus({ art: 'giessen' })
                say('Such eine Pflanze zum Gießen aus.')
              }}
              aria-label={kannGiessen ? 'Gießkanne' : 'Heute schon gegossen'}
            >
              <span aria-hidden="true">🪣</span>
            </button>

            <button
              type="button"
              className="ww-bildbtn"
              onClick={bildSpeichern}
              aria-label="Meinen Wald als Bild speichern"
            >
              <span aria-hidden="true">📷</span>
            </button>

            <p className="ww-forest__zaehler">
              {child.forest.length} Dinge
              {inventar.length > 0 && <> · 📦 {inventar.length}</>}
            </p>
          </>
        )}
      </footer>

      {/* ---------- Shop mit Kiste ---------- */}
      <AnimatePresence>
        {shopOffen && (
          <Sheet
            title={shopTab === 'pflanzen' ? 'Was möchtest du pflanzen?' : 'Deine Kiste'}
            onClose={() => setShopOffen(false)}
            aside={<StarCounter stars={child.stars} size="s" />}
          >
            <div className="ww-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={shopTab === 'pflanzen'}
                className={`ww-tab ${shopTab === 'pflanzen' ? 'ww-tab--an' : ''}`}
                onClick={() => setShopTab('pflanzen')}
              >
                🌱 Kaufen
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={shopTab === 'kiste'}
                className={`ww-tab ${shopTab === 'kiste' ? 'ww-tab--an' : ''}`}
                onClick={() => setShopTab('kiste')}
              >
                📦 Kiste {inventar.length > 0 && <span className="ww-tab__zahl">{inventar.length}</span>}
              </button>
            </div>

            {shopTab === 'pflanzen' ? (
              <>
                <ul className="ww-shop__list">
                  {shop.map((o) => {
                    const bezahlbar = child.stars >= o.kosten
                    return (
                      <li key={o.id}>
                        <button
                          type="button"
                          className={`ww-shopitem ${bezahlbar ? '' : 'ww-shopitem--teuer'}`}
                          onClick={() => waehle(o)}
                        >
                          <span className="ww-shopitem__bild" aria-hidden="true">
                            {o.darstellung[o.darstellung.length - 1]}
                          </span>
                          <span className="ww-shopitem__name">{o.name}</span>
                          <span className="ww-shopitem__preis">{o.kosten} ⭐</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {shop.length < FOREST_OBJECTS.length && (
                  <p className="ww-hint ww-shop__mehr">
                    Sammle weiter Sterne — dann gibt es hier bald mehr zu entdecken.
                  </p>
                )}
              </>
            ) : inventar.length === 0 ? (
              <p className="ww-hint">
                Deine Kiste ist leer. Tippe im Wald auf etwas und wähle „In die Kiste" —
                das kostet nichts und du kannst es jederzeit wieder hinstellen.
              </p>
            ) : (
              <ul className="ww-shop__list">
                {inventar.map((eintrag, i) => {
                  const def = objectById(eintrag.objectId)
                  return (
                    <li key={`${eintrag.objectId}-${i}`}>
                      <button
                        type="button"
                        className="ww-shopitem"
                        onClick={() => {
                          const frei = freeSlots(child.forest, eintrag.objectId)
                          if (frei.length === 0) {
                            sfx('failSoft')
                            say('Dafür ist gerade kein passender Platz frei.', 'troestet')
                            return
                          }
                          sfx('click')
                          setModus({ art: 'kiste', index: i, objectId: eintrag.objectId })
                          setShopOffen(false)
                          say(`Such einen Platz für ${def?.name ?? 'das Objekt'}.`)
                        }}
                      >
                        <span className="ww-shopitem__bild" aria-hidden="true">
                          {emojiOf({ ...eintrag, slot: 0, placedAt: 0, lastGrowthDay: '' })}
                        </span>
                        <span className="ww-shopitem__name">{def?.name}</span>
                        <span className="ww-shopitem__preis ww-shopitem__preis--frei">gratis</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
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
            aside={<span className="ww-forest__level">Stufe {funkelLevel}</span>}
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

/** Ein gepflanztes Objekt – wächst sichtbar mit den Spieltagen. */
function PlantedItem({
  item,
  frisch,
  wackelt,
  leuchtet,
}: {
  item: ForestItem
  frisch: boolean
  wackelt: boolean
  leuchtet: boolean
}) {
  const def = objectById(item.objectId)
  return (
    <motion.span
      className={`ww-planted ${leuchtet ? 'ww-planted--leuchtet' : ''}`}
      style={{ fontSize: `${scaleOf(item) * 100}%` }}
      initial={frisch ? { scale: 0, y: 14 } : false}
      animate={
        wackelt
          ? { scale: [1, 1.2, 0.95, 1.08, 1], rotate: [0, -8, 8, -4, 0], y: [0, -6, 0] }
          : { scale: 1, y: 0, rotate: 0 }
      }
      transition={{ type: wackelt ? 'tween' : 'spring', duration: wackelt ? 0.6 : undefined, stiffness: 240, damping: 14 }}
      title={def?.name}
    >
      <span aria-hidden="true">{emojiOf(item)}</span>
    </motion.span>
  )
}

/** Wiese, Bachlauf und Hügel – die Bühne für den Wald. */
function ForestBackdrop({ zeit }: { zeit: ReturnType<typeof aktuelleTageszeit> }) {
  return (
    <div className="ww-forest__bg" aria-hidden="true">
      <svg className="ww-forest__terrain" viewBox="0 0 400 300" preserveAspectRatio="none">
        <defs>
          <linearGradient id="forestSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CFE7F2" />
            <stop offset="100%" stopColor="#E7F2DE" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill="url(#forestSky)" />
        <path d="M-10 92 Q70 54 150 90 Q230 126 410 76 L410 310 L-10 310 Z" fill="#BFD9AE" />
        <path d="M-10 128 Q110 100 210 132 Q310 164 410 122 L410 310 L-10 310 Z" fill="#AFD199" />
        <path d="M-10 158 Q140 140 260 162 Q340 176 410 158 L410 310 L-10 310 Z" fill="#CFE6B8" />
        <path
          d="M-10 238 Q80 222 160 236 Q250 252 330 234 Q376 224 410 230 L410 258 Q370 252 322 264 Q240 284 156 264 Q86 248 -10 264 Z"
          fill="#9FD0DF"
          stroke="#6FB5C9"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
        <path d="M-10 272 Q120 262 240 274 Q330 282 410 270 L410 310 L-10 310 Z" fill="#B9DCA0" />
      </svg>

      <span className={`ww-forest__sonne ww-forest__sonne--${zeit}`} />
      <span className="ww-forest__wolke ww-forest__wolke--a" />
      <span className="ww-forest__wolke ww-forest__wolke--b" />
      {/* Stimmungs-Schleier über der ganzen Szene */}
      <span className={`ww-forest__schleier ww-forest__schleier--${zeit}`} />
      {zeit === 'nacht' && <Gluehwuermchen />}
    </div>
  )
}

/** Glühwürmchen — nur nachts, und nur wenn Bewegung erwünscht ist. */
function Gluehwuermchen() {
  const punkte = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({
      id: i,
      left: 6 + ((i * 37) % 88),
      top: 24 + ((i * 53) % 62),
      delay: (i % 5) * 0.7,
    })),
    [],
  )
  return (
    <span className="ww-gluehen" aria-hidden="true">
      {punkte.map((p) => (
        <motion.span
          key={p.id}
          className="ww-gluehen__punkt"
          style={{ left: `${p.left}%`, top: `${p.top}%` }}
          animate={{ opacity: [0, 1, 0], y: [0, -14, -4] }}
          transition={{ duration: 3.4, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}
