import { describe, expect, it } from 'vitest'
import { generateTask, type RallyeTask } from './flitzer-rallye'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'
import {
  baueRennstrecke,
  gegnerNachAntwort,
  hoeheAt,
  LOOP_SEGS,
  platzierung,
  segmentAt,
  SEG_LEN,
  spurVon,
  starteGegner,
  streueFunken,
  VORSPRUNG_MAX,
  VORSPRUNG_MIN,
} from './rallye'

describe('Flitzer-Rallye – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<RallyeTask>(generateTask, {
      optionsOf: (t) => t.data.optionen,
      minOptions: () => 3,
      extra: (t, lvl) => {
        const where = `Stufe ${lvl}: ${t.data.frage}`
        expect(t.data.optionen.length, where).toBe(3)
        expect(t.data.frage.trim().length, where).toBeGreaterThan(0)
        expect(t.data.tempo, where).toBeGreaterThan(1000)
        expect(['zahlen', 'buchstaben', 'entdecker']).toContain(t.data.quelle)
        // Jede Option muss aufs Tor passen — höchstens 16 Zeichen.
        t.data.optionen.forEach((o) => expect([...o].length, `${where} → ${o}`).toBeLessThanOrEqual(16))
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('zieht aus allen drei Welten', () => {
    const quellen = new Set<string>()
    for (let i = 0; i < 200; i++) quellen.add(generateTask(5, mulberry32(i)).data.quelle)
    expect([...quellen].sort()).toEqual(['buchstaben', 'entdecker', 'zahlen'])
  })

  it('zieht jede Frage auf der Stufe ihrer Welt', () => {
    // Zahlen-Stufe 1 → Zählmengen bis 6; Buchstaben-Stufe 10 → Lesen.
    let zaehlen = 0
    let lesen = 0
    for (let i = 0; i < 300; i++) {
      const t = generateTask(5, mulberry32(i), { levels: { zahlen: 1, buchstaben: 10, entdecker: 5 } })
      if (t.data.quelle === 'zahlen') {
        t.data.optionen.forEach((o) => expect(Number(o)).toBeLessThanOrEqual(8))
        zaehlen++
      }
      if (t.data.quelle === 'buchstaben') {
        // Auf Stufe 10 stehen Bilder an den Toren, das Wort auf dem Schild.
        expect(t.data.bild).toBeUndefined()
        lesen++
      }
    }
    expect(zaehlen).toBeGreaterThan(20)
    expect(lesen).toBeGreaterThan(20)
  })

  it('Buchstaben-Fragen der Stufe 1 haben trotzdem drei Tore', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(1, mulberry32(i), { levels: { buchstaben: 1 } })
      if (t.data.quelle !== 'buchstaben') continue
      expect(t.data.optionen).toHaveLength(3)
      expect(new Set(t.data.optionen).size).toBe(3)
    }
  })
})

describe('Flitzer-Rallye – Strecke', () => {
  it('ist eine geschlossene Runde ohne Höhensprung', () => {
    for (const lvl of [1, 5, 10]) {
      const s = baueRennstrecke(42, lvl)
      expect(s).toHaveLength(LOOP_SEGS)
      s.forEach((seg, i) => expect(seg.index).toBe(i))
      for (let i = 1; i < s.length; i++) expect(s[i].y1).toBe(s[i - 1].y2)
      expect(s[0].y1).toBe(0)
      expect(s[s.length - 1].y2).toBe(0)
      expect(hoeheAt(s, 0)).toBe(0)
    }
  })

  it('beginnt mit einer Geraden für die ersten Tore', () => {
    const s = baueRennstrecke(7, 10)
    for (let i = 0; i < 40; i++) {
      expect(s[i].curve).toBe(0)
      expect(s[i].y2).toBe(0)
    }
  })

  it('wird mit der Stufe kurviger', () => {
    const summe = (lvl: number) =>
      baueRennstrecke(11, lvl).reduce((a, seg) => a + Math.abs(seg.curve), 0)
    expect(summe(10)).toBeGreaterThan(summe(1))
  })

  it('segmentAt läuft rund — auch über das Rundenende hinaus', () => {
    const s = baueRennstrecke(3, 4)
    expect(segmentAt(s, 0).index).toBe(0)
    expect(segmentAt(s, LOOP_SEGS * SEG_LEN + 5 * SEG_LEN).index).toBe(5)
    expect(segmentAt(s, -SEG_LEN).index).toBe(LOOP_SEGS - 1)
  })

  it('hat Bäume und Blumen am Rand, nie auf der Straße', () => {
    const s = baueRennstrecke(9, 6)
    const sprites = s.flatMap((seg) => seg.sprites)
    expect(sprites.length).toBeGreaterThan(300)
    sprites.forEach((sp) => expect(Math.abs(sp.offset)).toBeGreaterThan(1.1))
  })
})

describe('Flitzer-Rallye – Spuren, Gegner, Funken', () => {
  it('ordnet Querpositionen den drei Spuren zu', () => {
    expect(spurVon(-1)).toBe(0)
    expect(spurVon(-0.66)).toBe(0)
    expect(spurVon(0)).toBe(1)
    expect(spurVon(0.2)).toBe(1)
    expect(spurVon(0.66)).toBe(2)
    expect(spurVon(1.2)).toBe(2)
  })

  it('startet mit drei Gegnern, die alle vorn liegen — und nie das eigene Tier sind', () => {
    const g = starteGegner(mulberry32(1), '🦔')
    expect(g).toHaveLength(3)
    g.forEach((x) => expect(x.emoji).not.toBe('🦔'))
    g.forEach((x) => expect(x.vorsprung).toBeGreaterThan(0))
    expect(platzierung(g)).toBe(4)
  })

  it('sechs richtige Antworten bringen Platz 1, sechs falsche Platz 4', () => {
    let g = starteGegner(mulberry32(2), '🦊')
    for (let i = 0; i < 6; i++) g = gegnerNachAntwort(g, true)
    expect(platzierung(g)).toBe(1)
    let h = starteGegner(mulberry32(2), '🦊')
    for (let i = 0; i < 6; i++) h = gegnerNachAntwort(h, false)
    expect(platzierung(h)).toBe(4)
  })

  it('hält den Vorsprung in Grenzen', () => {
    let g = starteGegner(mulberry32(3), '🦊')
    for (let i = 0; i < 30; i++) g = gegnerNachAntwort(g, true)
    g.forEach((x) => expect(x.vorsprung).toBeGreaterThanOrEqual(VORSPRUNG_MIN))
    for (let i = 0; i < 60; i++) g = gegnerNachAntwort(g, false)
    g.forEach((x) => expect(x.vorsprung).toBeLessThanOrEqual(VORSPRUNG_MAX))
  })

  it('streut Funken nur zwischen Auto und Tor, in einer der drei Spuren', () => {
    const von = 1000
    const bis = von + 105 * SEG_LEN
    const f = streueFunken(mulberry32(4), von, bis)
    expect(f.length).toBeGreaterThan(3)
    f.forEach((x) => {
      expect(x.z).toBeGreaterThan(von)
      expect(x.z).toBeLessThan(bis - SEG_LEN * 10)
      expect([-0.66, 0, 0.66]).toContain(x.x)
      expect(x.weg).toBe(false)
    })
  })
})
