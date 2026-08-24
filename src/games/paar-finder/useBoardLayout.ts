import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Rechnet aus, wie groß die Memory-Karten sein dürfen, damit das GANZE Brett
 * in die verfügbare Fläche passt. Ein Memory-Brett darf niemals scrollen —
 * alle Karten müssen gleichzeitig sichtbar sein.
 */

/** Seitenverhältnis der Karten (Breite : Höhe). */
export const CARD_RATIO = 3 / 4
export const CARD_GAP = 8
/** Darunter wird nicht verkleinert — stattdessen sinkt die Paar-Anzahl. */
export const MIN_CARD_WIDTH = 44

export interface BoardLayout {
  cols: number
  rows: number
  cardWidth: number
  cardHeight: number
  /** true, wenn selbst die beste Aufteilung unter die Mindestgröße fällt */
  zuEng: boolean
}

/**
 * Sucht die Spaltenzahl, bei der die Karten am größten werden.
 * Reine Funktion — deshalb ohne DOM testbar.
 */
export function computeBoardLayout(
  cardCount: number,
  width: number,
  height: number,
  landscape = false,
): BoardLayout {
  const kandidaten = landscape ? [4, 5, 6, 7, 8] : [2, 3, 4, 5, 6]
  let beste: BoardLayout | null = null

  for (const cols of kandidaten) {
    if (cols > cardCount) continue
    const rows = Math.ceil(cardCount / cols)
    const bruttoW = (width - CARD_GAP * (cols - 1)) / cols
    const bruttoH = (height - CARD_GAP * (rows - 1)) / rows
    // Die Karte darf weder breiter als ihre Spalte noch höher als ihre Zeile sein.
    const cardWidth = Math.floor(Math.min(bruttoW, bruttoH * CARD_RATIO))
    if (cardWidth <= 0) continue
    if (!beste || cardWidth > beste.cardWidth) {
      beste = {
        cols,
        rows,
        cardWidth,
        cardHeight: Math.floor(cardWidth / CARD_RATIO),
        zuEng: cardWidth < MIN_CARD_WIDTH,
      }
    }
  }

  if (!beste) {
    // Kann nur passieren, wenn die Flaeche praktisch null ist.
    const cols = Math.min(Math.max(1, cardCount), landscape ? 6 : 4)
    return {
      cols,
      rows: Math.ceil(cardCount / cols),
      cardWidth: MIN_CARD_WIDTH,
      cardHeight: Math.round(MIN_CARD_WIDTH / CARD_RATIO),
      zuEng: true,
    }
  }
  return beste
}

/** Misst einen Container per ResizeObserver. */
export function useMeasuredBox<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') {
      const r = el.getBoundingClientRect()
      setBox({ width: r.width, height: r.height })
      return
    }
    const ro = new ResizeObserver((eintraege) => {
      const r = eintraege[0]?.contentRect
      if (!r) return
      setBox((alt) =>
        Math.abs(alt.width - r.width) < 1 && Math.abs(alt.height - r.height) < 1
          ? alt
          : { width: r.width, height: r.height },
      )
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, box }
}

export function useBoardLayout(cardCount: number, width: number, height: number) {
  return useMemo(() => {
    if (width < 1 || height < 1) return null
    return computeBoardLayout(cardCount, width, height, width > height)
  }, [cardCount, width, height])
}
