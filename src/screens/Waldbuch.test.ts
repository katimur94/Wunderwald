import { describe, expect, it } from 'vitest'
import { gesammelteObjekte } from './Waldbuch'
import { WALDBUCH } from '../world/waldbuch-daten'

describe('Waldbuch – was das Kind gesammelt hat', () => {
  it('zählt Objekte aus dem Wald', () => {
    const gesammelt = gesammelteObjekte([{ objectId: 'baum' }, { objectId: 'hase' }])
    expect([...gesammelt].sort()).toEqual(['baum', 'hase'])
  })

  it('zählt auch, was in der Kiste liegt', () => {
    // Eingelagert heißt nicht verloren — das Kind hat es sich verdient.
    const gesammelt = gesammelteObjekte([{ objectId: 'baum' }], [{ objectId: 'eule' }])
    expect([...gesammelt].sort()).toEqual(['baum', 'eule'])
  })

  it('zählt dasselbe Objekt nur einmal', () => {
    const gesammelt = gesammelteObjekte(
      [{ objectId: 'blume' }, { objectId: 'blume' }, { objectId: 'blume' }],
      [{ objectId: 'blume' }],
    )
    expect(gesammelt.size).toBe(1)
  })

  it('ist bei leerem Wald leer', () => {
    expect(gesammelteObjekte([]).size).toBe(0)
    expect(gesammelteObjekte([], []).size).toBe(0)
  })

  it('lässt sich gegen jede Waldbuch-Seite prüfen', () => {
    const gesammelt = gesammelteObjekte(WALDBUCH.map((s) => ({ objectId: s.objectId })))
    for (const seite of WALDBUCH) {
      expect(gesammelt.has(seite.objectId), seite.objectId).toBe(true)
    }
    expect(gesammelt.size).toBe(WALDBUCH.length)
  })
})
