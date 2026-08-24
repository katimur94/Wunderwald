import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drag & Drop selbst gebaut — HTML5-DnD ist auf Touch unbrauchbar.
 *
 * Ablauf: pointerdown → das Element folgt dem Finger → pointerup über einer
 * Zielzone = Drop. Zielzonen sind groß (min. 96 px) und ziehen mit Magnet-Snap
 * an: Wer in der Nähe loslässt, trifft.
 */

export interface DragState {
  id: string
  x: number
  y: number
  /** Versatz zwischen Fingerspitze und Elementmitte */
  dx: number
  dy: number
  width: number
  height: number
}

export interface DropZone {
  id: string
  rect: DOMRect
}

/** Wie weit ein Ziel außerhalb noch anzieht (Magnet-Snap). */
export const SNAP_PADDING = 44

export function zoneUnderPoint(zones: DropZone[], x: number, y: number): string | null {
  let best: { id: string; dist: number } | null = null
  for (const z of zones) {
    const r = z.rect
    const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dist = Math.hypot(x - cx, y - cy)
    if (inside) return z.id
    // Magnet: auch knapp daneben zählt, wenn nichts anderes näher ist
    const near =
      x >= r.left - SNAP_PADDING &&
      x <= r.right + SNAP_PADDING &&
      y >= r.top - SNAP_PADDING &&
      y <= r.bottom + SNAP_PADDING
    if (near && (!best || dist < best.dist)) best = { id: z.id, dist }
  }
  return best?.id ?? null
}

interface Options {
  onDrop: (dragId: string, zoneId: string | null) => void
}

export function useDragDrop({ onDrop }: Options) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [hoverZone, setHoverZone] = useState<string | null>(null)
  const zones = useRef(new Map<string, HTMLElement>())
  const dragRef = useRef<DragState | null>(null)

  const registerZone = useCallback((id: string, el: HTMLElement | null) => {
    if (el) zones.current.set(id, el)
    else zones.current.delete(id)
  }, [])

  const currentZones = useCallback((): DropZone[] => {
    return [...zones.current.entries()].map(([id, el]) => ({ id, rect: el.getBoundingClientRect() }))
  }, [])

  const start = useCallback((id: string, e: React.PointerEvent<HTMLElement>) => {
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    const state: DragState = {
      id,
      x: e.clientX,
      y: e.clientY,
      dx: e.clientX - (rect.left + rect.width / 2),
      dy: e.clientY - (rect.top + rect.height / 2),
      width: rect.width,
      height: rect.height,
    }
    dragRef.current = state
    setDrag(state)
    // Pointer Capture, damit der Finger das Element nicht "verliert"
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      /* nicht überall verfügbar – der Fallback über window-Listener greift */
    }
  }, [])

  useEffect(() => {
    if (!drag) return

    function move(e: PointerEvent) {
      const d = dragRef.current
      if (!d) return
      const next = { ...d, x: e.clientX, y: e.clientY }
      dragRef.current = next
      setDrag(next)
      setHoverZone(zoneUnderPoint(currentZones(), e.clientX, e.clientY))
    }

    function end(e: PointerEvent) {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      setHoverZone(null)
      if (!d) return
      onDrop(d.id, zoneUnderPoint(currentZones(), e.clientX, e.clientY))
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [drag, currentZones, onDrop])

  return { drag, hoverZone, start, registerZone }
}
