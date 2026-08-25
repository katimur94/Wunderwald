import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { WALDBUCH, type WaldbuchSeite } from '../world/waldbuch-daten'
import { StarCounter } from '../components/StarCounter'
import { BigButton } from '../components/BigButton'
import { useActiveChild, useSettings } from '../store/useApp'
import { sfx } from '../audio/AudioManager'
import { sprich, stopSpeaking } from '../audio/tts'
import './Waldbuch.css'

/**
 * Das Waldbuch: eine Seite je Wald-Objekt.
 *
 * Was das Kind hat, steht offen da. Was ihm noch fehlt, erscheint als
 * Schattenriss mit Fragezeichen — sichtbar genug zum Sammeln, aber ohne
 * Zählerstand, ohne Prozent, ohne „noch 12 fehlen".
 */

/** Alles, was das Kind besitzt: im Wald gepflanzt oder in der Kiste. */
export function gesammelteObjekte(
  forest: { objectId: string }[],
  inventory: { objectId: string }[] = [],
): Set<string> {
  return new Set([...forest, ...inventory].map((x) => x.objectId))
}

export function Waldbuch() {
  const navigate = useNavigate()
  const child = useActiveChild()
  const settings = useSettings()
  const [offen, setOffen] = useState<WaldbuchSeite | null>(null)

  const besitzt = useMemo(
    () => gesammelteObjekte(child?.forest ?? [], child?.inventory ?? []),
    [child?.forest, child?.inventory],
  )

  if (!child) return null

  const gefunden = WALDBUCH.filter((s) => besitzt.has(s.objectId)).length

  function lies(seite: WaldbuchSeite) {
    sfx('click')
    if (!settings.ttsOn) return
    sprich(`${seite.name}. ${seite.fakten.join(' ')}`)
  }

  return (
    <main className="ww-vollbild ww-buch">
      <header className="ww-buch__top">
        <button
          type="button"
          className="ww-iconbtn"
          onClick={() => {
            sfx('click')
            stopSpeaking()
            navigate(`/kind/${child.id}/wald`)
          }}
          aria-label="Zurück in den Wald"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1>Waldbuch</h1>
        <StarCounter stars={child.stars} size="s" />
      </header>

      <p className="ww-buch__zaehler">
        {gefunden} von {WALDBUCH.length} Seiten entdeckt
      </p>

      <ul className="ww-buch__regal">
        {WALDBUCH.map((seite) => {
          const hat = besitzt.has(seite.objectId)
          return (
            <li key={seite.objectId}>
              <button
                type="button"
                className={`ww-buchkarte ${hat ? '' : 'ww-buchkarte--leer'}`}
                onClick={() => {
                  if (!hat) {
                    sfx('click')
                    return
                  }
                  sfx('pop')
                  setOffen(seite)
                  if (settings.ttsOn) sprich(seite.name)
                }}
                aria-label={hat ? seite.name : 'Diese Seite fehlt noch'}
              >
                <span className="ww-buchkarte__bild" aria-hidden="true">
                  {hat ? seite.emoji : '❓'}
                </span>
                <span className="ww-buchkarte__name">{hat ? seite.name : '???'}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* ---------- Doppelseite ---------- */}
      <AnimatePresence>
        {offen && (
          <motion.div
            className="ww-buch__hintergrund"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              stopSpeaking()
              setOffen(null)
            }}
          >
            <motion.article
              className="ww-doppelseite"
              role="dialog"
              aria-label={offen.name}
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="ww-doppelseite__links">
                <span className="ww-doppelseite__bild" aria-hidden="true">{offen.emoji}</span>
                <h2>{offen.name}</h2>
              </div>

              <div className="ww-doppelseite__rechts">
                <ul className="ww-doppelseite__fakten">
                  {offen.fakten.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <div className="ww-doppelseite__knoepfe">
                  <BigButton size="m" tone="blatt" icon="🔊" onClick={() => lies(offen)}>
                    Vorlesen
                  </BigButton>
                  <BigButton
                    size="m"
                    tone="papier"
                    onClick={() => {
                      sfx('click')
                      stopSpeaking()
                      setOffen(null)
                    }}
                  >
                    Zuklappen
                  </BigButton>
                </div>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
