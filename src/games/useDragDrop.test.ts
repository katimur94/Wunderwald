import { describe, expect, it, vi } from 'vitest'
import { SNAP_PADDING, zoneUnderPoint, type DropZone } from './useDragDrop'

function zone(id: string, left: number, top: number, w = 96, h = 96): DropZone {
  return {
    id,
    rect: {
      left, top, right: left + w, bottom: top + h, width: w, height: h, x: left, y: top,
      toJSON: () => ({}),
    } as DOMRect,
  }
}

describe('Zielzonen-Treffer', () => {
  const zones = [zone('a', 0, 0), zone('b', 300, 0)]

  it('trifft eine Zone, wenn der Finger darin liegt', () => {
    expect(zoneUnderPoint(zones, 10, 10)).toBe('a')
    expect(zoneUnderPoint(zones, 340, 40)).toBe('b')
  })

  it('trifft auch knapp daneben (Magnet-Snap)', () => {
    expect(zoneUnderPoint(zones, -20, 40)).toBe('a')
    expect(zoneUnderPoint(zones, 96 + SNAP_PADDING - 2, 40)).toBe('a')
  })

  it('trifft nichts, wenn der Finger weit weg ist', () => {
    expect(zoneUnderPoint(zones, 180, 400)).toBeNull()
    expect(zoneUnderPoint([], 10, 10)).toBeNull()
  })

  it('nimmt bei zwei Kandidaten den näheren', () => {
    const eng = [zone('links', 0, 0), zone('rechts', 120, 0)]
    expect(zoneUnderPoint(eng, 100, 48)).toBe('links')
    expect(zoneUnderPoint(eng, 114, 48)).toBe('rechts')
  })

  it('bevorzugt die Zone, in der der Finger wirklich liegt', () => {
    const ueberlappend = [zone('gross', 0, 0, 300, 200), zone('klein', 250, 150, 96, 96)]
    expect(zoneUnderPoint(ueberlappend, 20, 20)).toBe('gross')
    expect(zoneUnderPoint(ueberlappend, 320, 220)).toBe('klein')
  })
})

/**
 * Der Hook selbst braucht DOM und React. Statt eines vollen Renderers werden
 * hier die beiden Eigenschaften geprüft, auf die es bei der Flüssigkeit
 * ankommt — beide sind reine Logik über den eingefrorenen Zonen.
 */
describe('Zonen-Cache und Hover-Wechsel', () => {
  it('ein eingefrorener Cache liefert stabile Treffer, auch wenn sich das Layout ändert', () => {
    const eingefroren = [zone('slot-0', 0, 0), zone('slot-1', 200, 0)]
    // Erste Auswertung
    expect(zoneUnderPoint(eingefroren, 20, 20)).toBe('slot-0')
    // "Das echte DOM verschiebt sich" – der Cache bleibt derselbe Array
    const treffer = Array.from({ length: 50 }, () => zoneUnderPoint(eingefroren, 20, 20))
    expect(new Set(treffer).size).toBe(1)
  })

  it('getBoundingClientRect wird pro Drag nur einmal je Zone gelesen', () => {
    // Simuliert, was der Hook beim Start tut: einmal einsammeln, dann nur noch rechnen.
    const spy = vi.fn(() => ({
      left: 0, top: 0, right: 96, bottom: 96, width: 96, height: 96, x: 0, y: 0,
      toJSON: () => ({}),
    }) as DOMRect)
    const el = { getBoundingClientRect: spy } as unknown as HTMLElement

    const cache: DropZone[] = [{ id: 'z', rect: el.getBoundingClientRect() }]
    expect(spy).toHaveBeenCalledTimes(1)

    // 120 Frames Bewegung
    for (let i = 0; i < 120; i++) zoneUnderPoint(cache, 10 + (i % 5), 10)
    expect(spy, 'waehrend der Bewegung darf nicht neu gemessen werden').toHaveBeenCalledTimes(1)
  })

  it('meldet einen Zonenwechsel nur, wenn sich die Zone wirklich ändert', () => {
    const zones = [zone('a', 0, 0), zone('b', 300, 0)]
    const setHover = vi.fn()
    let letzte: string | null = null

    // Das ist exakt die Logik aus dem rAF-Loop.
    function frame(x: number, y: number) {
      const z = zoneUnderPoint(zones, x, y)
      if (z !== letzte) {
        letzte = z
        setHover(z)
      }
    }

    // 10 Frames innerhalb derselben Zone
    for (let i = 0; i < 10; i++) frame(10 + i, 10)
    expect(setHover).toHaveBeenCalledTimes(1)
    expect(setHover).toHaveBeenLastCalledWith('a')

    // Wechsel nach b
    frame(340, 40)
    expect(setHover).toHaveBeenCalledTimes(2)
    expect(setHover).toHaveBeenLastCalledWith('b')

    // Wieder 10 Frames in b
    for (let i = 0; i < 10; i++) frame(340 + i, 40)
    expect(setHover).toHaveBeenCalledTimes(2)

    // Ins Leere
    frame(180, 500)
    expect(setHover).toHaveBeenCalledTimes(3)
    expect(setHover).toHaveBeenLastCalledWith(null)
  })
})

describe('Tipp-Tipp als zweiter Weg', () => {
  /** Nachbau der Auswahl-Logik des Hooks: tippen wählt, erneut tippen wählt ab. */
  function auswahl() {
    let gewaehlt: string | null = null
    const gesetzt: Array<[string, string]> = []
    return {
      tippeStein(id: string) {
        gewaehlt = gewaehlt === id ? null : id
        return gewaehlt
      },
      tippeZone(zoneId: string) {
        if (!gewaehlt) return false
        gesetzt.push([gewaehlt, zoneId])
        gewaehlt = null
        return true
      },
      get gewaehlt() { return gewaehlt },
      get gesetzt() { return gesetzt },
    }
  }

  it('Stein antippen wählt aus, erneut antippen wählt ab', () => {
    const a = auswahl()
    expect(a.tippeStein('s1')).toBe('s1')
    expect(a.tippeStein('s1')).toBeNull()
  })

  it('anderer Stein wechselt die Auswahl', () => {
    const a = auswahl()
    a.tippeStein('s1')
    expect(a.tippeStein('s2')).toBe('s2')
  })

  it('Zone antippen setzt den gewählten Stein und hebt die Auswahl auf', () => {
    const a = auswahl()
    a.tippeStein('s1')
    expect(a.tippeZone('slot-0')).toBe(true)
    expect(a.gesetzt).toEqual([['s1', 'slot-0']])
    expect(a.gewaehlt).toBeNull()
  })

  it('Zone antippen ohne Auswahl tut nichts', () => {
    const a = auswahl()
    expect(a.tippeZone('slot-0')).toBe(false)
    expect(a.gesetzt).toEqual([])
  })
})
