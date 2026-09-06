import { describe, expect, it } from 'vitest'
import {
  anzahlFragen,
  familienFuerStufe,
  frageGedaechtnis,
  optionName,
  uhrText,
  WISSEN_FAMILIEN,
  zieheWissensFrage,
  type FrageGedaechtnis,
} from './wissen'
import { mulberry32 } from '../games/rng'

describe('Wissensbank – Aufbau', () => {
  it('hat eindeutige Familien-Ids und Stufen von 1 bis 10', () => {
    const ids = WISSEN_FAMILIEN.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of WISSEN_FAMILIEN) {
      expect(f.stufe, f.id).toBeGreaterThanOrEqual(1)
      expect(f.stufe, f.id).toBeLessThanOrEqual(10)
      expect(f.anzahl, f.id).toBeGreaterThanOrEqual(1)
    }
  })

  it('bietet auf jeder Stufe reichlich Fragen', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      const n = familienFuerStufe(lvl).reduce((s, f) => s + f.anzahl, 0)
      expect(n, `Stufe ${lvl}`).toBeGreaterThanOrEqual(40)
    }
    expect(anzahlFragen()).toBeGreaterThanOrEqual(400)
  })

  it('jede Frage hat genau drei verschiedene Antworten und genau eine Lösung', () => {
    const rng = mulberry32(7)
    const gesehen = new Set<string>()
    for (const f of WISSEN_FAMILIEN) {
      for (let i = 0; i < f.anzahl; i++) {
        const frage = f.erzeuge(rng, i)
        const where = `${f.id} #${i}: ${frage.frage}`
        expect(frage.optionen, where).toHaveLength(3)
        expect(new Set(frage.optionen).size, where).toBe(3)
        expect(frage.optionen.filter((o) => o === frage.antwort), where).toHaveLength(1)
        expect(frage.speak.trim().length, where).toBeGreaterThan(8)
        expect(frage.frage.trim().length, where).toBeGreaterThan(3)
        expect(frage.id, where).toBeTruthy()
        expect(gesehen.has(frage.id), `doppelte Frage-Id ${frage.id}`).toBe(false)
        gesehen.add(frage.id)
        // Kein Ablenker darf leer sein — und jede Antwort muss auf ein Renn-Tor passen.
        frage.optionen.forEach((o) => expect(o.trim().length, where).toBeGreaterThan(0))
        frage.optionen.forEach((o) => expect([...o].length, `${where} → ${o}`).toBeLessThanOrEqual(16))
        // Emoji-Antworten brauchen einen Vorlesenamen.
        for (const o of frage.optionen) {
          if (!/^[\p{L}\p{N}\s:.,'’-]+$/u.test(o)) {
            expect(optionName(frage, o), `${where} — Name für ${o}`).not.toBe(o)
          }
        }
      }
    }
  })

  it('mischt die Reihenfolge der Antworten — die Lösung steht nicht immer vorn', () => {
    for (const f of WISSEN_FAMILIEN) {
      const positionen = new Set<number>()
      for (let i = 0; i < 40; i++) {
        const frage = f.erzeuge(mulberry32(i * 31 + 1), i)
        positionen.add(frage.optionen.indexOf(frage.antwort))
      }
      expect(positionen.size, f.id).toBeGreaterThan(1)
    }
  })
})

describe('Wissensbank – Ziehen', () => {
  it('zieht deterministisch bei gleichem Seed', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      const a = zieheWissensFrage(lvl, mulberry32(99))
      const b = zieheWissensFrage(lvl, mulberry32(99))
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    }
  })

  it('hält die Stufe ein: höchstens zwei Stufen unter der eigenen', () => {
    for (let lvl = 1; lvl <= 10; lvl++) {
      for (let i = 0; i < 100; i++) {
        const frage = zieheWissensFrage(lvl, mulberry32(lvl * 1000 + i))
        expect(frage.stufe, `Stufe ${lvl}`).toBeLessThanOrEqual(lvl)
        expect(frage.stufe, `Stufe ${lvl}`).toBeGreaterThanOrEqual(Math.max(1, lvl - 2))
      }
    }
  })

  it('wiederholt mit Gedächtnis keine Frage, bevor der Vorrat durch ist', () => {
    const liste = new Set<string>()
    const gedaechtnis: FrageGedaechtnis = {
      gesehen: (id) => liste.has(id),
      merke: (id) => liste.add(id),
      vergiss: () => liste.clear(),
    }
    const vorrat = familienFuerStufe(1).reduce((s, f) => s + f.anzahl, 0)
    const ids = new Set<string>()
    const rng = mulberry32(5)
    for (let i = 0; i < vorrat; i++) {
      const frage = zieheWissensFrage(1, rng, gedaechtnis)
      expect(ids.has(frage.id), `Wiederholung bei Zug ${i}: ${frage.id}`).toBe(false)
      ids.add(frage.id)
    }
    // Danach fängt es von vorn an, statt hängen zu bleiben.
    expect(() => zieheWissensFrage(1, rng, gedaechtnis)).not.toThrow()
  })

  it('das Browser-Gedächtnis überlebt ohne localStorage', () => {
    const g = frageGedaechtnis('kind-1')
    g.merke('a')
    expect(g.gesehen('a')).toBe(true)
    g.vergiss()
    expect(g.gesehen('a')).toBe(false)
  })
})

describe('Uhrzeit-Text', () => {
  it('spricht wie Kinder: volle, halbe und Viertelstunden', () => {
    expect(uhrText(3, 0)).toBe('3 Uhr')
    expect(uhrText(3, 30)).toBe('halb 4')
    expect(uhrText(12, 30)).toBe('halb 1')
    expect(uhrText(3, 15)).toBe('Viertel nach 3')
    expect(uhrText(3, 45)).toBe('Viertel vor 4')
    expect(uhrText(12, 45)).toBe('Viertel vor 1')
    expect(uhrText(7, 5)).toBe('7:05')
  })

  it('Uhr-Fragen zeigen die Zeit, die die Antwort nennt', () => {
    for (const f of WISSEN_FAMILIEN.filter((x) => x.thema === 'uhr')) {
      for (let i = 0; i < f.anzahl; i++) {
        const frage = f.erzeuge(mulberry32(i), i)
        expect(frage.uhr, f.id).toBeTruthy()
        expect(uhrText(frage.uhr!.stunde, frage.uhr!.minute)).toBe(frage.antwort)
      }
    }
  })
})
