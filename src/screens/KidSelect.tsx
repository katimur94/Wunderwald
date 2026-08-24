import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, AVATARS } from '../components/Avatar'
import { BigButton } from '../components/BigButton'
import { TextField } from '../components/TextField'
import { PinGateInline } from './parent/PinGateInline'
import { createChild } from '../db/children'
import { useApp } from '../store/useApp'
import { StarCounter } from '../components/StarCounter'
import { InstallHint } from '../components/InstallHint'
import './KidSelect.css'

const CURRENT_YEAR = new Date().getFullYear()

export function KidSelect() {
  const navigate = useNavigate()
  const { children, setActiveChild, refreshChildren, family } = useApp()
  const [adding, setAdding] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatarId, setAvatarId] = useState(AVATARS[1].id)
  const [birthYear, setBirthYear] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!adding) {
      setUnlocked(false)
      setNickname('')
      setBirthYear('')
    }
  }, [adding])

  function pick(id: string) {
    setActiveChild(id)
    navigate(`/kind/${id}`)
  }

  async function addChild() {
    setBusy(true)
    const year = Number(birthYear)
    const child = await createChild({
      nickname: nickname.trim(),
      avatarId,
      birthYear:
        Number.isInteger(year) && year >= CURRENT_YEAR - 14 && year <= CURRENT_YEAR ? year : null,
    })
    await refreshChildren()
    setBusy(false)
    setAdding(false)
    pick(child.id)
  }

  return (
    <main className="ww-page ww-kidselect">
      <header className="ww-kidselect__head">
        <h1>Wer spielt heute?</h1>
        {family?.parentName && <p className="ww-hint">Hallo, {family.parentName}!</p>}
      </header>

      <ul className="ww-kidselect__grid">
        {children.map((c) => (
          <li key={c.id}>
            <button type="button" className="ww-kidtile" onClick={() => pick(c.id)}>
              <Avatar avatarId={c.avatarId} size={104} />
              <span className="ww-kidtile__name">{c.nickname}</span>
              <StarCounter stars={c.stars} size="s" />
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className="ww-kidtile ww-kidtile--add"
            onClick={() => setAdding(true)}
            aria-label="Weiteres Kind anlegen"
          >
            <span className="ww-kidtile__plus" aria-hidden="true">＋</span>
            <span className="ww-kidtile__name">Neues Kind</span>
          </button>
        </li>
      </ul>

      <InstallHint />

      <div className="ww-kidselect__foot">
        <button
          type="button"
          className="ww-gear"
          onClick={() => navigate('/eltern')}
          aria-label="Elternbereich öffnen"
        >
          <span aria-hidden="true">⚙️</span>
        </button>
      </div>

      {adding && (
        <div className="ww-modal" role="dialog" aria-modal="true" aria-label="Neues Kind anlegen">
          <div className="ww-modal__box ww-card">
            {!unlocked ? (
              <>
                <h2>Kurz bestätigen</h2>
                <p className="ww-hint">
                  Neue Kinder legen Erwachsene an — bitte die Eltern-PIN eingeben.
                </p>
                <PinGateInline onUnlock={() => setUnlocked(true)} />
                <BigButton tone="papier" full size="m" onClick={() => setAdding(false)}>
                  Abbrechen
                </BigButton>
              </>
            ) : (
              <>
                <h2>Neues Kind</h2>
                <TextField
                  label="Spitzname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={16}
                  autoComplete="off"
                />
                <fieldset className="ww-avatars">
                  <legend className="ww-field__label">Tier aussuchen</legend>
                  <div className="ww-avatars__grid">
                    {AVATARS.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={`ww-avatars__pick ${avatarId === a.id ? 'ww-avatars__pick--on' : ''}`}
                        onClick={() => setAvatarId(a.id)}
                        aria-pressed={avatarId === a.id}
                      >
                        <Avatar avatarId={a.id} size={64} />
                        <span>{a.name}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <TextField
                  label="Geburtsjahr (freiwillig)"
                  hint="Nur für die Startstufe."
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  placeholder={String(CURRENT_YEAR - 7)}
                />
                <BigButton
                  tone="sonne"
                  full
                  disabled={nickname.trim().length === 0 || busy}
                  onClick={addChild}
                >
                  Anlegen
                </BigButton>
                <BigButton tone="papier" full size="m" onClick={() => setAdding(false)}>
                  Abbrechen
                </BigButton>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
