import { useEffect, useState } from 'react'
import { BigButton } from '../../components/BigButton'
import { PinPad } from '../../components/PinPad'
import { ParentHeader } from './ParentHeader'
import { useApp, useSettings } from '../../store/useApp'
import { db } from '../../db/db'
import { hashPin } from '../../db/pin'
import { hasGermanVoice, sprich, ttsSupported } from '../../audio/tts'
import { audio, sfx } from '../../audio/AudioManager'
import { useInstallPrompt } from '../../pwa/useInstallPrompt'
import { isStoragePersisted, requestPersistentStorage, storageEstimate } from '../../db/storage'
import { isIos, isStandalone } from '../../components/InstallHint'

const LIMITS = [0, 20, 30, 45, 60]

export function Settings() {
  const settings = useSettings()
  const { saveSettings, refreshFamily } = useApp()
  const { canInstall, install } = useInstallPrompt()

  const [pinAendern, setPinAendern] = useState(false)
  const [neuePin, setNeuePin] = useState('')
  const [pinGesetzt, setPinGesetzt] = useState(false)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [platz, setPlatz] = useState<{ usedMb: number; quotaMb: number } | null>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersisted)
    void storageEstimate().then(setPlatz)
  }, [])

  async function neuePinSpeichern(pin: string) {
    const { hash, salt } = await hashPin(pin)
    await db.family.update('family', { pinHash: hash, pinSalt: salt })
    await refreshFamily()
    await saveSettings({ pinFails: 0, pinLockedUntil: 0 })
    setPinGesetzt(true)
    setPinAendern(false)
    setNeuePin('')
    setTimeout(() => setPinGesetzt(false), 3000)
  }

  return (
    <main className="ww-page ww-parent">
      <ParentHeader title="Einstellungen" />

      {/* ---------- Ton und Sprache ---------- */}
      <section className="ww-card ww-stack">
        <h2>Ton und Sprache</h2>

        <Toggle
          label="Töne"
          hint="Klicks, Erfolgsklänge und Fanfaren. Alle Klänge werden im Gerät erzeugt — es werden keine Audiodateien geladen."
          checked={settings.soundOn}
          onChange={(v) => {
            audio.setEnabled(v)
            if (v) {
              audio.unlock()
              sfx('success')
            }
            void saveSettings({ soundOn: v })
          }}
        />

        <Toggle
          label="Funkel liest vor"
          hint="Aufgaben werden mit der Systemstimme vorgelesen. Der Text steht immer zusätzlich in der Sprechblase — die App bleibt also auch ohne Vorlesen vollständig nutzbar."
          checked={settings.ttsOn}
          onChange={(v) => {
            void saveSettings({ ttsOn: v })
            if (v) sprich('Hallo, ich bin Funkel!')
          }}
        />

        {!ttsSupported() && (
          <p className="ww-hint">
            Dieser Browser kann nicht vorlesen. Alle Texte stehen trotzdem in Funkels Sprechblase.
          </p>
        )}
        {ttsSupported() && !hasGermanVoice() && (
          <p className="ww-hint">
            Auf diesem Gerät ist keine deutsche Stimme installiert. Vorlesen klingt dann
            möglicherweise englisch — die Texte in der Sprechblase stimmen aber immer.
          </p>
        )}
      </section>

      {/* ---------- Tageslimit ---------- */}
      <section className="ww-card ww-stack">
        <h2>Tageslimit</h2>
        <p className="ww-hint">
          Ist das Limit erreicht, verabschiedet sich Funkel freundlich („Ich bin müde – morgen
          wachsen neue Abenteuer!“). Den eigenen Wald darf das Kind weiterhin anschauen, nur
          Spiele sind dann bis zum nächsten Tag zu.
        </p>
        <div className="ww-chips" role="group" aria-label="Tageslimit in Minuten">
          {LIMITS.map((m) => (
            <button
              key={m}
              type="button"
              className={`ww-chip ${settings.dailyLimitMin === m ? 'ww-chip--on' : ''}`}
              onClick={() => void saveSettings({ dailyLimitMin: m })}
              aria-pressed={settings.dailyLimitMin === m}
            >
              {m === 0 ? 'Aus' : `${m} Min`}
            </button>
          ))}
        </div>
      </section>

      {/* ---------- PIN ---------- */}
      <section className="ww-card ww-stack">
        <h2>Eltern-PIN</h2>
        {pinGesetzt && <p className="ww-erfolg">Neue PIN gespeichert.</p>}
        {!pinAendern ? (
          <BigButton tone="papier" full onClick={() => setPinAendern(true)}>
            PIN ändern
          </BigButton>
        ) : (
          <>
            <PinPad
              label="Neue PIN eingeben"
              value={neuePin}
              onChange={setNeuePin}
              onComplete={neuePinSpeichern}
            />
            <BigButton tone="papier" size="m" full onClick={() => { setPinAendern(false); setNeuePin('') }}>
              Abbrechen
            </BigButton>
          </>
        )}
      </section>

      {/* ---------- Gerät ---------- */}
      <section className="ww-card ww-stack">
        <h2>Gerät</h2>

        <p>
          Speicher geschützt:{' '}
          <strong>{persisted === null ? '…' : persisted ? 'ja' : 'nein'}</strong>
        </p>
        {persisted === false && (
          <>
            <p className="ww-hint">
              Ohne Schutz darf der Browser die Daten bei Platzmangel löschen. Meist hilft es, die
              App auf den Startbildschirm zu legen.
            </p>
            <BigButton
              tone="papier"
              size="m"
              full
              onClick={async () => setPersisted(await requestPersistentStorage())}
            >
              Schutz erneut anfragen
            </BigButton>
          </>
        )}
        {platz && (
          <p className="ww-hint">
            Belegt: {platz.usedMb} MB von etwa {platz.quotaMb} MB verfügbarem Platz.
          </p>
        )}

        {canInstall && (
          <BigButton tone="moos" full icon="📲" onClick={install}>
            App installieren
          </BigButton>
        )}
        {!canInstall && isIos() && !isStandalone() && (
          <p className="ww-hint">
            <strong>Auf dem iPhone/iPad:</strong> unten in Safari auf „Teilen“ tippen und dann auf
            „Zum Home-Bildschirm“. Danach startet Wunderwald wie eine echte App — auch ohne Internet.
          </p>
        )}
        {isStandalone() && <p className="ww-hint">Wunderwald läuft bereits als installierte App.</p>}
      </section>
    </main>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="ww-toggle">
      <label className="ww-toggle__row">
        <span className="ww-toggle__label">{label}</span>
        <input
          type="checkbox"
          className="ww-toggle__input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="ww-toggle__switch" aria-hidden="true" />
      </label>
      {hint && <p className="ww-hint">{hint}</p>}
    </div>
  )
}
