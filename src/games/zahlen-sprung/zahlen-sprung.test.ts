import { describe, expect, it } from 'vitest'
import { generateTask, type SprungTask } from './zahlen-sprung'
import { checkDeterminism, checkGeneratorContract } from '../generator-contract'
import { mulberry32 } from '../rng'
import { baueStrecke, sprungScheitel, wrapDelta, BLOCK_Y } from './strecke'

/** Rechnet den Schild-Term nach — prüft, dass Anzeige und Lösung übereinstimmen. */
function evaluate(term: string): number {
  const clean = term
    .replace(/−/g, '-')
    .replace(/·/g, '*')
    .replace(/:/g, '/')
    .replace(/\s*=\s*\?\s*$/, '')
  // eslint-disable-next-line no-new-func
  return Function(`"use strict"; return (${clean})`)() as number
}

describe('Zahlen-Sprung – Generator', () => {
  it('erfüllt den Generator-Vertrag auf allen Stufen', () => {
    checkGeneratorContract<SprungTask>(generateTask, {
      optionsOf: (t) => t.data.bloecke,
      minOptions: () => 3,
      extra: (t, lvl) => {
        const where = `Stufe ${lvl}: ${t.data.schild}`
        expect(t.data.schild.trim().length, where).toBeGreaterThan(0)
        expect(t.data.bloecke.length, where).toBe(3)
        t.data.bloecke.forEach((o) => expect(o, where).toBeGreaterThanOrEqual(0))
        expect(t.data.tempo, where).toBeGreaterThan(0)
        expect(t.data.hindernisse, where).toBeGreaterThanOrEqual(0)
        expect(t.data.hindernisse, where).toBeLessThanOrEqual(3)
      },
    })
  })

  it('ist bei gleichem Seed deterministisch', () => {
    checkDeterminism(generateTask)
  })

  it('jeder Rechen-Term auf dem Schild ergibt tatsächlich die Lösung', () => {
    for (let lvl = 3; lvl <= 10; lvl++) {
      for (let i = 0; i < 200; i++) {
        const t = generateTask(lvl, mulberry32(lvl * 1000 + i))
        const s = t.data.schild
        if (!s.includes('=')) continue
        const where = `Stufe ${lvl}: ${s}`
        if (s.includes('?') && !s.trimEnd().endsWith('?')) {
          // Lückenaufgabe: Lösung eingesetzt muss die rechte Seite ergeben
          const [links, rechts] = s.split('=')
          const eingesetzt = links.replace('?', String(t.answer))
          expect(evaluate(eingesetzt), where).toBe(Number(rechts.trim()))
        } else {
          expect(evaluate(s), where).toBe(t.answer)
        }
      }
    }
  })

  it('bleibt auf Stufe 1 bei kleinen Zahlen mit Zählmenge als Stütze', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(1, mulberry32(i))
      expect(t.data.art).toBe('erkennen')
      expect(t.answer as number).toBeGreaterThanOrEqual(1)
      expect(t.answer as number).toBeLessThanOrEqual(6)
      expect(t.data.menge).not.toBeNull()
      expect(t.data.menge!.anzahl).toBe(t.answer)
      expect(t.data.hindernisse).toBe(0)
    }
  })

  it('zeigt auf Stufe 2 Zählmengen, deren Anzahl die Lösung ist', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(2, mulberry32(i))
      if (t.data.art === 'zaehlen') {
        expect(t.data.menge).not.toBeNull()
        expect(t.data.menge!.anzahl).toBe(t.answer)
      } else {
        expect(t.data.art).toBe('erkennen')
        expect(t.answer as number).toBeLessThanOrEqual(10)
      }
    }
  })

  it('rechnet auf Stufe 3 nur plus bis 10, mit Punktebildern', () => {
    for (let i = 0; i < 200; i++) {
      const t = generateTask(3, mulberry32(i))
      expect(t.data.art).toBe('plus')
      expect(t.answer as number).toBeLessThanOrEqual(10)
      expect(t.data.punkte).not.toBeNull()
      expect(t.data.punkte![0] + t.data.punkte![1]).toBe(t.answer)
    }
  })

  it('lässt auf Stufe 4 minus nie ins Negative und vergleicht korrekt', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(4, mulberry32(i))
      if (t.data.art === 'minus') {
        expect(t.answer as number).toBeGreaterThanOrEqual(1)
        expect(t.answer as number).toBeLessThanOrEqual(9)
      } else {
        expect(t.data.art).toBe('vergleich')
        const erwartet = t.data.schild.includes('Größte')
          ? Math.max(...t.data.bloecke)
          : Math.min(...t.data.bloecke)
        expect(t.answer).toBe(erwartet)
      }
    }
  })

  it('fragt auf Stufe 5 Nachbarzahlen richtig ab', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(5, mulberry32(i))
      if (t.data.art !== 'nachbar') continue
      const m = t.data.schild.match(/^(\d+|\?) → (\d+|\?)$/)
      expect(m, t.data.schild).toBeTruthy()
      if (m![1] === '?') expect(t.answer).toBe(Number(m![2]) - 1)
      else expect(t.answer).toBe(Number(m![1]) + 1)
    }
  })

  it('erzwingt auf Stufe 6 den Zehnerübergang — außer beim Verdoppeln', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(6, mulberry32(i))
      const m = t.data.schild.match(/^(\d+) ([+−]) (\d+)/)!
      const a = Number(m[1])
      const b = Number(m[3])
      if (t.data.art === 'verdoppeln') {
        expect(a).toBe(b)
        continue
      }
      if (m[2] === '+') expect((a % 10) + b, `Übergang fehlt: ${t.data.schild}`).toBeGreaterThan(9)
      else expect(a % 10, `Übergang fehlt: ${t.data.schild}`).toBeLessThan(b)
    }
  })

  it('halbiert auf Stufe 7 nur gerade Zahlen', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(7, mulberry32(i))
      if (t.data.art !== 'halbieren') continue
      const n = Number(t.data.schild.match(/^(\d+)/)![1])
      expect(n % 2).toBe(0)
      expect(t.answer).toBe(n / 2)
    }
  })

  it('setzt auf Stufe 8 Reihen mit gleichmäßigem Schritt fort', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(8, mulberry32(i))
      if (t.data.art !== 'reihe') continue
      const teile = t.data.schild.replace(', ?', '').split(', ').map(Number)
      const schritt = teile[1] - teile[0]
      expect([2, 5, 10]).toContain(schritt)
      expect(teile[2] - teile[1]).toBe(schritt)
      expect(t.answer).toBe(teile[2] + schritt)
    }
  })

  it('rechnet auf Stufe 9 mit runden Zehnern nie über 100', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(9, mulberry32(i))
      if (t.data.art !== 'zehner') continue
      expect(t.answer as number).toBeGreaterThanOrEqual(10)
      expect(t.answer as number).toBeLessThanOrEqual(100)
      expect((t.answer as number) % 10).toBe(0)
    }
  })

  it('füllt auf Stufe 10 Einmaleins-Lücken mit dem fehlenden Faktor', () => {
    for (let i = 0; i < 300; i++) {
      const t = generateTask(10, mulberry32(i))
      if (t.data.art !== 'malluecke') continue
      const m = t.data.schild.match(/^(\d+) · \? = (\d+)$/)!
      expect(Number(m[1]) * (t.answer as number)).toBe(Number(m[2]))
    }
  })
})

describe('Zahlen-Sprung – Strecke', () => {
  it('baut Blöcke aufsteigend mit weiten Lücken, ohne Hindernis daneben', () => {
    for (let seed = 0; seed < 200; seed++) {
      const s = baueStrecke(seed, 340, 3)
      expect(s.bloecke.length).toBe(3)
      expect(s.hindernisse.length).toBe(3)
      // Blöcke aufsteigend und weit genug auseinander für einen freien Anlauf
      for (let i = 1; i < 3; i++) {
        expect(s.bloecke[i] - s.bloecke[i - 1], `Seed ${seed}`).toBeGreaterThan(80)
      }
      // Auch über den Rundenschluss hinweg bleibt Abstand
      expect(s.bloecke[0] + s.laenge - s.bloecke[2], `Seed ${seed}`).toBeGreaterThan(80)
      // Kein Hindernis klebt an einem Block — sonst wäre der Absprung unfair
      for (const h of s.hindernisse) {
        for (const b of s.bloecke) {
          expect(Math.abs(wrapDelta(h.x, b, s.laenge)), `Seed ${seed}`).toBeGreaterThan(25)
        }
      }
    }
  })

  it('wächst mit der Sichtweite, damit nie zwei Kopien eines Blocks sichtbar sind', () => {
    expect(baueStrecke(1, 200, 0).laenge).toBeGreaterThanOrEqual(430)
    expect(baueStrecke(1, 600, 0).laenge).toBeGreaterThanOrEqual(760)
  })

  it('alle Funken hängen im Sprungbereich', () => {
    const scheitel = sprungScheitel()
    for (let seed = 0; seed < 200; seed++) {
      for (const f of baueStrecke(seed, 340, 2).funken) {
        expect(f.y).toBeGreaterThanOrEqual(0)
        expect(f.y).toBeLessThan(scheitel)
      }
    }
  })

  it('der Sprung reicht bis über die Block-Unterkante', () => {
    expect(sprungScheitel()).toBeGreaterThan(BLOCK_Y + 8)
  })

  it('wrapDelta liefert den kürzesten Weg über den Rundenschluss', () => {
    expect(wrapDelta(10, 0, 400)).toBe(10)
    expect(wrapDelta(390, 0, 400)).toBe(-10)
    expect(wrapDelta(0, 390, 400)).toBe(10)
    expect(wrapDelta(200, 0, 400)).toBe(200)
  })
})
