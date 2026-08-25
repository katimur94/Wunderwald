import { describe, expect, it } from 'vitest'
import { FOREST_OBJECTS } from './forest-objects'
import { WALDBUCH, waldbuchFakt, waldbuchSeite } from './waldbuch-daten'

describe('Waldbuch', () => {
  it('hat für jedes Wald-Objekt eine Seite', () => {
    expect(WALDBUCH).toHaveLength(FOREST_OBJECTS.length)
    for (const o of FOREST_OBJECTS) {
      expect(waldbuchSeite(o.id), `Seite für ${o.id}`).toBeTruthy()
    }
  })

  it('hat zu jedem Objekt mindestens zwei Fakten', () => {
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

  it('nennt Name und Bild passend zum Objekt', () => {
    for (const o of FOREST_OBJECTS) {
      const seite = waldbuchSeite(o.id)!
      expect(seite.name).toBe(o.name)
      expect(seite.emoji).toBe(o.darstellung[o.darstellung.length - 1])
    }
  })

  it('liefert Funkel einen zufälligen Satz', () => {
    const gesehen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const f = waldbuchFakt('igel', () => i / 40)
      expect(f).toBeTruthy()
      gesehen.add(f!)
    }
    expect(gesehen.size).toBeGreaterThan(1)
    expect(waldbuchFakt('gibtsnicht')).toBeNull()
  })

  it('verwendet keine Fantasie-Formulierungen', () => {
    const verboten = /zaubert|magisch|Fee|spricht mit dir|denkt sich/i
    for (const seite of WALDBUCH) {
      for (const satz of seite.fakten) {
        expect(verboten.test(satz), `"${satz}"`).toBe(false)
      }
    }
  })
})
