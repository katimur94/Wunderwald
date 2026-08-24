import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Funkel, type FunkelState } from '../world/Funkel'
import { SpeechBubble } from '../world/SpeechBubble'
import { StarCounter } from '../components/StarCounter'
import { Confetti } from '../components/Confetti'
import { begruessung, MUEDE, tippDesTages, TOUR } from '../world/funkel-lines'
import { sprich, stopSpeaking } from '../audio/tts'
import { audio, sfx } from '../audio/AudioManager'
import { useActiveChild, useApp, useSettings } from '../store/useApp'
import { claimQuestBonus, questsForDay, QUEST_BONUS_STARS } from '../learning/quests'
import { dayKey, isDailyLimitReached } from '../learning/session'
import { updateChild } from '../db/children'
import { WorldPortal } from '../world/WorldPortal'
import './WorldMap.css'

export function WorldMap() {
  const navigate = useNavigate()
  const child = useActiveChild()
  const settings = useSettings()
  const { refreshChildren } = useApp()

  const [bubble, setBubble] = useState('')
  const [funkelState, setFunkelState] = useState<FunkelState>('idle')
  const [tourStep, setTourStep] = useState<number | null>(null)
  const [limitReached, setLimitReached] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const quests = child ? questsForDay(child.id) : []
  const questState =
    child?.quests && child.quests.day === dayKey() ? child.quests : { day: dayKey(), done: [], claimed: false }
  const allQuestsDone = quests.length > 0 && questState.done.length >= quests.length

  useEffect(() => {
    audio.setEnabled(settings.soundOn)
  }, [settings.soundOn])

  /* ---------- Tageslimit prüfen ---------- */
  useEffect(() => {
    if (!child) return
    void isDailyLimitReached(child.id, settings.dailyLimitMin).then(setLimitReached)
  }, [child, settings.dailyLimitMin])

  const say = (text: string, state: FunkelState = 'spricht') => {
    setBubble(text)
    setFunkelState(state)
    if (settings.ttsOn) sprich(text, { onEnd: () => setFunkelState('idle') })
    else setTimeout(() => setFunkelState('idle'), 1400)
  }

  /* ---------- Erster Besuch: Mini-Tour ---------- */
  useEffect(() => {
    if (!child) return
    if (limitReached) {
      say(MUEDE, 'muede')
      return
    }
    if (!child.toured) {
      setTourStep(0)
      return
    }
    say(begruessung(child.nickname))
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child?.id, limitReached])

  useEffect(() => {
    if (tourStep === null || !child) return
    if (tourStep >= TOUR.length) {
      void updateChild(child.id, { toured: true }).then(refreshChildren)
      setTourStep(null)
      return
    }
    say(TOUR[tourStep])
    const t = setTimeout(() => setTourStep((s) => (s === null ? null : s + 1)), settings.ttsOn ? 3800 : 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourStep, child?.id])

  async function claimBonus() {
    if (!child) return
    const got = await claimQuestBonus(child.id)
    if (got > 0) {
      sfx('fanfare')
      setCelebrate(true)
      await refreshChildren()
      say(`Alle drei Tages-Sterne gefunden! ${got} Extra-Sterne für dich.`, 'jubelt')
      setTimeout(() => setCelebrate(false), 2600)
    }
  }

  function go(path: string) {
    if (limitReached && !path.endsWith('/wald')) {
      say(MUEDE, 'muede')
      return
    }
    audio.unlock()
    sfx('click')
    stopSpeaking()
    navigate(path)
  }

  if (!child) return null

  return (
    <main className="ww-map">
      <Confetti active={celebrate} />

      <header className="ww-map__top">
        <button type="button" className="ww-map__kid" onClick={() => navigate('/kinder')}>
          <span className="ww-map__kidname">{child.nickname}</span>
        </button>
        <StarCounter stars={child.stars} />
      </header>

      <section className="ww-map__scene" aria-label="Waldlichtung mit vier Zielen">
        <MapBackdrop />

        <div className="ww-map__portals">
          <WorldPortal
            worldId="zahlen"
            title="Zahlenland"
            onClick={() => go(`/kind/${child.id}/welt/zahlen`)}
            style={{ gridArea: 'a' }}
          />
          <WorldPortal
            worldId="buchstaben"
            title={"Buchstaben\u00ADwald"}
            onClick={() => go(`/kind/${child.id}/welt/buchstaben`)}
            style={{ gridArea: 'b' }}
          />
          <WorldPortal
            worldId="logik"
            title="Logik-Labor"
            onClick={() => go(`/kind/${child.id}/welt/logik`)}
            style={{ gridArea: 'c' }}
          />
          <WorldPortal
            worldId="wald"
            title="Mein Wald"
            onClick={() => go(`/kind/${child.id}/wald`)}
            style={{ gridArea: 'd' }}
          />
        </div>
      </section>

      <section className="ww-quests" aria-label="Tagesabenteuer">
        <h2 className="ww-quests__head">
          <span aria-hidden="true">🌟</span> Tagesabenteuer
        </h2>
        <ul className="ww-quests__list">
          {quests.map((q) => {
            const done = questState.done.includes(q.id)
            return (
              <li key={q.id} className={`ww-quest ${done ? 'ww-quest--done' : ''}`}>
                <span className="ww-quest__mark" aria-hidden="true">{done ? '⭐' : '☆'}</span>
                <span>{q.label}</span>
              </li>
            )
          })}
        </ul>
        {allQuestsDone && !questState.claimed && (
          <motion.button
            type="button"
            className="ww-quests__claim"
            onClick={claimBonus}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            Bonus abholen: +{QUEST_BONUS_STARS} ⭐
          </motion.button>
        )}
      </section>

      <footer className="ww-map__funkel">
        <button
          type="button"
          className="ww-map__funkelbtn"
          onClick={() => {
            audio.unlock()
            sfx('pop')
            say(limitReached ? MUEDE : tippDesTages(), limitReached ? 'muede' : 'spricht')
          }}
          aria-label="Funkel etwas fragen"
        >
          <Funkel
            state={limitReached ? 'muede' : funkelState}
            size={104}
            outfitId={child.companion.outfitId}
          />
        </button>
        <SpeechBubble text={bubble} side="right" />
      </footer>
    </main>
  )
}

/** Gezeichnete Waldlichtung als Hintergrund — reines SVG, lädt nichts nach. */
function MapBackdrop() {
  return (
    <svg className="ww-map__bg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="mapSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DCEEF6" />
          <stop offset="60%" stopColor="#EAF3E2" />
          <stop offset="100%" stopColor="#D8EAC9" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#mapSky)" />

      {/* Ferne Hügel */}
      <path d="M-10 118 Q60 84 130 116 Q200 148 270 112 Q340 78 410 118 L410 310 L-10 310 Z" fill="#BFD9AE" />
      <path d="M-10 158 Q80 128 160 158 Q250 190 330 154 Q380 134 410 150 L410 310 L-10 310 Z" fill="#A9CE96" />

      {/* Lichtung */}
      <ellipse cx="200" cy="232" rx="188" ry="76" fill="#CFE6B8" />

      {/* Bachlauf */}
      <path
        d="M-10 268 Q70 244 130 262 Q196 282 258 258 Q322 234 410 254 L410 300 L-10 300 Z"
        fill="#9FD0DF"
        stroke="#6FB5C9"
        strokeWidth="2"
      />

      {/* Bäume am Rand */}
      {[
        [22, 150, 20], [58, 132, 15], [352, 146, 19], [382, 128, 14],
        [12, 196, 16], [388, 194, 15],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <rect x={x - 3} y={y} width="6" height={r} fill="#B98A5E" />
          <circle cx={x} cy={y} r={r} fill="#6FA25C" stroke="#4C7B45" strokeWidth="2" />
        </g>
      ))}

      {/* Blumen auf der Lichtung */}
      {[[96, 250], [148, 268], [262, 262], [312, 246], [200, 278]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill={i % 2 ? '#F6BD41' : '#E4634F'} />
      ))}

      {/* Wolken */}
      <g fill="#FBFDF8" opacity="0.9">
        <ellipse cx="72" cy="42" rx="30" ry="15" />
        <ellipse cx="96" cy="38" rx="22" ry="13" />
        <ellipse cx="316" cy="34" rx="26" ry="13" />
        <ellipse cx="292" cy="38" rx="18" ry="10" />
      </g>
    </svg>
  )
}
