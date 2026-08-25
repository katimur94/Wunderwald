import { describe, expect, it } from 'vitest'
import {
  ART_KATEGORIEN,
  eindeutigeDinge,
  gehoertZu,
  KATEGORIEN,
  kategorieById,
  MERKMAL_KATEGORIEN,
  OBERBEGRIFFE,
  PAARE_LEICHT,
  PAARE_SCHWER,
  passtNirgendwo,
} from './sortier-daten'

describe('Kategorien-Pool', () => {
  it('hat die geforderten Art-Körbe mit je mindestens 8 Dingen', () => {
    const ids = ART_KATEGORIEN.map((k) => k.id)
    for (const soll of ['tiere', 'fahrzeuge', 'obst', 'kleidung', 'werkzeuge', 'wetter', 'instrumente']) {
      expect(ids, soll).toContain(soll)
    }
    for (const k of ART_KATEGORIEN) {
      expect(k.dinge.length, k.id).toBeGreaterThanOrEqual(8)
    }
  })

  it('hat Merkmals-Körbe für Farbe, Bewegung, Lautstärke und Größe', () => {
    const ids = MERKMAL_KATEGORIEN.map((k) => k.id)
    for (const soll of ['rot', 'gelb', 'fliegt', 'schwimmt', 'faehrt', 'laut', 'leise', 'gross', 'klein']) {
      expect(ids, soll).toContain(soll)
    }
    for (const k of MERKMAL_KATEGORIEN) {
      expect(k.dinge.length, k.id).toBeGreaterThanOrEqual(8)
    }
  })

  it('vergibt jede Korb-Kennung nur einmal', () => {
    const ids = KATEGORIEN.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('nennt jedes Ding beim Namen und zeigt es nur einmal je Korb', () => {
    for (const k of KATEGORIEN) {
      const emojis = k.dinge.map((x) => x.emoji)
      expect(new Set(emojis).size, k.id).toBe(emojis.length)
      for (const ding of k.dinge) {
        expect(ding.emoji.length, `${k.id}/${ding.name}`).toBeGreaterThan(0)
        expect(ding.name.length, k.id).toBeGreaterThan(1)
        expect(ding.mitArtikel, ding.name).toMatch(/^(der|die|das) /)
        expect(ding.mitArtikel.endsWith(ding.name), ding.name).toBe(true)
      }
    }
  })

  it('gibt jedem Korb Deckel, Name und Frage', () => {
    for (const k of KATEGORIEN) {
      expect(k.deckel.length, k.id).toBeGreaterThan(0)
      expect(k.name.length, k.id).toBeGreaterThan(1)
      expect(k.frage.endsWith('?'), k.id).toBe(true)
    }
  })

  it('findet Körbe über ihre Kennung', () => {
    expect(kategorieById('tiere')?.name).toBe('Tiere')
    expect(kategorieById('gibtsnicht')).toBeUndefined()
  })
})

describe('Zuordnung', () => {
  it('erkennt Zugehörigkeit über das Bild', () => {
    const tiere = kategorieById('tiere')!
    const obst = kategorieById('obst')!
    expect(gehoertZu({ emoji: '🐶', name: 'Hund', mitArtikel: 'der Hund' }, tiere)).toBe(true)
    expect(gehoertZu({ emoji: '🐶', name: 'Hund', mitArtikel: 'der Hund' }, obst)).toBe(false)
  })

  it('lässt ein Ding bewusst in mehreren Körben liegen', () => {
    // Die Biene ist ein Tier und kann fliegen — welcher Korb gilt, sagt die Aufgabe.
    const fliegt = kategorieById('fliegt')!
    const klein = kategorieById('klein')!
    const biene = { emoji: '🐝', name: 'Biene', mitArtikel: 'die Biene' }
    expect(gehoertZu(biene, fliegt)).toBe(true)
    expect(gehoertZu(biene, klein)).toBe(true)
  })

  it('siebt mehrdeutige Dinge aus, wenn zwei Körbe offen sind', () => {
    const fliegt = kategorieById('fliegt')!
    const laut = kategorieById('laut')!
    const nurFliegt = eindeutigeDinge(fliegt, [fliegt, laut])
    expect(nurFliegt.length).toBeGreaterThan(0)
    // Der Hubschrauber fliegt UND ist laut — er darf hier nicht auftauchen.
    expect(nurFliegt.some((x) => x.emoji === '🚁')).toBe(false)
    nurFliegt.forEach((x) => expect(gehoertZu(x, laut), x.name).toBe(false))
  })

  it('findet Dinge, die in keinen der Körbe passen', () => {
    const obst = kategorieById('obst')!
    const fahrzeuge = kategorieById('fahrzeuge')!
    const auswahl = [
      { emoji: '🍎', name: 'Apfel', mitArtikel: 'der Apfel' },
      { emoji: '🚗', name: 'Auto', mitArtikel: 'das Auto' },
      { emoji: '🥁', name: 'Trommel', mitArtikel: 'die Trommel' },
    ]
    expect(passtNirgendwo([obst, fahrzeuge], auswahl).map((x) => x.emoji)).toEqual(['🥁'])
  })
})

describe('Korb-Paare', () => {
  it('kennt nur echte Körbe', () => {
    for (const [a, b] of [...PAARE_LEICHT, ...PAARE_SCHWER]) {
      expect(kategorieById(a), a).toBeTruthy()
      expect(kategorieById(b), b).toBeTruthy()
      expect(a).not.toBe(b)
    }
  })

  it('lässt zu jedem Paar genug eindeutige Dinge übrig', () => {
    for (const [a, b] of [...PAARE_LEICHT, ...PAARE_SCHWER]) {
      const ka = kategorieById(a)!
      const kb = kategorieById(b)!
      // Für eine Runde mit 6 Objekten braucht jede Seite mindestens 3.
      expect(eindeutigeDinge(ka, [ka, kb]).length, `${a} gegen ${b}`).toBeGreaterThanOrEqual(3)
      expect(eindeutigeDinge(kb, [ka, kb]).length, `${b} gegen ${a}`).toBeGreaterThanOrEqual(3)
    }
  })

  it('bietet für die Oberbegriff-Runde mindestens drei Art-Körbe an', () => {
    expect(OBERBEGRIFFE.length).toBeGreaterThanOrEqual(3)
    OBERBEGRIFFE.forEach((id) => expect(kategorieById(id)?.art).toBe('art'))
  })
})
