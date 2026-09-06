import { BESUCHER, DEKO, PFLANZEN } from '../garden/arten'

/**
 * Das Gartenbuch: zu jeder Pflanze, jeder Deko und jedem Besucher zwei bis
 * drei kindgerechte Sachinfos.
 *
 * Regeln für die Texte: fachlich korrekt, höchstens 12 Wörter pro Satz,
 * keine Verniedlichung, keine Fantasie. Was hier steht, soll ein Kind
 * jemandem weitererzählen können, ohne dass es falsch wird.
 *
 * Die Fakten stehen direkt am Katalog (garden/arten.ts) — Buch und Garten
 * zitieren dieselbe Quelle, nichts steht zweimal.
 */

export type WaldbuchArt = 'pflanze' | 'deko' | 'besucher'

export interface WaldbuchSeite {
  objectId: string
  art: WaldbuchArt
  /** Was auf der Seite groß zu sehen ist */
  emoji: string
  name: string
  fakten: string[]
}

export const WALDBUCH: WaldbuchSeite[] = [
  ...PFLANZEN.map((p) => ({ objectId: p.id, art: 'pflanze' as const, emoji: p.emoji, name: p.name, fakten: p.fakten })),
  ...BESUCHER.map((b) => ({ objectId: b.id, art: 'besucher' as const, emoji: b.emoji, name: b.name, fakten: b.fakten })),
  ...DEKO.map((d) => ({ objectId: d.id, art: 'deko' as const, emoji: d.emoji, name: d.name, fakten: d.fakten })),
]

export function waldbuchSeite(objectId: string): WaldbuchSeite | undefined {
  return WALDBUCH.find((s) => s.objectId === objectId)
}

/** Ein zufälliger Satz für Funkel, wenn etwas angetippt wird. */
export function waldbuchFakt(objectId: string, rnd: () => number = Math.random): string | null {
  const seite = waldbuchSeite(objectId)
  if (!seite || seite.fakten.length === 0) return null
  return seite.fakten[Math.floor(rnd() * seite.fakten.length)]
}
