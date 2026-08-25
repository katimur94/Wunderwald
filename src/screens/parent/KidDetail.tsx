import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Avatar, AVATARS } from '../../components/Avatar'
import { BigButton } from '../../components/BigButton'
import { TextField } from '../../components/TextField'
import { ParentHeader } from './ParentHeader'
import { useApp } from '../../store/useApp'
import { db } from '../../db/db'
import { deleteChild, getAllProgress, updateChild } from '../../db/children'
import { currentTitle, describeLevel, WORLD_LABELS } from '../../learning/adaptivity'
import { buildInsights, type Insight } from '../../learning/insights'
import { dayKey, weeklyMinutes } from '../../learning/session'
import { giesstageSeit } from '../../world/forest-objects'
import { gesammelteObjekte } from '../Waldbuch'
import { WALDBUCH } from '../../world/waldbuch-daten'
import { allGames } from '../../games'
import { WORLD_IDS, type Attempt, type Progress, type WorldId } from '../../db/types'

const TAG_MS = 86_400_000

export function KidDetail() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const { children, refreshChildren } = useApp()
  const child = children.find((c) => c.id === childId)

  const [progress, setProgress] = useState<Record<WorldId, Progress> | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [wochen, setWochen] = useState<{ day: string; minutes: number }[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [bearbeiten, setBearbeiten] = useState(false)
  const [name, setName] = useState('')
  const [avatarId, setAvatarId] = useState('')
  const [loeschSchritt, setLoeschSchritt] = useState(0)

  useEffect(() => {
    if (!child) return
    setName(child.nickname)
    setAvatarId(child.avatarId)
    let abgebrochen = false

    async function laden() {
      if (!child) return
      const [p, a, w] = await Promise.all([
        getAllProgress(child.id),
        db.attempts.where('childId').equals(child.id).toArray(),
        weeklyMinutes(child.id),
      ])
      if (abgebrochen) return
      setProgress(p)
      setAttempts(a)
      setWochen(w)
      setInsights(
        buildInsights({ attempts: a, progress: p, minutenProTag: w, nickname: child.nickname }),
      )
    }
    void laden()
    return () => {
      abgebrochen = true
    }
  }, [child])

  if (!child) {
    return (
      <main className="ww-page ww-parent">
        <ParentHeader title="Kind" />
        <p>Dieses Kind gibt es nicht mehr.</p>
      </main>
    )
  }

  const letzte7 = attempts.filter((a) => a.ts >= Date.now() - 7 * TAG_MS)
  const quote7 = letzte7.length
    ? Math.round((letzte7.filter((a) => a.correct).length / letzte7.length) * 100)
    : null
  const maxMin = Math.max(10, ...wochen.map((w) => w.minutes))
  const siebenTageAlt = dayKey(Date.now() - 6 * TAG_MS)
  const albumSeiten = gesammelteObjekte(child.forest, child.inventory ?? []).size

  async function speichern() {
    await updateChild(child!.id, { nickname: name.trim() || child!.nickname, avatarId })
    await refreshChildren()
    setBearbeiten(false)
  }

  async function loeschen() {
    await deleteChild(child!.id)
    await refreshChildren()
    navigate('/eltern', { replace: true })
  }

  return (
    <main className="ww-page ww-parent">
      <ParentHeader title={child.nickname} />

      <section className="ww-card ww-card--tight">
        <div className="ww-kidcard__top">
          <Avatar avatarId={child.avatarId} size={64} />
          <div className="ww-kidcard__meta">
            <strong>{child.nickname}</strong>
            <span className="ww-hint">
              {child.stars} ⭐ Guthaben · {child.starsTotal} ⭐ insgesamt ·{' '}
              {child.forest.length} Objekte im Wald
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Stufen im Klartext ---------- */}
      <section className="ww-card ww-stack">
        <h2>Was {child.nickname} gerade kann</h2>
        <p className="ww-hint">
          Wunderwald vergibt keine Note und misst keinen IQ. Stattdessen steht hier pro Lernwelt,
          was zurzeit sicher klappt. Die Stufe passt sich still an — Ihr Kind bekommt davon nichts
          zu sehen.
        </p>
        <dl className="ww-levels">
          {WORLD_IDS.map((w) => {
            const lvl = progress?.[w]?.level ?? 1
            return (
              <div key={w} className={`ww-levels__row ww-levels__row--${w}`}>
                <dt>
                  {WORLD_LABELS[w]}
                  <span className="ww-levels__stufe">Stufe {lvl} / 10</span>
                </dt>
                <dd>
                  <strong>{currentTitle(w, lvl)}</strong>
                  <span className="ww-hint"> {describeLevel(w, lvl)}</span>
                </dd>
              </div>
            )
          })}
        </dl>
      </section>

      {/* ---------- Trend ---------- */}
      <section className="ww-card ww-stack">
        <h2>Die letzten 7 Tage</h2>
        <div className="ww-trend" role="img" aria-label={`Spielzeit der letzten sieben Tage, insgesamt ${wochen.reduce((s, w) => s + w.minutes, 0)} Minuten`}>
          {wochen.map((w) => (
            <div key={w.day} className="ww-trend__bar">
              <span
                className="ww-trend__fill"
                style={{ height: `${Math.round((w.minutes / maxMin) * 100)}%` }}
              />
              <span className="ww-trend__label">{w.day.slice(8)}</span>
            </div>
          ))}
        </div>
        <p className="ww-hint">
          {letzte7.length} Aufgaben gelöst
          {quote7 !== null && <> · {quote7} % davon richtig</>} ·{' '}
          {wochen.reduce((s, w) => s + w.minutes, 0)} Minuten gespielt
        </p>

        {/*
          Was neben den Aufgaben passiert ist. Bewusst ohne Ziel und ohne
          Balken: Das sind Zahlen zum Nachfragen beim Abendessen, keine
          Vorgaben, die jemand erfüllen müsste.
        */}
        <ul className="ww-wochenzahlen">
          <li>
            <span className="ww-wochenzahlen__zahl">{child.forestDays ?? 0}</span>
            <span className="ww-hint">
              {(child.forestDays ?? 0) === 1 ? 'Waldtag' : 'Waldtage'} insgesamt
            </span>
          </li>
          <li>
            <span className="ww-wochenzahlen__zahl">{giesstageSeit(child, siebenTageAlt)}</span>
            <span className="ww-hint">Tage gegossen</span>
          </li>
          <li>
            <span className="ww-wochenzahlen__zahl">
              {albumSeiten} / {WALDBUCH.length}
            </span>
            <span className="ww-hint">Seiten im Waldbuch</span>
          </li>
        </ul>
      </section>

      {/* ---------- Hinweise ---------- */}
      <section className="ww-card ww-stack">
        <h2>Auffälligkeiten? Eher: Anregungen</h2>
        <ul className="ww-insights">
          {insights.map((i) => (
            <li key={i.id} className={`ww-insight ww-insight--${i.ton}`}>
              <span className="ww-insight__icon" aria-hidden="true">
                {i.ton === 'lob' ? '🌟' : i.ton === 'tipp' ? '💡' : 'ℹ️'}
              </span>
              <div>
                <strong>{i.titel}</strong>
                <p className="ww-hint">{i.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="ww-hint">
          Diese Hinweise entstehen aus einfachen Regeln direkt auf diesem Gerät. Sie sind keine
          Diagnose und ersetzen kein Gespräch mit der Kita oder der Schule.
        </p>
      </section>

      {/* ---------- Spiel-Übersicht ---------- */}
      <section className="ww-card ww-stack">
        <h2>Nach Spiel</h2>
        <ul className="ww-gamestats">
          {allGames().map((g) => {
            const list = letzte7.filter((a) => a.gameId === g.id)
            const richtig = list.filter((a) => a.correct).length
            return (
              <li key={g.id}>
                <span className="ww-gamestats__name">{g.title}</span>
                <span className="ww-gamestats__zahl">
                  {list.length === 0 ? (
                    <span className="ww-hint">diese Woche nicht gespielt</span>
                  ) : (
                    <>
                      {richtig} / {list.length} richtig
                    </>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ---------- Kind bearbeiten ---------- */}
      <section className="ww-card ww-stack">
        <h2>Kind bearbeiten</h2>
        {!bearbeiten ? (
          <BigButton tone="papier" full onClick={() => setBearbeiten(true)}>
            Name und Tier ändern
          </BigButton>
        ) : (
          <>
            <TextField
              label="Spitzname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
            />
            <div className="ww-avatars__grid">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`ww-avatars__pick ${avatarId === a.id ? 'ww-avatars__pick--on' : ''}`}
                  onClick={() => setAvatarId(a.id)}
                  aria-pressed={avatarId === a.id}
                >
                  <Avatar avatarId={a.id} size={56} />
                  <span>{a.name}</span>
                </button>
              ))}
            </div>
            <BigButton tone="moos" full onClick={speichern}>
              Speichern
            </BigButton>
            <BigButton tone="papier" size="m" full onClick={() => setBearbeiten(false)}>
              Abbrechen
            </BigButton>
          </>
        )}
      </section>

      {/* ---------- Löschen: doppelt bestätigt ---------- */}
      <section className="ww-card ww-stack ww-danger">
        <h2>Kind löschen</h2>
        {loeschSchritt === 0 && (
          <>
            <p className="ww-hint">
              Entfernt {child.nickname} samt Fortschritt, Sternen und Wald. Das lässt sich nicht
              rückgängig machen — es gibt keine Kopie auf einem Server.
            </p>
            <BigButton tone="papier" full onClick={() => setLoeschSchritt(1)}>
              {child.nickname} löschen
            </BigButton>
          </>
        )}
        {loeschSchritt === 1 && (
          <>
            <p>
              <strong>Wirklich löschen?</strong> {child.nickname} hat {child.starsTotal} Sterne
              gesammelt und {child.forest.length} Dinge gepflanzt.
            </p>
            <BigButton tone="beere" full onClick={() => setLoeschSchritt(2)}>
              Ja, weiter
            </BigButton>
            <BigButton tone="papier" size="m" full onClick={() => setLoeschSchritt(0)}>
              Abbrechen
            </BigButton>
          </>
        )}
        {loeschSchritt === 2 && (
          <>
            <p>
              <strong>Letzte Nachfrage.</strong> Danach sind die Daten weg. Wenn Sie unsicher sind,
              erstellen Sie vorher eine Sicherungsdatei.
            </p>
            <BigButton tone="beere" full onClick={loeschen}>
              Endgültig löschen
            </BigButton>
            <BigButton tone="papier" size="m" full onClick={() => setLoeschSchritt(0)}>
              Doch nicht
            </BigButton>
          </>
        )}
      </section>
    </main>
  )
}
