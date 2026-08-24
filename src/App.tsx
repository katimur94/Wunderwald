import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { UpdateBar } from './components/UpdateBar'
import { Onboarding } from './screens/Onboarding'
import { KidSelect } from './screens/KidSelect'
import { WorldMap } from './screens/WorldMap'
import { WorldScreen } from './screens/WorldScreen'
import { useApp, useSettings } from './store/useApp'
import { Splash } from './components/Splash'
import { audio } from './audio/AudioManager'
import { setTtsEnabled } from './audio/tts'

/*
 * Nachgeladen, damit der erste Start klein bleibt: Spiele, Wald und
 * Elternbereich braucht niemand in der ersten Sekunde.
 */
const GameShell = lazy(() => import('./screens/GameShell').then((m) => ({ default: m.GameShell })))
const MyForest = lazy(() => import('./screens/MyForest').then((m) => ({ default: m.MyForest })))
const ParentArea = lazy(() =>
  import('./screens/parent/ParentArea').then((m) => ({ default: m.ParentArea })),
)
const Privacy = lazy(() => import('./screens/Privacy').then((m) => ({ default: m.Privacy })))
const FunkelPreview = lazy(() =>
  import('./dev/FunkelPreview').then((m) => ({ default: m.FunkelPreview })),
)
const GamePreview = lazy(() =>
  import('./dev/GamePreview').then((m) => ({ default: m.GamePreview })),
)

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

/** Ton- und Vorlese-Einstellung zentral durchreichen, damit sie überall gilt. */
function useAudioSettings() {
  const settings = useSettings()
  useEffect(() => {
    audio.setEnabled(settings.soundOn)
  }, [settings.soundOn])
  useEffect(() => {
    setTtsEnabled(settings.ttsOn)
  }, [settings.ttsOn])
}

function Shell() {
  const { ready, load } = useApp()
  useAudioSettings()

  useEffect(() => {
    void load()
  }, [load])

  /* Der AudioContext darf erst nach einer echten Nutzergeste entstehen (iOS). */
  useEffect(() => {
    const entsperren = () => audio.unlock()
    window.addEventListener('pointerdown', entsperren, { once: true })
    return () => window.removeEventListener('pointerdown', entsperren)
  }, [])

  if (!ready) return <Splash />

  return (
    <div className="ww-app">
      <Suspense fallback={<Splash />}>
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
        {import.meta.env.DEV && <Route path="/dev/funkel" element={<FunkelPreview />} />}
        {import.meta.env.DEV && <Route path="/dev/spiele" element={<GamePreview />} />}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <UpdateBar />
    </div>
  )
}

export default function App() {
  return (
    /*
     * reducedMotion="user": Wer im System "Bewegung reduzieren" eingestellt hat,
     * bekommt keine Flug- und Hüpf-Animationen mehr — Ein- und Ausblenden bleibt.
     * Die CSS-Seite regelt tokens.css, das hier ist die JS-Seite (Framer Motion).
     */
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Shell />
      </HashRouter>
    </MotionConfig>
  )
}
