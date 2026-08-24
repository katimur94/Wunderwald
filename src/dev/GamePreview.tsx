import { useMemo, useState } from 'react'
import { allGames } from '../games'
import { mulberry32 } from '../games/rng'

/** Nur für die Entwicklung: jede Stufe jedes Spiels ansehen, ohne durchspielen zu müssen. */
export function GamePreview() {
  const games = allGames()
  const [gameId, setGameId] = useState(games[0]?.id ?? '')
  const [level, setLevel] = useState(1)
  const [seed, setSeed] = useState(1)

  const game = games.find((g) => g.id === gameId)
  const task = useMemo(
    () => (game ? game.generateTask(level, mulberry32(seed)) : null),
    [game, level, seed],
  )

  if (!game || !task) return <p>Kein Spiel registriert.</p>
  const Component = game.Component

  return (
    <main className="ww-gameshell" data-world={game.worldId}>
      <header className="ww-gameshell__bar" style={{ gap: 8, flexWrap: 'wrap' }}>
        <select value={gameId} onChange={(e) => setGameId(e.target.value)}>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
        <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Stufe {i + 1}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setSeed((s) => s + 1)}>
          Neue Aufgabe
        </button>
      </header>
      <section className="ww-gameshell__stage">
        <div className="ww-gameshell__task">
          <Component
            task={task}
            difficulty={level}
            onDone={() => setSeed((s) => s + 1)}
            onWrong={() => {}}
            say={() => {}}
            revealSolution={false}
          />
        </div>
      </section>
      <footer className="ww-gameshell__funkel" style={{ padding: 12 }}>
        <code style={{ fontSize: 13 }}>
          Lösung: {JSON.stringify(task.answer)} · {task.speak}
        </code>
      </footer>
    </main>
  )
}
