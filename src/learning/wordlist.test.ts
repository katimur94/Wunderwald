import { describe, expect, it } from 'vitest'
import {
  AEHNLICHE_LAUTE,
  ANLAUTE,
  ANLAUTE_EINFACH,
  ANLAUTE_HAEUFIG,
  anlaut,
  endlaut,
  hatKlarenAnlaut,
  KLARE_WORTE,
  withAnlautKlar,
  WORDS,
  withAnlaut,
  wordsWithLetters,
  wordsWithSyllables,
} from './wordlist'

describe('Bildwortschatz', () => {
  it('hat mindestens 80 Wörter', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(80)
  })

  it('enthält kein Wort doppelt', () => {
    const woerter = WORDS.map((w) => w.wort)
    expect(new Set(woerter).size).toBe(woerter.length)
  })

  it('hat zu jedem Wort ein Emoji und mindestens eine Silbe', () => {
    for (const w of WORDS) {
      expect(w.emoji.length, w.wort).toBeGreaterThan(0)
      expect(w.silben.length, w.wort).toBeGreaterThanOrEqual(1)
    }
  })

  it('setzt die Silben wieder zum Wort zusammen', () => {
    for (const w of WORDS) {
      expect(w.silben.join('').toLowerCase(), w.wort).toBe(w.wort.toLowerCase())
    }
  })

  it('schreibt jedes Wort groß', () => {
    for (const w of WORDS) expect(w.wort[0], w.wort).toBe(w.wort[0].toUpperCase())
  })

  it('liefert Anlaut und Endlaut als Großbuchstaben', () => {
    expect(anlaut({ wort: 'Affe', emoji: '🐒', silben: ['Af', 'fe'] })).toBe('A')
    expect(endlaut({ wort: 'Affe', emoji: '🐒', silben: ['Af', 'fe'] })).toBe('E')
  })

  it('hat zu jedem einfachen Anlaut mindestens zwei Wörter', () => {
    for (const l of ANLAUTE_EINFACH) {
      expect(withAnlaut(l).length, `Anlaut ${l}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('hat zu jedem häufigen Anlaut mindestens ein Wort', () => {
    for (const l of ANLAUTE_HAEUFIG) {
      expect(withAnlaut(l).length, `Anlaut ${l}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('kennt für jeden vorkommenden Anlaut ähnlich klingende Distraktoren', () => {
    for (const l of ANLAUTE) {
      expect(AEHNLICHE_LAUTE[l], `Anlaut ${l}`).toBeTruthy()
      expect(AEHNLICHE_LAUTE[l].length, `Anlaut ${l}`).toBeGreaterThanOrEqual(2)
      expect(AEHNLICHE_LAUTE[l], `Anlaut ${l}`).not.toContain(l)
    }
  })

  it('hat genug Wörter für alle Silbenstufen', () => {
    expect(wordsWithSyllables(2).length).toBeGreaterThanOrEqual(20)
    expect(wordsWithSyllables(3).length).toBeGreaterThanOrEqual(10)
  })

  it('hat genug kurze und mittlere Wörter für den Wort-Baukasten', () => {
    expect(wordsWithLetters(3, 4).length).toBeGreaterThanOrEqual(10)
    expect(wordsWithLetters(5, 6).length).toBeGreaterThanOrEqual(10)
  })

  it('verwendet nur Buchstaben (keine Bindestriche oder Leerzeichen)', () => {
    for (const w of WORDS) expect(w.wort, w.wort).toMatch(/^[A-Za-zÄÖÜäöüß]+$/)
  })
})

describe('Eindeutigkeit der Bilder', () => {
  it('verwendet jedes Emoji nur einmal', () => {
    // Sonst könnten in "Lies das Wort" zwei identische Bilder zur Auswahl stehen.
    const emojis = WORDS.map((w) => w.emoji)
    const doppelt = emojis.filter((e, i) => emojis.indexOf(e) !== i)
    expect(doppelt).toEqual([])
  })
})

describe('Klare Anlaute für die Anfängerstufen', () => {
  it('erkennt Mehrlauter und Konsonantenhäufungen nicht als klaren Anlaut', () => {
    const f = (wort: string) => hatKlarenAnlaut({ wort, emoji: 'x', silben: [wort] })
    expect(f('Affe')).toBe(true)
    expect(f('Igel')).toBe(true)
    expect(f('Baum')).toBe(true)
    expect(f('Sonne')).toBe(true)
    expect(f('Schaf')).toBe(false)
    expect(f('Stern')).toBe(false)
    expect(f('Blume')).toBe(false)
    expect(f('Frosch')).toBe(false)
    expect(f('Quadrat')).toBe(false)
  })

  it('hat zu jedem einfachen Anlaut mindestens zwei Wörter mit klarem Anlaut', () => {
    for (const l of ANLAUTE_EINFACH) {
      expect(withAnlautKlar(l).length, `Anlaut ${l}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('hat genug klare Wörter für die häufigen Anlaute', () => {
    const klarHaeufig = KLARE_WORTE.filter((w) => ANLAUTE_HAEUFIG.includes(anlaut(w)))
    expect(klarHaeufig.length).toBeGreaterThanOrEqual(25)
  })
})
