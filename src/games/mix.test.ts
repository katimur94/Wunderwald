import { describe, expect, it } from 'vitest'
import './index' // registriert alle Spiele
import { allGames, gamesOfWorld, getGame } from './registry'
import { makeMixModule, mischbareSpiele, type MixTask } from './mix'
import { mulberry32 } from './rng'
import { WORLD_IDS } from '../db/types'

describe('Mix-Runde', () => {
  it('gibt es in jeder Welt', () => {
    for (const w of WORLD_IDS) {
      const mix = getGame(`mix-${w}`)
      expect(mix, w).toBeTruthy()
      expect(mix!.worldId).toBe(w)
      expect(mix!.title).toBe('Überraschung')
    }
  })

  it('zieht nur aus Spielen derselben Welt', () => {
    for (const w of WORLD_IDS) {
      const pool = mischbareSpiele(w)
      expect(pool.length, w).toBeGreaterThanOrEqual(2)
      pool.forEach((g) => expect(g.worldId, g.id).toBe(w))
    }
  })

  it('lässt Brett-Spiele draußen — ein Brett ist eine ganze Runde', () => {
    for (const w of WORLD_IDS) {
      for (const g of mischbareSpiele(w)) {
        expect(g.tasksPerRound, g.id).toBeUndefined()
        expect(g.fillsStage, g.id).toBeFalsy()
        expect(g.id.startsWith('mix-'), g.id).toBe(false)
      }
    }
  })

  it('erzeugt auf jeder Stufe gültige Aufgaben aus echten Spielen', () => {
    for (const w of WORLD_IDS) {
      const mix = makeMixModule(w)
      for (let lvl = 1; lvl <= 10; lvl++) {
        for (let i = 0; i < 60; i++) {
          const t = mix.generateTask(lvl, mulberry32(lvl * 811 + i))
          const where = `${w}, Stufe ${lvl}, Durchlauf ${i}`
          const quelle = getGame(t.data.quelle)
          expect(quelle, where).toBeTruthy()
          expect(quelle!.worldId, where).toBe(w)
          // Die innere Aufgabe wird unverändert durchgereicht
          expect(t.answer, where).toBe(t.data.inner.answer)
          expect(t.speak, where).toBe(t.data.inner.speak)
          expect(t.speak.trim().length, where).toBeGreaterThan(3)
        }
      }
    }
  })

  it('bucht den Versuch auf das gezogene Spiel, nicht auf die Mix-Runde', () => {
    for (const w of WORLD_IDS) {
      const mix = makeMixModule(w)
      for (let i = 0; i < 60; i++) {
        const t = mix.generateTask(5, mulberry32(i))
        expect(mix.attemptGameId!(t)).toBe(t.data.quelle)
        expect(mix.attemptGameId!(t)).not.toBe(mix.id)
      }
    }
  })

  it('zieht über eine Runde hinweg verschiedene Spiele', () => {
    const gesehen = new Set<string>()
    const mix = makeMixModule('zahlen')
    for (let i = 0; i < 60; i++) {
      gesehen.add((mix.generateTask(4, mulberry32(i)) as MixTask).data.quelle)
    }
    expect(gesehen.size).toBeGreaterThanOrEqual(2)
  })

  it('ist bei gleichem Seed deterministisch', () => {
    const mix = makeMixModule('logik')
    for (let lvl = 1; lvl <= 10; lvl++) {
      const a = mix.generateTask(lvl, mulberry32(99))
      const b = mix.generateTask(lvl, mulberry32(99))
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    }
  })
})

describe('Spiel-Registry nach Phase 10', () => {
  it('hat je Welt ihre Spiele plus genau eine Mix-Runde', () => {
    // Zahlenland trägt seit dem Zahlen-Sprung vier Spiele, die anderen drei.
    const erwartet = { zahlen: 4, buchstaben: 3, logik: 3 } as const
    for (const w of WORLD_IDS) {
      const spiele = gamesOfWorld(w).filter((g) => !g.id.startsWith('mix-'))
      expect(spiele.length, w).toBe(erwartet[w])
      expect(gamesOfWorld(w).length, w).toBe(erwartet[w] + 1)
    }
  })

  it('vergibt jede Spiel-Kennung nur einmal und gibt jedem einen Titel', () => {
    const ids = allGames().map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const g of allGames()) {
      expect(g.title.length, g.id).toBeGreaterThan(2)
      expect(g.subtitle.length, g.id).toBeGreaterThan(4)
    }
  })
})
