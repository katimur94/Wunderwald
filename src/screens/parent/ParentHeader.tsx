import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/useApp'

interface Props {
  title: string
  /** Wohin der Zurück-Pfeil führt (Default: Übersicht) */
  back?: string
}

export function ParentHeader({ title, back = '/eltern' }: Props) {
  const navigate = useNavigate()
  const setParentUnlocked = useApp((s) => s.setParentUnlocked)

  return (
    <header className="ww-parent__head">
      <button
        type="button"
        className="ww-iconbtn"
        onClick={() => navigate(back)}
        aria-label="Zurück"
      >
        <span aria-hidden="true">←</span>
      </button>
      <h1>{title}</h1>
      <button
        type="button"
        className="ww-parent__lock"
        onClick={() => {
          setParentUnlocked(false)
          navigate('/')
        }}
      >
        Sperren
      </button>
    </header>
  )
}
