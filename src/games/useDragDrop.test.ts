import { describe, expect, it } from 'vitest'
import { SNAP_PADDING, zoneUnderPoint, type DropZone } from './useDragDrop'

function zone(id: string, left: number, top: number, w = 96, h = 96): DropZone {
  return {
    id,
    rect: {
      left,
      top,
      right: left + w,
      bottom: top + h,
      width: w,
      height: h,
      x: left,
      y: top,
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
    // Zonen 0..96 und 120..216, Mitten bei x = 48 und x = 168
    const eng = [zone('links', 0, 0), zone('rechts', 120, 0)]
    expect(zoneUnderPoint(eng, 100, 48)).toBe('links')  // 52 vs. 68
    expect(zoneUnderPoint(eng, 114, 48)).toBe('rechts') // 66 vs. 54
  })

  it('bevorzugt die Zone, in der der Finger wirklich liegt', () => {
    const ueberlappend = [zone('gross', 0, 0, 300, 200), zone('klein', 250, 150, 96, 96)]
    expect(zoneUnderPoint(ueberlappend, 20, 20)).toBe('gross')
    expect(zoneUnderPoint(ueberlappend, 320, 220)).toBe('klein')
  })
})
