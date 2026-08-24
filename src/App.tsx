import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import { UpdateBar } from './components/UpdateBar'

function Placeholder() {
  return (
    <main className="ww-page">
      <h1>Wunderwald</h1>
      <p className="ww-lead">Spielen und Lernen – dein Wald wächst mit dir.</p>
      <p className="ww-hint">Der Wald wird gerade gepflanzt …</p>
    </main>
  )
}

export default function App() {
  return (
    <HashRouter>
      <div className="ww-app">
        <Routes>
          <Route path="/" element={<Placeholder />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <UpdateBar />
      </div>
    </HashRouter>
  )
}
