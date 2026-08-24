import { useEffect, useState } from 'react'
import type { GameComponentProps, GameModule, GameTask } from '../types'
import { numberDistractors, randInt, shuffle, type Rng } from '../rng'
import { ChoiceRow } from '../../components/ChoiceRow'

/**
 * Platzhalter-Spiel aus Phase 2: beweist, dass die GameShell komplett
 * durchläuft (Aufgaben, Frustschutz, Sterne, attempts). Wird in Phase 3
 * durch die echten Spiele ersetzt.
 */
interface DummyData {
  a: number
  b: number
  options: number[]
}

type DummyTask = GameTask<DummyData>

function generateTask(difficulty: number, rng: Rng): DummyTask {
  const max = Math.min(10, 2 + difficulty)
  const a = randInt(rng, 1, max)
  const b = randInt(rng, 1, max)
  const answer = a + b
  const options = shuffle(rng, [answer, ...numberDistractors(rng, answer, 2, 0)])
  return { data: { a, b, options }, answer, speak: `Wie viel ist ${a} plus ${b}?` }
}

function DummyGame({ task, onDone, onWrong, revealSolution }: GameComponentProps<DummyTask>) {
  const [tries, setTries] = useState(0)
  const [start] = useState(() => Date.now())
  const [wrongPick, setWrongPick] = useState<number | null>(null)

  useEffect(() => {
    setTries(0)
    setWrongPick(null)
  }, [task])

  function choose(v: number) {
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

  return (
    <>
      <p className="ww-bigsum">
        {task.data.a} + {task.data.b} = ?
      </p>
      <ChoiceRow
        options={task.data.options}
        onPick={choose}
        wrongValue={wrongPick}
        highlight={revealSolution ? (task.answer as number) : null}
      />
    </>
  )
}

export const dummyGame: GameModule<DummyTask> = {
  id: 'dummy',
  worldId: 'zahlen',
  title: 'Probe-Spiel',
  subtitle: 'Platzhalter aus Phase 2',
  icon: <span style={{ fontSize: 48 }}>➕</span>,
  generateTask,
  Component: DummyGame,
}
