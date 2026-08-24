import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { UpdateBar } from './components/UpdateBar'
import { Onboarding } from './screens/Onboarding'
import { KidSelect } from './screens/KidSelect'
import { WorldMap } from './screens/WorldMap'
import { WorldScreen } from './screens/WorldScreen'
import { GameShell } from './screens/GameShell'
import { MyForest } from './screens/MyForest'
import { ParentArea } from './screens/parent/ParentArea'
import { Privacy } from './screens/Privacy'
import { useApp } from './store/useApp'
import { Splash } from './components/Splash'

/** Setzt das aktive Kind aus der URL – so überlebt es einen Reload. */
function ChildRoute({ children }: { children: React.ReactNode }) {
  const { childId } = useParams()
  const navigate = useNavigate()
  const { children: kids, activeChildId, setActiveChild, ready } = useApp()

  useEffect(() => {
    if (!ready || !childId) return
    if (!kids.some((k) => k.id === childId)) {
      navigate('/kinder', { replace: true })
      return
    }
    if (activeChildId !== childId) setActiveChild(childId)
  }, [ready, childId, kids, activeChildId, setActiveChild, navigate])

  if (!ready) return <Splash />
  if (!kids.some((k) => k.id === childId)) return <Splash />
  return <>{children}</>
}

function Boot() {
  const { ready, family, children } = useApp()
  if (!ready) return <Splash />
  if (!family) return <Navigate to="/onboarding" replace />
  if (children.length === 1) return <Navigate to={`/kind/${children[0].id}`} replace />
  return <Navigate to="/kinder" replace />
}

function Shell() {
  const { ready, load } = useApp()

  useEffect(() => {
    void load()
  }, [load])

  if (!ready) return <Splash />

  return (
    <div className="ww-app">
      <Routes>
        <Route path="/" element={<Boot />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/kinder" element={<KidSelect />} />
        <Route
          path="/kind/:childId"
          element={
            <ChildRoute>
              <WorldMap />
            </ChildRoute>
          }
        />
        <Route
          path="/kind/:childId/welt/:worldId"
          element={
            <ChildRoute>
              <WorldScreen />
            </ChildRoute>
          }
        />
        <Route
          path="/kind/:childId/spiel/:gameId"
          element={
            <ChildRoute>
              <GameShell />
            </ChildRoute>
          }
        />
        <Route
          path="/kind/:childId/wald"
          element={
            <ChildRoute>
              <MyForest />
            </ChildRoute>
          }
        />
        <Route path="/eltern/*" element={<ParentArea />} />
        <Route path="/datenschutz" element={<Privacy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdateBar />
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  )
}
