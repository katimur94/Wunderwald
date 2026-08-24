import { describe, expect, it } from 'vitest'
import { CARD_GAP, CARD_RATIO, computeBoardLayout, MIN_CARD_WIDTH } from './useBoardLayout'

/** Passt das Brett wirklich vollständig in die Fläche? */
function passt(cardCount: number, w: number, h: number, landscape = false) {
  const l = computeBoardLayout(cardCount, w, h, landscape)
  const brettW = l.cols * l.cardWidth + CARD_GAP * (l.cols - 1)
  const brettH = l.rows * l.cardHeight + CARD_GAP * (l.rows - 1)
  return { l, brettW, brettH, passtRein: brettW <= w + 1 && brettH <= h + 1 }
}

describe('Memory-Brett – Größenrechnung', () => {
  it('legt alle Karten unter, keine bleibt übrig', () => {
    for (const n of [6, 8, 12, 16, 20, 24]) {
      const l = computeBoardLayout(n, 340, 400)
      expect(l.cols * l.rows, `${n} Karten`).toBeGreaterThanOrEqual(n)
    }
  })

  it('passt in jede geprüfte Fläche vollständig hinein', () => {
    const flaechen = [
      [340, 300], [340, 400], [340, 480],
      [360, 260], [700, 300], [900, 500],
    ]
    for (const n of [6, 8, 12, 16, 20, 24]) {
      for (const [w, h] of flaechen) {
        const { brettW, brettH, passtRein, l } = passt(n, w, h, w > h)
        expect(passtRein, `${n} Karten auf ${w}×${h} → Brett ${brettW}×${brettH}, cols ${l.cols}`).toBe(true)
      }
    }
  })

  it('hält das Seitenverhältnis 3:4 ein', () => {
    const l = computeBoardLayout(12, 340, 420)
    expect(l.cardHeight).toBe(Math.floor(l.cardWidth / CARD_RATIO))
  })

  it('wählt die Aufteilung mit den größten Karten', () => {
    // 8 Karten auf einer breiten, flachen Fläche: mehr Spalten sind besser
    const breit = computeBoardLayout(8, 700, 220, true)
    const alternativen = [4, 5, 6, 7, 8].map((cols) => {
      const rows = Math.ceil(8 / cols)
      return Math.floor(Math.min((700 - CARD_GAP * (cols - 1)) / cols, ((220 - CARD_GAP * (rows - 1)) / rows) * CARD_RATIO))
    })
    expect(breit.cardWidth).toBe(Math.max(...alternativen))
  })

  it('meldet zuEng, wenn die Karten unter die Mindestgröße fielen', () => {
    // 24 Karten auf einer sehr kleinen Fläche
    const l = computeBoardLayout(24, 300, 220)
    expect(l.cardWidth).toBeLessThan(MIN_CARD_WIDTH)
    expect(l.zuEng).toBe(true)
  })

  it('meldet zuEng NICHT, wenn genug Platz da ist', () => {
    expect(computeBoardLayout(6, 340, 400).zuEng).toBe(false)
    expect(computeBoardLayout(16, 360, 460).zuEng).toBe(false)
  })

  it('kommt mit einer Fläche von null zurecht, statt zu stürzen', () => {
    const l = computeBoardLayout(12, 0, 0)
    expect(l.cardWidth).toBeGreaterThan(0)
    expect(l.cols).toBeGreaterThan(0)
    expect(Number.isFinite(l.cardHeight)).toBe(true)
  })

  it('nutzt im Querformat breitere Aufteilungen', () => {
    const hoch = computeBoardLayout(12, 340, 520, false)
    const quer = computeBoardLayout(12, 640, 280, true)
    expect(quer.cols).toBeGreaterThan(hoch.cols)
  })

  it('Stufe 4 (16 Karten) passt auf 360×560 ohne Unterschreitung', () => {
    // Stage-Flaeche auf 360x560 grob: 340 breit, ~330 hoch
    const l = computeBoardLayout(16, 340, 330)
    expect(l.zuEng, `Kartenbreite ${l.cardWidth}`).toBe(false)
  })
})
