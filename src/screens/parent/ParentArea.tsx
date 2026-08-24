import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { PinGateInline } from './PinGateInline'
import { Dashboard } from './Dashboard'
import { KidDetail } from './KidDetail'
import { Settings } from './Settings'
import { Backup } from './Backup'
import { useApp } from '../../store/useApp'
import { BigButton } from '../../components/BigButton'
import { InstallHint } from '../../components/InstallHint'
import './parent.css'

/** Alles hinter dem PIN-Gate. Die Freischaltung gilt nur für diese Sitzung. */
export function ParentArea() {
  const navigate = useNavigate()
  const { family, ready, parentUnlocked, setParentUnlocked } = useApp()

  useEffect(() => {
    if (ready && !family) navigate('/onboarding', { replace: true })
  }, [ready, family, navigate])

  if (!ready || !family) return null

  if (!parentUnlocked) {
    return (
      <main className="ww-page ww-parent ww-parent--gate">
        <h1>Elternbereich</h1>
        <section className="ww-card ww-stack">
          <PinGateInline onUnlock={() => setParentUnlocked(true)} />
        </section>
        <BigButton tone="papier" size="m" full onClick={() => navigate('/')}>
          Zurück zum Spiel
        </BigButton>
        <InstallHint />
      </main>
    )
  }

  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="kind/:childId" element={<KidDetail />} />
      <Route path="einstellungen" element={<Settings />} />
      <Route path="sicherung" element={<Backup />} />
      <Route path="*" element={<Navigate to="/eltern" replace />} />
    </Routes>
  )
}
