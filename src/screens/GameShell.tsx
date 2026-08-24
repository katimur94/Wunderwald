import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getGame } from '../games'
import { mulberry32 } from '../games/rng'
import type { AnswerReport, GameTask } from '../games/types'
import { Funkel, type FunkelState } from '../world/Funkel'
import { SpeechBubble } from '../world/SpeechBubble'
import { hilfeFuer, leichter, lob, MUEDE, rundeFertig, trost, zeigeLoesung } from '../world/funkel-lines'
import { sprich, stopSpeaking, wiederhole } from '../audio/tts'
import { sfx } from '../audio/AudioManager'
import { applyAttempt, type Milestone } from '../learning/adaptivity'
import { db } from '../db/db'
import { getProgress } from '../db/children'
import { useApp, useActiveChild, useSettings } from '../store/useApp'
import { BigButton } from '../components/BigButton'
import { RewardScreen } from './RewardScreen'
import { markQuestProgress } from '../learning/quests'
import { closeSession, isDailyLimitReached, openSession } from '../learning/session'
import './GameShell.css'

const DEFAULT_TASKS_PER_ROUND = 6

export function GameShell() {
  const { gameId, childId } = useParams()
  const navigate = useNavigate()
  const child = useActiveChild()
  const settings = useSettings()
  const { refreshChildren } = useApp()

  const game = gameId ? getGame(gameId) : undefined
  const tasksPerRound = game?.tasksPerRound ?? DEFAULT_TASKS_PER_ROUND

  const [difficulty, setDifficulty] = useState<number | null>(null)
  const [taskNo, setTaskNo] = useState(0)
  const [task, setTask] = useState<GameTask | null>(null)
  /*
   * Zu welchem Spiel die aktuelle Aufgabe gehoert. Wechselt man per Adresse
   * direkt von einem Spiel ins naechste, bleibt diese Shell montiert — ohne
   * diese Zuordnung bekaeme das neue Spiel fuer einen Render die Aufgabe des
   * alten und stuerzte beim Auspacken der Daten ab.
   */
  const [taskFor, setTaskFor] = useState<string | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [bubble, setBubble] = useState('')
  const [funkelState, setFunkelState] = useState<FunkelState>('idle')
  const [paused, setPaused] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [finished, setFinished] = useState(false)
  const [earned, setEarned] = useState(0)
  const [milestone, setMilestone] = useState<Milestone | null>(null)
  const [limitErreicht, setLimitErreicht] = useState<boolean | null>(null)

  const startedAt = useRef(Date.now())
  const sessionId = useRef<number | null>(null)
  const gamesPlayed = useRef(0)
  const rng = useMemo(() => mulberry32((Date.now() ^ 0x9e3779b9) >>> 0), [])
  const correctCount = results.filter(Boolean).length

  /* ---------- Tageslimit: gilt auch bei direktem Aufruf der Adresse ---------- */
  useEffect(() => {
    if (!childId) return
    void isDailyLimitReached(childId, settings.dailyLimitMin).then(setLimitErreicht)
  }, [childId, settings.dailyLimitMin])

  /* ---------- Session öffnen / schließen ---------- */
  useEffect(() => {
    if (!childId || limitErreicht !== false) return
    let active = true
    void openSession(childId).then((id) => {
      if (active) sessionId.current = id
      else void closeSession(id, 0)
    })
    return () => {
      active = false
      if (sessionId.current !== null) void closeSession(sessionId.current, gamesPlayed.current)
      stopSpeaking()
    }
  }, [childId, limitErreicht])

  const say = useCallback(
    (text: string, state: FunkelState = 'spricht') => {
      setBubble(text)
      setFunkelState(state)
      if (settings.ttsOn) {
        sprich(text, { onEnd: () => setFunkelState((s) => (s === 'spricht' ? 'idle' : s)) })
      } else {
        setTimeout(() => setFunkelState((s) => (s === 'spricht' ? 'idle' : s)), 900)
      }
    },
    [settings.ttsOn],
  )

  /* ---------- Spielwechsel: alles zurücksetzen ---------- */
  useEffect(() => {
    setTask(null)
    setTaskFor(null)
    setDifficulty(null)
    setResults([])
    setTaskNo(0)
    setFinished(false)
    setEarned(0)
    setMilestone(null)
    setReveal(false)
  }, [gameId])

  /* ---------- Startstufe laden ---------- */
  useEffect(() => {
    if (!childId || !game || limitErreicht !== false) return
    void getProgress(childId, game.worldId).then((p) => setDifficulty(p.level))
  }, [childId, game, limitErreicht])

  /* ---------- Neue Aufgabe ziehen ---------- */
  const nextTask = useCallback(
    (lvl: number) => {
      if (!game) return
      const t = game.generateTask(lvl, rng)
      setTask(t)
      setTaskFor(game.id)
      setReveal(false)
      startedAt.current = Date.now()
      say(t.speak)
    },
    [game, rng, say],
  )

  useEffect(() => {
    if (difficulty !== null && task === null && !finished) nextTask(difficulty)
  }, [difficulty, task, finished, nextTask])

  /* ---------- Falsche Antwort: Frustschutz ---------- */
  const handleWrong = useCallback(
    (attemptNo: number) => {
      sfx('failSoft')
      if (attemptNo === 1) {
        say(trost(), 'troestet')
      } else {
        // Ab dem 2. Fehler zeigt Funkel die Lösung Schritt für Schritt.
        setReveal(true)
        say(zeigeLoesung(), 'troestet')
      }
    },
    [say],
  )

  /* ---------- Aufgabe abgeschlossen ---------- */
  const handleDone = useCallback(
    async (report: AnswerReport) => {
      if (!childId || !game || difficulty === null) return

      if (report.correct && !report.usedHint) {
        sfx('success')
        say(lob(), 'jubelt')
      } else if (report.correct) {
        sfx('pop')
        say('Gemeinsam geschafft!', 'jubelt')
      }

      await db.attempts.add({
        childId,
        worldId: game.worldId,
        gameId: game.id,
        difficulty,
        correct: report.correct,
        usedHint: report.usedHint,
        timeMs: report.timeMs,
        ts: Date.now(),
      })

      const prev = await getProgress(childId, game.worldId)
      const { progress, levelDelta, milestone: ms } = applyAttempt(prev, {
        correct: report.correct && !report.usedHint,
        usedHint: report.usedHint,
        timeMs: report.timeMs,
      })
      await db.progress.put(progress)
      setDifficulty(progress.level)
      if (ms) setMilestone(ms)

      const nextResults = [...results, report.correct && !report.usedHint]
      setResults(nextResults)

      const isLast = nextResults.length >= tasksPerRound
      const goOn = () => {
        if (isLast) {
          void finishRound(nextResults, ms)
        } else {
          setTaskNo((n) => n + 1)
          if (levelDelta < 0) {
            say(leichter(), 'troestet')
            setTimeout(() => nextTask(progress.level), 1800)
          } else {
            setTimeout(() => nextTask(progress.level), 950)
          }
          setTask(null)
        }
      }
      setTimeout(goOn, report.correct ? 750 : 400)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [childId, game, difficulty, results, tasksPerRound, say, nextTask],
  )

  /* ---------- Runde abschließen: Sterne vergeben ---------- */
  async function finishRound(finalResults: boolean[], ms: Milestone | null) {
    if (!child || !game) return
    const richtig = finalResults.filter(Boolean).length
    // Basis 1 Stern je richtiger Aufgabe, +1 Rundenbonus ab 5 richtigen.
    let stars = richtig + (richtig >= 5 ? 1 : 0)
    if (game.tasksPerRound === 1) stars = Math.max(1, richtig)
    if (ms) stars += ms.bonusStars

    const milestones = [...(child.milestones ?? [])]
    if (ms && !milestones.includes(ms.id)) milestones.push(ms.id)

    await db.children.update(child.id, {
      stars: child.stars + stars,
      starsTotal: child.starsTotal + stars,
      milestones,
    })
    await markQuestProgress(child.id, { gameId: game.id, worldId: game.worldId, correct: richtig })
    await refreshChildren()

    gamesPlayed.current += 1
    setEarned(stars)
    setFinished(true)
    sfx('fanfare')
    say(rundeFertig(richtig, finalResults.length, stars), 'jubelt')
  }

  function restart() {
    setResults([])
    setTaskNo(0)
    setFinished(false)
    setEarned(0)
    setMilestone(null)
    setTask(null)
  }

  if (!game) {
    return (
      <main className="ww-page">
        <h1>Dieses Spiel gibt es nicht.</h1>
        <BigButton onClick={() => navigate(`/kind/${childId}`)}>Zur Karte</BigButton>
      </main>
    )
  }

  if (limitErreicht === null) return null

  if (limitErreicht) {
    return (
      <main className="ww-page ww-limit">
        <Funkel state="muede" size={150} outfitId={child?.companion.outfitId ?? null} />
        <SpeechBubble text={MUEDE} side="top" />
        <BigButton size="xl" tone="blatt" full onClick={() => navigate(`/kind/${childId}/wald`)}>
          In meinen Wald
        </BigButton>
        <BigButton size="l" tone="papier" full onClick={() => navigate(`/kind/${childId}`)}>
          Zur Karte
        </BigButton>
      </main>
    )
  }

  if (finished) {
    return (
      <RewardScreen
        stars={earned}
        correct={correctCount}
        total={results.length}
        milestone={milestone}
        onAgain={restart}
        onForest={() => navigate(`/kind/${childId}/wald`)}
        onMap={() => navigate(`/kind/${childId}`)}
      />
    )
  }

  const Component = game.Component

  return (
    <main className="ww-gameshell" data-world={game.worldId}>
      <header className="ww-gameshell__bar">
        <button
          type="button"
          className="ww-iconbtn"
          onClick={() => {
            stopSpeaking()
            setPaused(true)
          }}
          aria-label="Pause"
        >
          <span aria-hidden="true">⏸</span>
        </button>

        <h1 className="ww-gameshell__title">{game.title}</h1>

        <ol className="ww-dots" aria-label={`Aufgabe ${taskNo + 1} von ${tasksPerRound}`}>
          {Array.from({ length: tasksPerRound }, (_, i) => (
            <li
              key={i}
              className={`ww-dots__dot ${
                i < results.length
                  ? results[i]
                    ? 'ww-dots__dot--ok'
                    : 'ww-dots__dot--miss'
                  : ''
              }`}
            />
          ))}
        </ol>
      </header>

      <section className={`ww-gameshell__stage ${game.fillsStage ? 'ww-gameshell__stage--voll' : ''}`}>
        <AnimatePresence mode="wait">
          {task && taskFor === game.id && (
            <motion.div
              key={taskNo}
              className={`ww-gameshell__task ${game.fillsStage ? 'ww-gameshell__task--voll' : ''}`}
              style={game.fillsStage ? { display: 'flex', flex: 1, minHeight: 0 } : undefined}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.22 }}
            >
              <Component
                task={task as never}
                difficulty={difficulty ?? 1}
                onDone={handleDone}
                onWrong={handleWrong}
                say={say}
                revealSolution={reveal}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <footer className="ww-gameshell__funkel">
        <Funkel state={funkelState} size={92} outfitId={child?.companion.outfitId ?? null} />
        <SpeechBubble text={bubble} side="right" />
        <button
          type="button"
          className="ww-iconbtn ww-iconbtn--help"
          onClick={() => {
            sfx('click')
            const text = task ? task.speak : hilfeFuer(game.id)
            setBubble(text)
            setFunkelState('spricht')
            if (settings.ttsOn) wiederhole()
            sprich(text)
          }}
          aria-label="Aufgabe noch einmal vorlesen"
        >
          <span aria-hidden="true">?</span>
        </button>
      </footer>

      {paused && (
        <div className="ww-modal" role="dialog" aria-modal="true" aria-label="Pause">
          <div className="ww-modal__box ww-card">
            <h2>Kurze Pause</h2>
            <BigButton size="xl" full onClick={() => setPaused(false)}>
              Weiterspielen
            </BigButton>
            <BigButton tone="papier" full onClick={() => navigate(`/kind/${childId}`)}>
              Zur Karte
            </BigButton>
          </div>
        </div>
      )}
    </main>
  )
}
