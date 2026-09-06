import { describe, expect, it } from 'vitest'
import { BESUCHER, DEKO, PFLANZEN } from '../garden/arten'
import { WALDBUCH, waldbuchFakt, waldbuchSeite } from './waldbuch-daten'

describe('Gartenbuch', () => {
  it('hat für jede Pflanze, jede Deko und jeden Besucher eine Seite', () => {
    expect(WALDBUCH).toHaveLength(PFLANZEN.length + DEKO.length + BESUCHER.length)
    for (const o of [...PFLANZEN, ...DEKO, ...BESUCHER]) {
      expect(waldbuchSeite(o.id), `Seite für ${o.id}`).toBeTruthy()
    }
    const ids = WALDBUCH.map((s) => s.objectId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('hat zu jeder Seite mindestens zwei Fakten', () => {
    for (const seite of WALDBUCH) {
      expect(seite.fakten.length, `${seite.objectId} hat nur ${seite.fakten.length} Fakten`)
        .toBeGreaterThanOrEqual(2)
    }
  })

  it('formuliert kindgerecht kurz — höchstens 12 Wörter pro Satz', () => {
    for (const seite of WALDBUCH) {
      for (const satz of seite.fakten) {
        const woerter = satz.trim().split(/\s+/).length
        expect(woerter, `"${satz}" (${seite.objectId}) hat ${woerter} Wörter`).toBeLessThanOrEqual(12)
      }
    }
  })

  it('schreibt ganze Sätze mit Punkt', () => {
    for (const seite of WALDBUCH) {
      for (const satz of seite.fakten) {
        expect(satz.trim().endsWith('.'), `"${satz}"`).toBe(true)
        expect(satz[0]).toBe(satz[0].toUpperCase())
      }
    }
  })

  it('liefert einen Fakt für Funkel — und null für Unbekanntes', () => {
    expect(waldbuchFakt('tulpe', () => 0)).toBe(PFLANZEN[0].fakten[0])
    expect(waldbuchFakt('gibt-es-nicht')).toBeNull()
  })
})
