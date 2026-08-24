import { useNavigate } from 'react-router-dom'
import { BigButton } from '../components/BigButton'

/**
 * Statische Route für Impressum und Datenschutz.
 * Die rechtlichen Angaben trägt der Betreiber ein — der technische Teil
 * beschreibt bereits wahrheitsgemäß, was die App tut (nämlich nichts senden).
 */
export function Privacy() {
  const navigate = useNavigate()
  return (
    <main className="ww-page">
      <h1>Impressum &amp; Datenschutz</h1>

      <section className="ww-card ww-stack">
        <h2>Impressum</h2>
        <p className="ww-hint">
          {/* PLATZHALTER — bitte ausfüllen */}
          [Platzhalter] Angaben gemäß § 5 TMG: Name, Anschrift und Kontakt des Betreibers werden
          hier ergänzt.
        </p>
      </section>

      <section className="ww-card ww-stack">
        <h2>Datenschutz</h2>
        <p>
          Wunderwald verarbeitet <strong>keine personenbezogenen Daten auf einem Server</strong>.
          Es gibt keinen Server.
        </p>
        <ul className="ww-list">
          <li>
            Alle Eingaben (Spitzname, Avatar, optionales Geburtsjahr, Spielfortschritt) werden
            ausschließlich lokal im Browser dieses Geräts gespeichert (IndexedDB).
          </li>
          <li>
            Nach dem ersten Laden stellt die App <strong>keine Netzwerkverbindungen</strong> her.
            Es werden keine Schriften, Bilder oder Skripte von fremden Servern nachgeladen.
          </li>
          <li>Es gibt keine Cookies zu Analyse- oder Werbezwecken, kein Tracking, keine Werbung.</li>
          <li>
            Die Eltern-PIN wird nur als kryptografischer Hash gespeichert (PBKDF2-SHA-256 mit
            Salt), niemals im Klartext.
          </li>
          <li>
            Die App bittet lediglich um dauerhaften lokalen Speicher
            (<code>navigator.storage.persist</code>). Es gibt keinen Zugriff auf Kamera,
            Mikrofon oder Standort.
          </li>
          <li>
            Daten löschen: im Elternbereich das jeweilige Kind entfernen, oder die Website-Daten
            im Browser löschen. Damit ist alles unwiderruflich weg.
          </li>
          <li>
            Beim Export einer Sicherungsdatei verlassen die Daten das Gerät nur so weit, wie Sie
            die Datei selbst weitergeben.
          </li>
        </ul>
        <p className="ww-hint">
          [Platzhalter] Verantwortliche Stelle und Kontakt für Auskunftsersuchen werden hier
          ergänzt.
        </p>
      </section>

      <BigButton tone="papier" onClick={() => navigate(-1)}>
        Zurück
      </BigButton>
    </main>
  )
}
