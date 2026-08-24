import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { BigButton } from '../../components/BigButton'
import { ParentHeader } from './ParentHeader'
import { useApp } from '../../store/useApp'
import { getAllProgress } from '../../db/children'
import { currentTitle, describeLevel, WORLD_LABELS } from '../../learning/adaptivity'
import { weeklyMinutes } from '../../learning/session'
import { daysSince } from '../../db/backup'
import { isStoragePersisted } from '../../db/storage'
import { WORLD_IDS, type Progress, type WorldId } from '../../db/types'

interface KidRow {
  childId: string
  progress: Record<WorldId, Progress>
  minutenWoche: number
}

export function Dashboard() {
  const navigate = useNavigate()
  const { children, family } = useApp()
  const [rows, setRows] = useState<Record<string, KidRow>>({})
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
  }, [])

  useEffect(() => {
    let abgebrochen = false
    async function laden() {
      const out: Record<string, KidRow> = {}
      for (const c of children) {
        const [progress, wochen] = await Promise.all([
          getAllProgress(c.id),
          weeklyMinutes(c.id),
        ])
        out[c.id] = {
          childId: c.id,
          progress,
          minutenWoche: wochen.reduce((s, d) => s + d.minutes, 0),
        }
      }
      if (!abgebrochen) setRows(out)
    }
    void laden()
    return () => {
      abgebrochen = true
    }
  }, [children])

  const tageSeitSicherung = daysSince(family?.settings?.lastBackupAt ?? 0)

  return (
    <main className="ww-page ww-parent">
      <ParentHeader title="Elternbereich" back="/" />

      {family?.parentName && <p className="ww-hint">Hallo, {family.parentName}.</p>}

      {(tageSeitSicherung === null || tageSeitSicherung >= 30) && (
        <aside className="ww-notice">
          <span aria-hidden="true">💾</span>
          <div>
            <strong>
              {tageSeitSicherung === null
                ? 'Noch keine Sicherung erstellt'
                : `Letzte Sicherung vor ${tageSeitSicherung} Tagen`}
            </strong>
            <p className="ww-hint">
              Wunderwald speichert alles nur auf diesem Gerät. Geht das Gerät verloren oder werden
              die Browserdaten gelöscht, ist der Fortschritt weg. Eine Sicherungsdatei dauert
              zehn Sekunden.
            </p>
            <BigButton size="m" tone="sonne" onClick={() => navigate('/eltern/sicherung')}>
              Jetzt sichern
            </BigButton>
          </div>
        </aside>
      )}

      <ul className="ww-kidcards">
        {children.map((c) => {
          const row = rows[c.id]
          return (
            <li key={c.id}>
              <button
                type="button"
                className="ww-kidcard"
                onClick={() => navigate(`/eltern/kind/${c.id}`)}
              >
                <div className="ww-kidcard__top">
                  <Avatar avatarId={c.avatarId} size={64} />
                  <div className="ww-kidcard__meta">
                    <strong>{c.nickname}</strong>
                    <span className="ww-hint">
                      {c.stars} ⭐ · {row ? `${row.minutenWoche} Min diese Woche` : '…'}
                    </span>
                  </div>
                  <span className="ww-kidcard__pfeil" aria-hidden="true">›</span>
                </div>

                <dl className="ww-levels">
                  {WORLD_IDS.map((w) => {
                    const lvl = row?.progress[w]?.level ?? 1
                    return (
                      <div key={w} className={`ww-levels__row ww-levels__row--${w}`}>
                        <dt>{WORLD_LABELS[w]}</dt>
                        <dd>
                          <strong>{currentTitle(w, lvl)}</strong>
                          <span className="ww-hint"> {describeLevel(w, lvl)}</span>
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="ww-parent__actions">
        <BigButton tone="papier" full onClick={() => navigate('/eltern/einstellungen')} icon="⚙️">
          Einstellungen
        </BigButton>
        <BigButton tone="papier" full onClick={() => navigate('/eltern/sicherung')} icon="💾">
          Sicherung
        </BigButton>
      </div>

      <section className="ww-card ww-card--tight ww-stack">
        <h2>Was Wunderwald über Ihr Kind speichert</h2>
        <p className="ww-hint">
          Spitzname, Avatar, das freiwillige Geburtsjahr und der Spielverlauf — ausschließlich in
          diesem Browser auf diesem Gerät. Es gibt keinen Server, keine Konten und keine
          Auswertung durch Dritte.
        </p>
        <p className="ww-hint">
          Speicher geschützt:{' '}
          <strong>{persisted === null ? '…' : persisted ? 'ja' : 'nein'}</strong>
          {persisted === false && (
            <>
              {' '}— der Browser darf die Daten bei Platzmangel löschen. Die App als Startbildschirm-
              App zu installieren hilft meistens.
            </>
          )}
        </p>
        <button type="button" className="ww-linkbtn" onClick={() => navigate('/datenschutz')}>
          Impressum &amp; Datenschutz
        </button>
      </section>
    </main>
  )
}
