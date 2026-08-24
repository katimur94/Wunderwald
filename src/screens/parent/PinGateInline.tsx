import { useEffect, useState } from 'react'
import { PinPad } from '../../components/PinPad'
import { BigButton } from '../../components/BigButton'
import { PIN_LOCK_MS, PIN_MAX_FAILS, verifyPin, verifyRecovery, hashPin } from '../../db/pin'
import { db } from '../../db/db'
import { useApp } from '../../store/useApp'

interface Props {
  onUnlock: () => void
}

/**
 * PIN-Eingabe mit Sperre: 5 Fehlversuche → 60 Sekunden Pause.
 * Wer die PIN vergessen hat, kommt über den Wiederherstellungssatz weiter —
 * einen anderen Weg gibt es bewusst nicht (kein Server, keine Mail).
 */
export function PinGateInline({ onUnlock }: Props) {
  const { family, refreshFamily, saveSettings } = useApp()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lockLeft, setLockLeft] = useState(0)
  const [mode, setMode] = useState<'pin' | 'recovery' | 'newpin'>('pin')
  const [phrase, setPhrase] = useState('')
  const [newPin, setNewPin] = useState('')

  const lockedUntil = family?.settings?.pinLockedUntil ?? 0

  useEffect(() => {
    function tick() {
      setLockLeft(Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)))
    }
    tick()
    const t = setInterval(tick, 500)
    return () => clearInterval(t)
  }, [lockedUntil])

  async function check(value: string) {
    if (!family || lockLeft > 0) return
    const ok = await verifyPin(value, family.pinHash, family.pinSalt)
    if (ok) {
      await saveSettings({ pinFails: 0, pinLockedUntil: 0 })
      setError(null)
      setPin('')
      onUnlock()
      return
    }
    const fails = (family.settings?.pinFails ?? 0) + 1
    if (fails >= PIN_MAX_FAILS) {
      await saveSettings({ pinFails: 0, pinLockedUntil: Date.now() + PIN_LOCK_MS })
      setError('Zu viele Versuche. Bitte kurz warten.')
    } else {
      await saveSettings({ pinFails: fails })
      setError(`Falsche PIN. Noch ${PIN_MAX_FAILS - fails} Versuche.`)
    }
    setTimeout(() => setPin(''), 450)
  }

  async function checkRecovery() {
    if (!family) return
    const ok = await verifyRecovery(phrase, family.recoveryHash, family.recoverySalt)
    if (!ok) {
      setError('Dieser Satz passt nicht. Groß- und Kleinschreibung ist egal.')
      return
    }
    setError(null)
    setMode('newpin')
  }

  async function setBrandNewPin(value: string) {
    const { hash, salt } = await hashPin(value)
    await db.family.update('family', {
      pinHash: hash,
      pinSalt: salt,
    })
    await saveSettings({ pinFails: 0, pinLockedUntil: 0 })
    await refreshFamily()
    onUnlock()
  }

  if (mode === 'recovery') {
    return (
      <div className="ww-stack">
        <p className="ww-lead">Bitte die drei Wörter aus der Einrichtung eingeben.</p>
        <input
          className="ww-field__input"
          value={phrase}
          onChange={(e) => {
            setPhrase(e.target.value)
            setError(null)
          }}
          placeholder="z. B. Fuchs Laterne Moos"
          autoComplete="off"
          aria-label="Wiederherstellungssatz"
        />
        {error && <p className="ww-field__error" role="alert">{error}</p>}
        <BigButton full disabled={phrase.trim().length < 5} onClick={checkRecovery}>
          Prüfen
        </BigButton>
        <BigButton tone="papier" size="m" full onClick={() => { setMode('pin'); setError(null) }}>
          Zurück zur PIN
        </BigButton>
      </div>
    )
  }

  if (mode === 'newpin') {
    return (
      <div className="ww-stack">
        <PinPad label="Neue PIN wählen" value={newPin} onChange={setNewPin} onComplete={setBrandNewPin} />
      </div>
    )
  }

  return (
    <div className="ww-stack">
      <PinPad
        label={lockLeft > 0 ? `Gesperrt – noch ${lockLeft} Sekunden` : 'Eltern-PIN eingeben'}
        value={pin}
        onChange={(v) => {
          setPin(v)
          setError(null)
        }}
        onComplete={check}
        disabled={lockLeft > 0}
        shake={!!error}
      />
      {error && <p className="ww-field__error" role="alert">{error}</p>}
      <button type="button" className="ww-linkbtn" onClick={() => { setMode('recovery'); setError(null) }}>
        PIN vergessen?
      </button>
    </div>
  )
}
