import { useEffect, useState } from 'react'
import './PinPad.css'

interface Props {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  label: string
  disabled?: boolean
  shake?: boolean
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

/** Eigenes Zahlenfeld statt Tastatur: groß, eindeutig, keine Autofill-Überraschungen. */
export function PinPad({ value, onChange, onComplete, label, disabled, shake }: Props) {
  const [pressed, setPressed] = useState<string | null>(null)

  useEffect(() => {
    if (value.length === 4) onComplete?.(value)
    // absichtlich nur auf value hören
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  function press(k: string) {
    if (disabled || !k) return
    setPressed(k)
    setTimeout(() => setPressed(null), 120)
    if (k === '⌫') onChange(value.slice(0, -1))
    else if (value.length < 4) onChange(value + k)
  }

  return (
    <div className="ww-pinpad">
      <p className="ww-pinpad__label">{label}</p>
      <div className={`ww-pinpad__dots ${shake ? 'ww-wiggle' : ''}`} aria-live="polite">
        <span className="ww-sr">{value.length} von 4 Ziffern eingegeben</span>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`ww-pinpad__dot ${i < value.length ? 'ww-pinpad__dot--on' : ''}`}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="ww-pinpad__keys">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className={`ww-pinpad__key ${k === '⌫' ? 'ww-pinpad__key--del' : ''} ${
                pressed === k ? 'ww-pinpad__key--pressed' : ''
              }`}
              onClick={() => press(k)}
              disabled={disabled}
              aria-label={k === '⌫' ? 'Letzte Ziffer löschen' : k}
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
