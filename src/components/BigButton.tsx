import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './BigButton.css'

export type ButtonTone = 'moos' | 'sonne' | 'blatt' | 'beere' | 'bach' | 'flieder' | 'papier'
export type ButtonSize = 'm' | 'l' | 'xl'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone
  size?: ButtonSize
  full?: boolean
  icon?: ReactNode
  children?: ReactNode
}

/**
 * Der zentrale Knopf der App: dicke Kontur, satte Farbe, beim Drücken
 * physisch "eindrücken". Mindestens 64px hoch (Kinderfinger).
 */
export function BigButton({
  tone = 'moos',
  size = 'l',
  full = false,
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`ww-btn ww-btn--${tone} ww-btn--${size} ${full ? 'ww-btn--full' : ''} ${className}`}
      {...rest}
    >
      {icon && <span className="ww-btn__icon" aria-hidden="true">{icon}</span>}
      {children && <span className="ww-btn__label">{children}</span>}
    </button>
  )
}
