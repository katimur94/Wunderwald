import type { InputHTMLAttributes } from 'react'
import './TextField.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string | null
}

export function TextField({ label, hint, error, id, className = '', ...rest }: Props) {
  const inputId = id ?? `f-${label.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div className={`ww-field ${className}`}>
      <label className="ww-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={`ww-field__input ${error ? 'ww-field__input--error' : ''}`}
        aria-describedby={hint ? `${inputId}-hint` : undefined}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {hint && !error && (
        <p className="ww-field__hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      )}
      {error && <p className="ww-field__error">{error}</p>}
    </div>
  )
}
