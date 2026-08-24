import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Funkel, type FunkelState } from '../world/Funkel'
import { SpeechBubble } from '../world/SpeechBubble'
import { StarCounter } from '../components/StarCounter'
import { BigButton } from '../components/BigButton'
import { Confetti } from '../components/Confetti'
import { Sheet } from '../components/Sheet'
import {
  companionLevel,
  emojiOf,
  freeSlots,
  GRID_SLOTS,
  growForest,
  makeForestItem,
  needsGrowth,
  objectById,
  pendingGift,
  scaleOf,
  shopFor,
  starsToNextCompanionLevel,
  unlockedOutfits,
  FOREST_OBJECTS,
  type ForestObject,
} from '../world/forest-objects'

const FOREST_OBJECT_COUNT = FOREST_OBJECTS.length
import { updateChild } from '../db/children'
import { useActiveChild, useApp, useSettings } from '../store/useApp'
import { audio, sfx } from '../audio/AudioManager'
import { sprich, stopSpeaking } from '../audio/tts'
import { dayKey } from '../learning/session'
import type { ForestItem } from '../db/types'
import './MyForest.css'

export function MyForest() {
  const navigate = useNavigate()
  const child = useActiveChild()
  const settings = useSettings()
  const { refreshChildren } = useApp()

  const [gewaehlt, setGewaehlt] = useState<ForestObject | null>(null)
  const [shopOffen, setShopOffen] = useState(false)
  const [outfitsOffen, setOutfitsOffen] = useState(false)
  const [bubble, setBubble] = useState('')
  const [funkelState, setFunkelState] = useState<FunkelState>('idle')
  const [feier, setFeier] = useState(false)
  const [frischerSlot, setFrischerSlot] = useState<number | null>(null)

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

  /* ---------- Beim Laden: Wachstum gutschreiben und Geschenke prüfen ---------- */
  useEffect(() => {
    if (!child) return
    let abgebrochen = false

    async function pflegen() {
      if (!child) return
      const heute = dayKey()
      const gewachsen = needsGrowth(child.forest, heute)
      const forest = gewachsen ? growForest(child.forest, heute) : child.forest

      const geschenk = pendingGift({ ...child, forest })
      if (geschenk) {
        const frei = freeSlots(forest)
        if (frei.length > 0) {
          forest.push(makeForestItem(geschenk.objectId, frei[0], heute))
        }
        await updateChild(child.id, {
          forest,
          milestones: [...(child.milestones ?? []), geschenk.id],
        })
        if (abgebrochen) return
        await refreshChildren()
        sfx('fanfare')
        setFeier(true)
        say(geschenk.text, 'jubelt')
        setTimeout(() => setFeier(false), 2800)
        return
      }

      if (gewachsen) {
        await updateChild(child.id, { forest })
        if (abgebrochen) return
        await refreshChildren()
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
  const frei = freeSlots(child.forest)
  const shop = shopFor(child.starsTotal)
  const outfits = unlockedOutfits(child.starsTotal)
  const funkelLevel = companionLevel(child.starsTotal)

  function waehle(obj: ForestObject) {
    if (!child) return
    if (child.stars < obj.kosten) {
      sfx('failSoft')
      say(`Der ${obj.name} kostet ${obj.kosten} Sterne. Spiel noch eine Runde, dann klappt es!`, 'troestet')
      return
    }
    if (frei.length === 0) {
      sfx('failSoft')
      say('Dein Wald ist voll! Du hast wirklich alles zugepflanzt.', 'troestet')
      return
    }
    sfx('click')
    setGewaehlt(obj)
    setShopOffen(false)
    say(`Such dir einen freien Platz für ${obj.name === 'Baum' ? 'deinen' : 'deine'} ${obj.name}.`)
  }

  async function pflanze(slot: number) {
    if (!child || !gewaehlt) return
    if (belegung.has(slot)) return

    sfx('plant')
    const forest = [...child.forest, makeForestItem(gewaehlt.id, slot)]
    await updateChild(child.id, { forest, stars: child.stars - gewaehlt.kosten })
    await refreshChildren()
    setFrischerSlot(slot)
    setTimeout(() => setFrischerSlot(null), 900)
    setGewaehlt(null)
    say(`${gewaehlt.name} gepflanzt! Komm morgen wieder, dann ist er gewachsen.`, 'jubelt')
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

  return (
    <main className="ww-forest">
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
        className={`ww-forest__scene ${gewaehlt ? 'ww-forest__scene--pflanzen' : ''}`}
        aria-label={`Dein Wald mit ${child.forest.length} von ${GRID_SLOTS} Plätzen`}
      >
        <ForestBackdrop />

        <div className="ww-forest__grid">
          {Array.from({ length: GRID_SLOTS }, (_, slot) => {
            const item = belegung.get(slot)
            return (
              <button
                key={slot}
                type="button"
                className={`ww-slotcell ${item ? 'ww-slotcell--voll' : ''} ${
                  gewaehlt && !item ? 'ww-slotcell--frei' : ''
                }`}
                onClick={() => (gewaehlt && !item ? pflanze(slot) : undefined)}
                disabled={!gewaehlt || !!item}
                aria-label={
                  item
                    ? `${objectById(item.objectId)?.name ?? 'Objekt'} auf Platz ${slot + 1}`
                    : `Freier Platz ${slot + 1}`
                }
              >
                {item && <PlantedItem item={item} frisch={frischerSlot === slot} />}
              </button>
            )
          })}
        </div>

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
            <Funkel state={funkelState} size={78} outfitId={child.companion.outfitId} />
          </button>
        </motion.div>
      </section>

      <div className="ww-forest__bubble">
        <SpeechBubble text={bubble} side="top" compact />
      </div>

      <footer className="ww-forest__foot">
        {gewaehlt ? (
          <>
            <p className="ww-forest__hinweis">
              <span aria-hidden="true">{gewaehlt.darstellung[0]}</span> Tippe auf einen freien Platz
            </p>
            <BigButton tone="papier" size="m" onClick={() => { setGewaehlt(null); sfx('click') }}>
              Abbrechen
            </BigButton>
          </>
        ) : (
          <>
            <BigButton
              tone="blatt"
              size="l"
              icon="🌱"
              onClick={() => {
                sfx('click')
                setShopOffen(true)
              }}
            >
              Pflanzen
            </BigButton>
            <p className="ww-forest__zaehler">
              {child.forest.length} / {GRID_SLOTS} Plätze
            </p>
          </>
        )}
      </footer>

      {/* ---------- Shop ---------- */}
      <AnimatePresence>
        {shopOffen && (
          <Sheet
            title="Was möchtest du pflanzen?"
            onClose={() => setShopOffen(false)}
            aside={<StarCounter stars={child.stars} size="s" />}
          >
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
            {shop.length < FOREST_OBJECT_COUNT && (
              <p className="ww-hint ww-shop__mehr">
                Sammle weiter Sterne — dann gibt es hier bald mehr zu entdecken.
              </p>
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
function PlantedItem({ item, frisch }: { item: ForestItem; frisch: boolean }) {
  const def = objectById(item.objectId)
  return (
    <motion.span
      className="ww-planted"
      style={{ fontSize: `${scaleOf(item) * 100}%` }}
      initial={frisch ? { scale: 0, y: 14 } : false}
      animate={{ scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 240, damping: 14 }}
      title={def?.name}
    >
      <span aria-hidden="true">{emojiOf(item)}</span>
    </motion.span>
  )
}

/**
 * Die Bühne für den Wald.
 *
 * Zweigeteilt, damit sie in jedem Seitenverhältnis stimmt: Das Gelände wird
 * gestreckt (Bänder vertragen das), Sonne und Wolken sind eigene Elemente und
 * bleiben deshalb immer rund.
 */
function ForestBackdrop() {
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

        {/* Ferne Hügel */}
        <path d="M-10 92 Q70 54 150 90 Q230 126 410 76 L410 310 L-10 310 Z" fill="#BFD9AE" />
        <path d="M-10 128 Q110 100 210 132 Q310 164 410 122 L410 310 L-10 310 Z" fill="#AFD199" />

        {/* Wiese, auf der gepflanzt wird */}
        <path d="M-10 158 Q140 140 260 162 Q340 176 410 158 L410 310 L-10 310 Z" fill="#CFE6B8" />

        {/* Bachlauf */}
        <path
          d="M-10 238 Q80 222 160 236 Q250 252 330 234 Q376 224 410 230 L410 258 Q370 252 322 264 Q240 284 156 264 Q86 248 -10 264 Z"
          fill="#9FD0DF"
          stroke="#6FB5C9"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />

        {/* Vordergrund-Wiese: hier läuft Funkel */}
        <path d="M-10 272 Q120 262 240 274 Q330 282 410 270 L410 310 L-10 310 Z" fill="#B9DCA0" />
      </svg>

      <span className="ww-forest__sonne" />
      <span className="ww-forest__wolke ww-forest__wolke--a" />
      <span className="ww-forest__wolke ww-forest__wolke--b" />
    </div>
  )
}
