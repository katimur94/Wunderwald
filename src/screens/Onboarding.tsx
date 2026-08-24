import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BigButton } from '../components/BigButton'
import { TextField } from '../components/TextField'
import { PinPad } from '../components/PinPad'
import { AVATARS, Avatar } from '../components/Avatar'
import { db, DEFAULT_SETTINGS } from '../db/db'
import { hashPin, hashRecovery, isPinValid } from '../db/pin'
import { makeRecoveryPhrase } from '../db/recovery-words'
import { createChild } from '../db/children'
import { requestPersistentStorage } from '../db/storage'
import { useApp } from '../store/useApp'
import type { Family } from '../db/types'
import './Onboarding.css'

type Step = 'willkommen' | 'pin' | 'pin2' | 'satz' | 'kind'

const CURRENT_YEAR = new Date().getFullYear()

export function Onboarding() {
  const navigate = useNavigate()
  const { load, setActiveChild } = useApp()

  const [step, setStep] = useState<Step>('willkommen')
  const [parentName, setParentName] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [phrase] = useState(() => makeRecoveryPhrase())
  const [phraseConfirmed, setPhraseConfirmed] = useState(false)

  const [nickname, setNickname] = useState('')
  const [avatarId, setAvatarId] = useState(AVATARS[0].id)
  const [birthYear, setBirthYear] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      const { hash: pinHash, salt: pinSalt } = await hashPin(pin)
      const { hash: recoveryHash, salt: recoverySalt } = await hashRecovery(phrase)
      const family: Family = {
        id: 'family',
        parentName: parentName.trim() || 'Elternteil',
        pinHash,
        pinSalt,
        recoveryHash,
        recoverySalt,
        createdAt: Date.now(),
        settings: { ...DEFAULT_SETTINGS },
      }
      await db.family.put(family)

      const year = Number(birthYear)
      const child = await createChild({
        nickname: nickname.trim(),
        avatarId,
        birthYear:
          Number.isInteger(year) && year >= CURRENT_YEAR - 14 && year <= CURRENT_YEAR ? year : null,
      })

      await requestPersistentStorage()
      await load()
      setActiveChild(child.id)
      navigate(`/kind/${child.id}`, { replace: true })
    } catch (e) {
      setError('Das hat leider nicht geklappt. Bitte noch einmal versuchen.')
      console.error(e)
      setBusy(false)
    }
  }

  return (
    <main className="ww-page ww-onboarding">
      <ol className="ww-steps" aria-label="Fortschritt der Einrichtung">
        {(['willkommen', 'pin', 'kind'] as const).map((s, i) => {
          const groupIndex = step === 'willkommen' ? 0 : step === 'kind' ? 2 : 1
          return (
            <li
              key={s}
              className={`ww-steps__dot ${i <= groupIndex ? 'ww-steps__dot--on' : ''}`}
              aria-current={i === groupIndex ? 'step' : undefined}
            >
              <span className="ww-sr">Schritt {i + 1}</span>
            </li>
          )
        })}
      </ol>

      {step === 'willkommen' && (
        <section className="ww-card ww-stack">
          <div className="ww-onboarding__hero" aria-hidden="true">🌲🦊🌟</div>
          <h1>Willkommen im Wunderwald</h1>
          <p className="ww-lead">
            Hier lösen Kinder kurze Aufgaben und bauen mit ihren Sternen einen eigenen Wald auf.
            Der Fuchs <strong>Funkel</strong> liest alles vor — auch wer noch nicht lesen kann,
            spielt alleine.
          </p>
          <div className="ww-privacy">
            <span className="ww-privacy__icon" aria-hidden="true">🔒</span>
            <div>
              <strong>Alle Daten bleiben auf diesem Gerät.</strong>
              <p className="ww-hint">
                Wunderwald funkt nicht nach Hause: kein Server, kein Konto, keine Werbung, keine
                Auswertung. Was hier gespeichert wird, verlässt dieses Gerät nur, wenn Sie selbst
                eine Sicherungsdatei exportieren.
              </p>
            </div>
          </div>
          <TextField
            label="Wie heißen Sie?"
            hint="Nur für die Begrüßung im Elternbereich."
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            autoComplete="off"
            maxLength={40}
            placeholder="z. B. Mama, Papa, Timur …"
          />
          <BigButton size="xl" full onClick={() => setStep('pin')}>
            Los geht’s
          </BigButton>
        </section>
      )}

      {step === 'pin' && (
        <section className="ww-card ww-stack">
          <h1>Eltern-PIN festlegen</h1>
          <p className="ww-lead">
            Mit dieser vierstelligen PIN öffnen Sie später den Elternbereich. Kinder kommen ohne
            PIN nicht an Einstellungen oder Daten.
          </p>
          <PinPad
            label="Neue PIN eingeben"
            value={pin}
            onChange={(v) => {
              setPin(v)
              setPinError(null)
            }}
          />
          <BigButton
            size="xl"
            full
            disabled={!isPinValid(pin)}
            onClick={() => {
              setPin2('')
              setStep('pin2')
            }}
          >
            Weiter
          </BigButton>
        </section>
      )}

      {step === 'pin2' && (
        <section className="ww-card ww-stack">
          <h1>PIN wiederholen</h1>
          <PinPad
            label="Zur Sicherheit noch einmal"
            value={pin2}
            shake={!!pinError}
            onChange={(v) => {
              setPin2(v)
              setPinError(null)
            }}
            onComplete={(v) => {
              if (v !== pin) {
                setPinError('Die PINs sind nicht gleich.')
                setTimeout(() => setPin2(''), 500)
              }
            }}
          />
          {pinError && <p className="ww-field__error" role="alert">{pinError}</p>}
          <BigButton size="xl" full disabled={pin2 !== pin} onClick={() => setStep('satz')}>
            Weiter
          </BigButton>
          <BigButton
            tone="papier"
            size="m"
            full
            onClick={() => {
              setPin('')
              setPin2('')
              setPinError(null)
              setStep('pin')
            }}
          >
            Andere PIN wählen
          </BigButton>
        </section>
      )}

      {step === 'satz' && (
        <section className="ww-card ww-stack">
          <h1>Ihr Wiederherstellungssatz</h1>
          <p className="ww-lead">
            Es gibt keinen Server — und damit auch kein „PIN per E-Mail zurücksetzen“. Diese drei
            Wörter sind der einzige Weg zurück, wenn die PIN vergessen wird.
          </p>
          <p className="ww-phrase" aria-label={`Wiederherstellungssatz: ${phrase}`}>
            {phrase}
          </p>
          <p className="ww-hint">
            Bitte jetzt aufschreiben und gut aufbewahren — zum Beispiel im Passwort-Manager oder
            auf einem Zettel im Ordner.
          </p>
          <label className="ww-check">
            <input
              type="checkbox"
              checked={phraseConfirmed}
              onChange={(e) => setPhraseConfirmed(e.target.checked)}
            />
            <span>Ich habe den Satz notiert.</span>
          </label>
          <BigButton size="xl" full disabled={!phraseConfirmed} onClick={() => setStep('kind')}>
            Weiter
          </BigButton>
        </section>
      )}

      {step === 'kind' && (
        <section className="ww-card ww-stack">
          <h1>Erstes Kind anlegen</h1>
          <TextField
            label="Spitzname"
            hint="Ein Spitzname reicht völlig — kein richtiger Name nötig."
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
            autoComplete="off"
            placeholder="z. B. Mia, Bär, Flitzi …"
          />

          <fieldset className="ww-avatars">
            <legend className="ww-field__label">Welches Tier möchtest du sein?</legend>
            <div className="ww-avatars__grid">
              {AVATARS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`ww-avatars__pick ${avatarId === a.id ? 'ww-avatars__pick--on' : ''}`}
                  onClick={() => setAvatarId(a.id)}
                  aria-pressed={avatarId === a.id}
                >
                  <Avatar avatarId={a.id} size={72} />
                  <span>{a.name}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <TextField
            label="Geburtsjahr (freiwillig)"
            hint="Wird nur einmal benutzt, um die erste Aufgabenstufe zu wählen. Danach zählt nur noch, wie das Kind spielt."
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder={String(CURRENT_YEAR - 7)}
          />

          {error && <p className="ww-field__error" role="alert">{error}</p>}

          <BigButton
            size="xl"
            full
            tone="sonne"
            disabled={nickname.trim().length === 0 || busy}
            onClick={finish}
          >
            {busy ? 'Einen Moment …' : 'Wald öffnen'}
          </BigButton>
        </section>
      )}
    </main>
  )
}
