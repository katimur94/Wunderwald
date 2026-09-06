import { useMemo } from 'react'
import { pflanzeInnen, type PflanzenBild } from './pflanze-svg'

interface Props extends PflanzenBild {
  className?: string
  title?: string
}

/**
 * Eine gezeichnete Pflanze. Der Inhalt kommt als String aus pflanze-svg.ts —
 * er ist vollständig selbst erzeugt, nie aus Nutzereingaben.
 */
export function PlantSvg({ form, growth, welk, farbe, className = '', title }: Props) {
  const innen = useMemo(() => pflanzeInnen({ form, growth, welk, farbe }), [form, growth, welk, farbe])
  return (
    <svg
      className={`ww-pflanze ${className}`}
      viewBox="0 0 100 120"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: innen }}
    />
  )
}
