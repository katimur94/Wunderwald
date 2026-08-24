import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drag & Drop selbst gebaut — HTML5-DnD ist auf Touch unbrauchbar.
 *
 * Leistung ist hier das Entscheidende: Während der Finger sich bewegt, darf
 * React NICHT neu rendern. Deshalb
 *  - schreibt `pointermove` nur in eine Ref,
 *  - überträgt ein rAF-Loop die Position 1× pro Frame per `transform`,
 *  - werden die Zielzonen EINMAL beim Start vermessen (kein Layout-Thrashing).
 *
 * Der einzige React-State, der sich während eines Drags ändert, ist die
 * hervorgehobene Zielzone — und auch die nur bei echtem Wechsel.
 *
 * Zweiter, gleichwertiger Weg: Tipp-Tipp (Stein antippen, dann Ziel antippen).
 * Für kleine Kinderhände oft leichter als Ziehen und zugleich die
 * barrierefreie Bedienung.
 */

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
    if (inside) return z.id
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dist = Math.hypot(x - cx, y - cy)
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
  /** Tipp-Tipp: Stein gewählt, dann Zone getippt. */
  onTapPlace?: (dragId: string, zoneId: string) => void
  /** Wird beim Auswählen per Tipp aufgerufen (z. B. damit Funkel es benennt). */
  onSelect?: (dragId: string | null) => void
}

/** Was der Aufrufer über den laufenden Drag wissen muss (ohne Position!). */
export interface DragInfo {
  id: string
  width: number
  height: number
}

export function useDragDrop({ onDrop, onTapPlace, onSelect }: Options) {
  /** Nur id/Größe — die Position liegt bewusst NICHT im State. */
  const [drag, setDrag] = useState<DragInfo | null>(null)
  const [hoverZone, setHoverZone] = useState<string | null>(null)
  /** Per Tipp ausgewählter Stein (zweiter Bedienweg). */
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)

  const zonesEl = useRef(new Map<string, HTMLElement>())
  /** Beim Drag-Start eingefroren — während eines Drags scrollt nichts. */
  const zonesCache = useRef<DropZone[]>([])
  const ghostRef = useRef<HTMLElement | null>(null)
  const posRef = useRef({ x: 0, y: 0, dx: 0, dy: 0 })
  const dragIdRef = useRef<string | null>(null)
  const hoverRef = useRef<string | null>(null)
  const rafRef = useRef<number | null>(null)
  const bewegtRef = useRef(false)

  const registerZone = useCallback((id: string, el: HTMLElement | null) => {
    if (el) zonesEl.current.set(id, el)
    else zonesEl.current.delete(id)
  }, [])

  /** Das fliegende Element anmelden; wird ausschließlich per transform bewegt. */
  const registerGhost = useCallback((el: HTMLElement | null) => {
    ghostRef.current = el
    if (el) schreibeTransform()
  }, [])

  function schreibeTransform() {
    const g = ghostRef.current
    if (!g) return
    const { x, y, dx, dy } = posRef.current
    g.style.transform = `translate3d(${Math.round(x - dx)}px, ${Math.round(y - dy)}px, 0)`
  }

  function frame() {
    if (dragIdRef.current === null) {
      rafRef.current = null
      return
    }
    schreibeTransform()
    const zone = zoneUnderPoint(zonesCache.current, posRef.current.x, posRef.current.y)
    // Nur bei echtem Zonenwechsel den einzigen erlaubten Re-Render auslösen.
    if (zone !== hoverRef.current) {
      hoverRef.current = zone
      setHoverZone(zone)
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  const start = useCallback(
    (id: string, e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget
      const rect = el.getBoundingClientRect()

      // Zonen EINMAL vermessen und für den ganzen Drag behalten.
      zonesCache.current = [...zonesEl.current.entries()].map(([zid, zel]) => ({
        id: zid,
        rect: zel.getBoundingClientRect(),
      }))

      posRef.current = {
        x: e.clientX,
        y: e.clientY,
        dx: e.clientX - rect.left,
        dy: e.clientY - rect.top,
      }
      dragIdRef.current = id
      hoverRef.current = null
      bewegtRef.current = false
      setHoverZone(null)
      setDrag({ id, width: rect.width, height: rect.height })

      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        /* Fallback über die window-Listener greift ohnehin. */
      }
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(frame)
    },
    // frame/schreibeTransform arbeiten nur über Refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (!drag) return

    function move(e: PointerEvent) {
      // Nur schreiben — kein State, kein Layout-Lesen.
      const p = posRef.current
      if (Math.abs(e.clientX - p.x) > 3 || Math.abs(e.clientY - p.y) > 3) bewegtRef.current = true
      p.x = e.clientX
      p.y = e.clientY
    }

    function end(e: PointerEvent) {
      const id = dragIdRef.current
      dragIdRef.current = null
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setDrag(null)
      setHoverZone(null)
      hoverRef.current = null
      if (!id) return

      const zone = zoneUnderPoint(zonesCache.current, e.clientX, e.clientY)

      // Kurzes Tippen ohne Bewegung = Auswahl statt Drop (Tipp-Tipp-Weg).
      if (!bewegtRef.current) {
        setGewaehlt((alt) => {
          const neu = alt === id ? null : id
          onSelect?.(neu)
          return neu
        })
        return
      }
      onDrop(id, zone)
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, onDrop, onSelect])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  /** Zone antippen, während ein Stein per Tipp gewählt ist. */
  const tapZone = useCallback(
    (zoneId: string) => {
      if (!gewaehlt) return false
      onTapPlace?.(gewaehlt, zoneId)
      setGewaehlt(null)
      onSelect?.(null)
      return true
    },
    [gewaehlt, onTapPlace, onSelect],
  )

  const clearSelection = useCallback(() => {
    setGewaehlt(null)
    onSelect?.(null)
  }, [onSelect])

  return {
    drag,
    hoverZone,
    gewaehlt,
    start,
    registerZone,
    registerGhost,
    tapZone,
    clearSelection,
    /** Nur für Tests: die eingefrorenen Zonen des laufenden Drags. */
    _zonesCache: zonesCache,
  }
}
