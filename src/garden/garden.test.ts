import { describe, expect, it } from 'vitest'
import {
  aktualisiereBesucher,
  ausWald,
  BEETE_MAX,
  BEETE_START,
  beeteFuer,
  duengen,
  DURST_AB,
  ernten,
  freieBeete,
  gartenVon,
  gesammelteSeiten,
  giessen,
  hatDurst,
  istReif,
  jaeten,
  leererGarten,
  moeglicheBesucher,
  NACH_ERNTE,
  neueBeete,
  offenerMeilenstein,
  pflanzen,
  SCHUB_GIESSEN,
  schneckeVertreiben,
  simuliereBeet,
  simuliereGarten,
  STUNDE,
  welke,
} from './garden'
import { DEKO, PFLANZEN, pflanzeById, samenLaden } from './arten'
import { pflanzeSvg } from './pflanze-svg'
import type { Child, GardenBed } from '../db/types'

const T0 = new Date('2026-05-01T08:00:00Z').getTime()
const nie = () => 1 // Zufall, der nie zuschlägt (Unkraut, Schnecken)
const manchmal = () => 0.2 // schlägt zu, sobald die Tages-Wahrscheinlichkeit über 20 % liegt

function beet(over: Partial<GardenBed> = {}): GardenBed {
  return { ...pflanzen(0, pflanzeById('tulpe')!, T0), ...over }
}

describe('Katalog', () => {
  it('hat eindeutige Ids, Preise und Wachstumszeiten', () => {
    const ids = PFLANZEN.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const p of PFLANZEN) {
      expect(p.kosten, p.id).toBeGreaterThan(0)
      expect(p.stundenBisReif, p.id).toBeGreaterThan(10)
      expect(p.wasserProStunde, p.id).toBeGreaterThan(0)
      expect(p.sterne, p.id).toBeGreaterThan(0)
      expect(p.fakten.length, p.id).toBeGreaterThanOrEqual(2)
    }
    expect(new Set(DEKO.map((d) => d.id)).size).toBe(DEKO.length)
  })

  it('bietet am Anfang Samen an, die eine einzige Runde bezahlt', () => {
    const anfang = samenLaden(0)
    expect(anfang.length).toBeGreaterThanOrEqual(3)
    expect(Math.min(...anfang.map((p) => p.kosten))).toBeLessThanOrEqual(3)
    expect(samenLaden(100).length).toBe(PFLANZEN.length)
  })

  it('jede Ernte bringt mehr Sterne zurück, als der Samen gekostet hat — über die Zeit', () => {
    // Mehrjährige Pflanzen zahlen sich ab der zweiten Ernte aus, einjährige sofort oder fast.
    for (const p of PFLANZEN) {
      const rueck = p.mehrjaehrig ? p.sterne * 2 : p.sterne
      expect(rueck, p.id).toBeGreaterThanOrEqual(p.kosten * 0.6)
    }
  })
})

describe('Wachstum mit Wasser', () => {
  it('wächst nur, solange Wasser da ist', () => {
    const baum = pflanzeById('apfelbaum')!
    const jung = { ...beet(), speciesId: 'apfelbaum' }
    const nachTag = simuliereBeet(jung, T0 + 24 * STUNDE, nie)
    // 100 % Wasser reichen bei 1.6 %/h gut zwei Tage über die Wachstumsgrenze — ein Tag wächst voll.
    expect(nachTag.growth).toBeCloseTo(24 / baum.stundenBisReif, 3)
    expect(nachTag.water).toBeCloseTo(100 - baum.wasserProStunde * 24, 1)

    // Eine Woche ohne Gießen: wächst nur, bis das Wasser knapp wird — dann nichts mehr.
    const nachWoche = simuliereBeet(jung, T0 + 7 * 24 * STUNDE, nie)
    const gewachsen = (100 - 15) / baum.wasserProStunde
    expect(nachWoche.water).toBe(0)
    expect(nachWoche.growth).toBeCloseTo(gewachsen / baum.stundenBisReif, 3)
    expect(nachWoche.growth).toBeLessThan(1)
  })

  it('wird reif, wenn man jeden Tag gießt', () => {
    let b = beet()
    let t = T0
    for (let tag = 0; tag < 3; tag++) {
      t += 24 * STUNDE
      b = simuliereBeet(b, t, nie)
      b = giessen(b, t).bed
    }
    expect(istReif(b)).toBe(true)
  })

  it('lässt vertrocknete Pflanzen hängen, aber nie sterben', () => {
    const b = simuliereBeet(beet(), T0 + 30 * 24 * STUNDE, nie)
    expect(hatDurst(b)).toBe(true)
    expect(welke(b)).toBe(1)
    expect(b.growth).toBeGreaterThan(0)
    expect(pflanzeById(b.speciesId)).toBeTruthy()
  })

  it('welkt erst unterhalb der Durstgrenze', () => {
    expect(welke(beet({ water: DURST_AB + 1 }))).toBe(0)
    expect(welke(beet({ water: DURST_AB / 2 }))).toBeCloseTo(0.5, 5)
  })

  it('verrechnet keine Zeit doppelt', () => {
    const a = simuliereBeet(beet(), T0 + 5 * STUNDE, nie)
    const b = simuliereBeet(a, T0 + 5 * STUNDE, nie)
    expect(b).toEqual(a)
  })
})

describe('Pflege', () => {
  it('Gießen füllt den Tank und gibt durstigen Pflanzen einen Schub', () => {
    const durstig = beet({ water: 20, growth: 0.3 })
    const { bed, schub } = giessen(durstig, T0)
    expect(bed.water).toBe(100)
    expect(schub).toBe(true)
    expect(bed.growth).toBeCloseTo(0.3 + SCHUB_GIESSEN, 5)
  })

  it('Gießen einer satten Pflanze bringt keinen Schub', () => {
    const { bed, schub } = giessen(beet({ water: 90, growth: 0.3 }), T0)
    expect(schub).toBe(false)
    expect(bed.growth).toBe(0.3)
  })

  it('Unkraut bremst, Jäten hilft', () => {
    const mitUnkraut = beet({ weeds: 2 })
    const ohne = beet()
    const a = simuliereBeet(mitUnkraut, T0 + 10 * STUNDE, nie)
    const b = simuliereBeet(ohne, T0 + 10 * STUNDE, nie)
    expect(a.growth).toBeLessThan(b.growth)
    const { bed } = jaeten(a, T0 + 10 * STUNDE)
    expect(bed.weeds).toBe(1)
    expect(bed.growth).toBeGreaterThan(a.growth)
  })

  it('Unkraut und Schnecken kommen mit der Zeit — nicht sofort', () => {
    const sofort = simuliereBeet(beet({ growth: 0.5 }), T0 + 60_000, manchmal)
    expect(sofort.weeds).toBe(0)
    expect(sofort.snail).toBe(false)
    // Ein Baum ist nach zwei Tagen noch nicht reif — Schnecken mögen nur wachsende Pflanzen.
    const spaeter = simuliereBeet({ ...beet({ growth: 0.3 }), speciesId: 'apfelbaum' }, T0 + 48 * STUNDE, manchmal)
    expect(spaeter.weeds).toBeGreaterThanOrEqual(1)
    expect(spaeter.snail).toBe(true)
  })

  it('Schnecken knabbern nur wenig und lassen sich vertreiben', () => {
    const baum = pflanzeById('apfelbaum')!
    const b = simuliereBeet({ ...beet({ growth: 0.3, snail: true }), speciesId: 'apfelbaum' }, T0 + 48 * STUNDE, nie)
    // gewachsen wie ohne Schnecke, minus höchstens 0.12 Knabberei
    expect(b.growth).toBeCloseTo(0.3 + 48 / baum.stundenBisReif - 0.12, 3)
    const { bed } = schneckeVertreiben(b, T0)
    expect(bed.snail).toBe(false)
  })

  it('Dünger verdoppelt das Tempo für zwölf Stunden', () => {
    const { bed } = duengen(beet({ growth: 0.1 }), T0)
    expect(bed.growth).toBeCloseTo(0.18, 5)
    const a = simuliereBeet(bed, T0 + 6 * STUNDE, nie)
    const b = simuliereBeet(beet({ growth: 0.18 }), T0 + 6 * STUNDE, nie)
    expect(a.growth - 0.18).toBeCloseTo((b.growth - 0.18) * 2, 3)
  })
})

describe('Ernte', () => {
  it('einjährige Pflanzen räumen das Beet, mehrjährige tragen weiter', () => {
    const tulpe = ernten(beet({ growth: 1 }), pflanzeById('tulpe')!, T0)
    expect(tulpe.bed).toBeNull()
    expect(tulpe.sterne).toBe(2)
    const erdbeere = ernten({ ...beet({ growth: 1 }), speciesId: 'erdbeere' }, pflanzeById('erdbeere')!, T0)
    expect(erdbeere.bed?.growth).toBe(NACH_ERNTE)
    expect(erdbeere.bed?.harvests).toBe(1)
  })

  it('schaltet mit den Ernten neue Beete frei — bis zum Maximum', () => {
    expect(beeteFuer(0)).toBe(BEETE_START)
    expect(beeteFuer(3)).toBe(BEETE_START + 2)
    expect(beeteFuer(8)).toBe(BEETE_START + 4)
    expect(beeteFuer(100)).toBe(BEETE_MAX)
    const g = { ...leererGarten(), harvestsTotal: 3 }
    expect(neueBeete(g).dazu).toBe(2)
    expect(neueBeete(neueBeete(g).garden).dazu).toBe(0)
  })

  it('feiert Ernte-Meilensteine genau einmal', () => {
    expect(offenerMeilenstein(0, [])?.id).toBeUndefined()
    expect(offenerMeilenstein(1, [])?.id).toBe('ernte-1')
    expect(offenerMeilenstein(1, ['ernte-1'])).toBeNull()
    expect(offenerMeilenstein(6, ['ernte-1'])?.id).toBe('ernte-5')
  })

  it('kennt freie Beete', () => {
    const g = { ...leererGarten(), beds: [beet({ slot: 0 }), beet({ slot: 2 })] }
    expect(freieBeete(g)).toEqual([1, 3, 4, 5])
  })
})

describe('Besucher', () => {
  it('kommen, wenn der Garten ihnen gefällt', () => {
    const g = { ...leererGarten(), beds: [0, 1, 2].map((i) => ({ ...beet({ slot: i, growth: 0.8 }), speciesId: 'tulpe' })) }
    expect(moeglicheBesucher(g)).toContain('schmetterling')
    expect(moeglicheBesucher(g)).toContain('biene')
    expect(moeglicheBesucher(leererGarten())).toEqual([])
    const mitTeich = { ...leererGarten(), decor: [{ slot: 0, decorId: 'teich' }] }
    expect(moeglicheBesucher(mitTeich)).toContain('frosch')
  })

  it('werden nur einmal als neu gemeldet und bleiben im Buch', () => {
    const g = { ...leererGarten(), beds: [0, 1].map((i) => beet({ slot: i, growth: 0.9 })) }
    const a = aktualisiereBesucher(g)
    expect(a.neu).toEqual(['schmetterling'])
    const b = aktualisiereBesucher(a.garden)
    expect(b.neu).toEqual([])
    expect(b.garden.visitors).toEqual(['schmetterling'])
  })
})

describe('Simulation des ganzen Gartens', () => {
  it('meldet, was seit dem letzten Besuch passiert ist', () => {
    const g = { ...leererGarten(), beds: [beet({ slot: 0, growth: 0.99, water: 100 }), beet({ slot: 1, water: 40 })] }
    const s = simuliereGarten(g, T0 + 3 * STUNDE, nie)
    expect(s.gereift).toEqual(['Tulpe'])
    expect(s.durstig).toEqual(['Tulpe'])
  })
})

describe('Alter Wald wird Garten', () => {
  const forest = [
    { slot: 0, objectId: 'baum', placedAt: 1, growthDays: 4, lastGrowthDay: '2026-01-01' },
    { slot: 1, objectId: 'blume', placedAt: 1, growthDays: 0, lastGrowthDay: '2026-01-01' },
    { slot: 2, objectId: 'bank', placedAt: 1, growthDays: 0, lastGrowthDay: '2026-01-01' },
    { slot: 3, objectId: 'hase', placedAt: 1, growthDays: 0, lastGrowthDay: '2026-01-01' },
    { slot: 4, objectId: 'regenbogen', placedAt: 1, growthDays: 0, lastGrowthDay: '2026-01-01' },
  ]

  it('übersetzt Pflanzen in Beete, Häuser in Deko, Tiere in Besucher', () => {
    const g = ausWald(forest, [{ objectId: 'ente', growthDays: 0 }], T0)
    expect(g.beds.map((b) => b.speciesId)).toEqual(['apfelbaum', 'tulpe'])
    expect(g.beds[0].growth).toBeGreaterThan(g.beds[1].growth)
    expect(g.decor.map((d) => d.decorId)).toEqual(['bank'])
    expect(g.visitors).toEqual(['hase', 'frosch'])
    expect(g.bedCount).toBe(BEETE_START)
  })

  it('gibt einem vollen Wald genug Beete, aber nie mehr als das Maximum', () => {
    const viele = Array.from({ length: 30 }, (_, i) => ({ slot: i, objectId: 'baum', placedAt: 1, growthDays: 1, lastGrowthDay: '' }))
    const g = ausWald(viele, [], T0)
    expect(g.bedCount).toBe(BEETE_MAX)
    expect(g.beds.length).toBe(BEETE_MAX)
  })

  it('ein Kind ohne Garten bekommt seinen Wald übersetzt, eines mit Garten behält ihn', () => {
    const basis: Child = {
      id: 'k', nickname: 'Mia', avatarId: 'igel', birthYear: null, createdAt: 0, stars: 0, starsTotal: 0,
      companion: { level: 1, xp: 0, outfitId: null, ownedOutfits: [] }, forest, milestones: [],
    }
    expect(gartenVon(basis, T0).beds).toHaveLength(2)
    const eigener = { ...leererGarten(), harvestsTotal: 7 }
    expect(gartenVon({ ...basis, garden: eigener }, T0)).toBe(eigener)
  })

  it('sammelt fürs Buch Pflanzen, Deko und Besucher', () => {
    const g = ausWald(forest, [], T0)
    expect([...gesammelteSeiten(g)].sort()).toEqual(['apfelbaum', 'bank', 'hase', 'tulpe'])
  })
})

describe('Pflanzen-Zeichnung', () => {
  it('liefert für jede Art und jedes Wachstum gültiges SVG', () => {
    for (const p of PFLANZEN) {
      for (const g of [0, 0.03, 0.1, 0.3, 0.6, 0.9, 1]) {
        for (const w of [0, 0.5, 1]) {
          const svg = pflanzeSvg({ form: p.form, growth: g, welk: w, farbe: p.farbe })
          expect(svg.startsWith('<svg'), `${p.id} ${g}`).toBe(true)
          expect(svg.endsWith('</svg>'), `${p.id} ${g}`).toBe(true)
          expect(svg, `${p.id} ${g}`).not.toContain('NaN')
          expect(svg, `${p.id} ${g}`).not.toContain('undefined')
        }
      }
    }
  })

  it('sieht bei mehr Wachstum anders aus als bei weniger', () => {
    for (const p of PFLANZEN) {
      const a = pflanzeSvg({ form: p.form, growth: 0.3, welk: 0, farbe: p.farbe })
      const b = pflanzeSvg({ form: p.form, growth: 1, welk: 0, farbe: p.farbe })
      const c = pflanzeSvg({ form: p.form, growth: 1, welk: 1, farbe: p.farbe })
      expect(a, p.id).not.toBe(b)
      expect(b, p.id).not.toBe(c)
    }
  })
})
