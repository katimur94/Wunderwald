import { useRef, useState } from 'react'
import { BigButton } from '../../components/BigButton'
import { ParentHeader } from './ParentHeader'
import { useApp } from '../../store/useApp'
import {
  BackupError,
  daysSince,
  exportBackup,
  importBackup,
  readBackupFile,
  type BackupFile,
  type ImportSummary,
} from '../../db/backup'

export function Backup() {
  const { family, load } = useApp()
  const dateiInput = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [exportiert, setExportiert] = useState<string | null>(null)
  const [geladen, setGeladen] = useState<BackupFile | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [ergebnis, setErgebnis] = useState<ImportSummary | null>(null)

  const tage = daysSince(family?.settings?.lastBackupAt ?? 0)

  async function exportieren() {
    setBusy(true)
    setFehler(null)
    try {
      const name = await exportBackup()
      setExportiert(name)
      await load()
    } catch {
      setFehler('Die Sicherung konnte nicht erstellt werden.')
    }
    setBusy(false)
  }

  async function dateiGewaehlt(file: File | undefined) {
    if (!file) return
    setFehler(null)
    setErgebnis(null)
    try {
      setGeladen(await readBackupFile(file))
    } catch (e) {
      setGeladen(null)
      setFehler(e instanceof BackupError ? e.message : 'Die Datei ließ sich nicht lesen.')
    }
  }

  async function importieren(modus: 'replace' | 'merge') {
    if (!geladen) return
    setBusy(true)
    setFehler(null)
    try {
      const summary = await importBackup(geladen, modus)
      setErgebnis(summary)
      setGeladen(null)
      await load()
    } catch {
      setFehler('Beim Einspielen ist etwas schiefgegangen. Die vorhandenen Daten sind unverändert.')
    }
    setBusy(false)
  }

  return (
    <main className="ww-page ww-parent">
      <ParentHeader title="Sicherung" />

      <section className="ww-card ww-stack">
        <h2>Warum das wichtig ist</h2>
        <p className="ww-hint">
          Wunderwald hat keinen Server. Alles liegt in diesem Browser auf diesem Gerät. Wenn das
          Gerät kaputtgeht, verloren geht oder jemand die Browserdaten löscht, ist der Fortschritt
          weg — außer, es gibt eine Sicherungsdatei.
        </p>
        <p>
          <strong>
            {tage === null
              ? 'Noch nie gesichert.'
              : tage === 0
                ? 'Zuletzt heute gesichert.'
                : `Letzte Sicherung: vor ${tage} ${tage === 1 ? 'Tag' : 'Tagen'}.`}
          </strong>
        </p>
        {tage !== null && tage >= 30 && (
          <p className="ww-hint">Das ist eine Weile her — vielleicht heute wieder eine anlegen?</p>
        )}
      </section>

      <section className="ww-card ww-stack">
        <h2>Sicherung erstellen</h2>
        <p className="ww-hint">
          Lädt eine JSON-Datei mit allen Kindern, Fortschritten und Wäldern herunter. Bewahren Sie
          sie dort auf, wo Sie auch Fotos sichern.
        </p>
        <BigButton tone="sonne" full icon="💾" disabled={busy} onClick={exportieren}>
          Sicherung herunterladen
        </BigButton>
        {exportiert && <p className="ww-erfolg">Gespeichert als {exportiert}</p>}
      </section>

      <section className="ww-card ww-stack">
        <h2>Sicherung einspielen</h2>
        <p className="ww-hint">
          Das ist zugleich der Umzug auf ein neues Gerät: hier exportieren, Datei rüberschicken,
          dort einspielen.
        </p>

        <input
          ref={dateiInput}
          type="file"
          accept="application/json,.json"
          className="ww-sr"
          onChange={(e) => dateiGewaehlt(e.target.files?.[0])}
        />
        <BigButton tone="papier" full icon="📂" onClick={() => dateiInput.current?.click()}>
          Datei auswählen
        </BigButton>

        {fehler && <p className="ww-field__error" role="alert">{fehler}</p>}

        {geladen && (
          <div className="ww-stack ww-import">
            <p>
              <strong>Datei gelesen.</strong> Enthalten: {geladen.data.children.length}{' '}
              {geladen.data.children.length === 1 ? 'Kind' : 'Kinder'} (
              {geladen.data.children.map((c) => c.nickname).join(', ')}),{' '}
              {geladen.data.attempts.length} gelöste Aufgaben. Erstellt am{' '}
              {new Date(geladen.exportedAt).toLocaleDateString('de-DE')}.
            </p>
            <p className="ww-hint">
              <strong>Ersetzen</strong> wirft alles auf diesem Gerät weg und übernimmt die Datei.{' '}
              <strong>Zusammenführen</strong> behält beides und übernimmt bei Konflikten den
              weiteren Stand.
            </p>
            <BigButton tone="moos" full disabled={busy} onClick={() => importieren('merge')}>
              Zusammenführen
            </BigButton>
            <BigButton tone="beere" full disabled={busy} onClick={() => importieren('replace')}>
              Alles ersetzen
            </BigButton>
            <BigButton tone="papier" size="m" full onClick={() => setGeladen(null)}>
              Abbrechen
            </BigButton>
          </div>
        )}

        {ergebnis && (
          <p className="ww-erfolg">
            {ergebnis.mode === 'replace' ? 'Ersetzt' : 'Zusammengeführt'}: {ergebnis.children}{' '}
            {ergebnis.children === 1 ? 'Kind' : 'Kinder'}, {ergebnis.attempts} Aufgaben.
          </p>
        )}
      </section>
    </main>
  )
}
