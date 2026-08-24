import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { gamesOfWorld } from '../games'
import { getProgress } from '../db/children'
import { currentTitle, describeLevel, WORLD_LABELS } from '../learning/adaptivity'
import { WORLD_INTRO } from '../world/funkel-lines'
import { sprich, stopSpeaking } from '../audio/tts'
import { sfx } from '../audio/AudioManager'
import { useActiveChild, useSettings } from '../store/useApp'
import { ProgressPath } from '../components/ProgressPath'
import { StarCounter } from '../components/StarCounter'
import type { WorldId } from '../db/types'
import { WORLD_IDS } from '../db/types'
import './WorldScreen.css'

export function WorldScreen() {
  const { worldId, childId } = useParams()
  const navigate = useNavigate()
  const child = useActiveChild()
  const settings = useSettings()
  const [level, setLevel] = useState(1)

  const world = WORLD_IDS.includes(worldId as WorldId) ? (worldId as WorldId) : null
  const games = world ? gamesOfWorld(world) : []

  useEffect(() => {
    if (!childId || !world) return
    void getProgress(childId, world).then((p) => setLevel(p.level))
  }, [childId, world])

  useEffect(() => {
    if (!world || !settings.ttsOn) return
    sprich(WORLD_INTRO[world])
    return () => stopSpeaking()
  }, [world, settings.ttsOn])

  if (!world || !child) {
    return (
      <main className="ww-page">
        <h1>Diese Welt gibt es nicht.</h1>
      </main>
    )
  }

  return (
    <main className={`ww-world ww-world--${world}`}>
      <header className="ww-world__top">
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
        <h1>{WORLD_LABELS[world]}</h1>
        <StarCounter stars={child.stars} size="s" />
      </header>

      <ProgressPath worldId={world} level={level} />

      <p className="ww-world__title-line">
        <strong>{currentTitle(world, level)}</strong>
        <span className="ww-hint"> · {describeLevel(world, level)}</span>
      </p>

      <ul className="ww-world__games">
        {games.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              className="ww-gametile"
              onClick={() => {
                sfx('click')
                stopSpeaking()
                navigate(`/kind/${child.id}/spiel/${g.id}`)
              }}
            >
              <span className="ww-gametile__icon" aria-hidden="true">
                {g.icon}
              </span>
              <span className="ww-gametile__text">
                <span className="ww-gametile__title">{g.title}</span>
                <span className="ww-gametile__sub">{g.subtitle}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
