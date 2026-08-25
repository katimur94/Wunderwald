import { emojiOf, scaleOf, zoneOfSlot, BEREICHE, type Tageszeit } from './forest-objects'
import type { ForestItem } from '../db/types'

/**
 * Malt den Wald in ein Canvas und gibt ein PNG zurück.
 *
 * Bewusst direkt aufs Canvas gezeichnet statt ein SVG zu serialisieren:
 * Das kommt ohne externe Schriften und ohne `foreignObject` aus, läuft
 * offline und rendert die Emojis in der Systemschrift des Geräts.
 * Es verlässt nichts das Gerät — die Datei landet nur im Download-Ordner.
 */

const BREITE = 1200
const HOEHE = 800

const HIMMEL: Record<Tageszeit, [string, string]> = {
  morgen: ['#FFE9C4', '#EAF3E2'],
  tag: ['#CFE7F2', '#E7F2DE'],
  abend: ['#FFD2A1', '#F6E2CE'],
  nacht: ['#2B3A63', '#4A5B84'],
}

export function zeichneWald(
  ctx: CanvasRenderingContext2D,
  forest: ForestItem[],
  nickname: string,
  zeit: Tageszeit,
  offeneZonen: string[],
) {
  const [oben, unten] = HIMMEL[zeit]
  const g = ctx.createLinearGradient(0, 0, 0, HOEHE)
  g.addColorStop(0, oben)
  g.addColorStop(1, unten)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, BREITE, HOEHE)

  const dunkel = zeit === 'nacht'

  // Sonne bzw. Mond
  ctx.fillStyle = dunkel ? '#F2F3E0' : '#F6BD41'
  ctx.beginPath()
  ctx.arc(BREITE - 150, 120, 60, 0, Math.PI * 2)
  ctx.fill()

  // Ferne Hügel
  ctx.fillStyle = dunkel ? '#4E6A52' : '#BFD9AE'
  ctx.beginPath()
  ctx.moveTo(-20, 300)
  ctx.quadraticCurveTo(300, 190, 620, 300)
  ctx.quadraticCurveTo(920, 410, BREITE + 20, 270)
  ctx.lineTo(BREITE + 20, HOEHE)
  ctx.lineTo(-20, HOEHE)
  ctx.fill()

  // Wiese
  ctx.fillStyle = dunkel ? '#3F5C46' : '#CFE6B8'
  ctx.beginPath()
  ctx.moveTo(-20, 420)
  ctx.quadraticCurveTo(420, 390, 800, 430)
  ctx.quadraticCurveTo(1030, 452, BREITE + 20, 420)
  ctx.lineTo(BREITE + 20, HOEHE)
  ctx.lineTo(-20, HOEHE)
  ctx.fill()

  // Bachlauf
  ctx.fillStyle = dunkel ? '#38507A' : '#9FD0DF'
  ctx.beginPath()
  ctx.moveTo(-20, 640)
  ctx.quadraticCurveTo(300, 610, 620, 640)
  ctx.quadraticCurveTo(940, 672, BREITE + 20, 630)
  ctx.lineTo(BREITE + 20, 700)
  ctx.quadraticCurveTo(900, 716, 560, 700)
  ctx.quadraticCurveTo(240, 684, -20, 706)
  ctx.fill()

  // Objekte, hintere Reihen zuerst
  const sortiert = [...forest].sort((a, b) => a.slot - b.slot)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  for (const item of sortiert) {
    const zone = zoneOfSlot(item.slot)
    if (!offeneZonen.includes(zone)) continue
    const bereich = BEREICHE.find((b) => b.zone === zone)!
    const index = item.slot - bereich.von
    const spalten = zone === 'wiese' ? 6 : 4
    const spalte = index % spalten
    const reihe = Math.floor(index / spalten)

    // Zonen von oben nach unten: Hügel, Wiese, Bach
    const zonenOben = zone === 'huegel' ? 300 : zone === 'wiese' ? 430 : 620
    const zonenHoehe = zone === 'wiese' ? 180 : 90
    const reihenAnzahl = Math.ceil(bereich.anzahl / spalten)

    const x = (BREITE / (spalten + 1)) * (spalte + 1)
    const y = zonenOben + (zonenHoehe / (reihenAnzahl + 1)) * (reihe + 1)

    const groesse = Math.round(64 * scaleOf(item))
    ctx.font = `${groesse}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
    ctx.fillText(emojiOf(item), x, y)
  }

  // Titel
  ctx.font = '600 46px Fredoka, Trebuchet MS, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = dunkel ? '#F2F7EC' : '#2E4034'
  ctx.fillText(`${nickname}s Wunderwald`, 48, 78)
  ctx.font = '400 24px Nunito, sans-serif'
  ctx.fillText(`${forest.length} Dinge gepflanzt`, 48, 112)
}

/** Erzeugt das PNG und stößt den Download an. */
export async function exportiereWaldBild(
  forest: ForestItem[],
  nickname: string,
  zeit: Tageszeit,
  offeneZonen: string[],
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = BREITE
  canvas.height = HOEHE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')

  zeichneWald(ctx, forest, nickname, zeit, offeneZonen)

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('Bild konnte nicht erzeugt werden')

  const dateiname = `${nickname.toLowerCase().replace(/[^a-zäöüß0-9]+/g, '-')}s-wunderwald.png`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = dateiname
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return dateiname
}
