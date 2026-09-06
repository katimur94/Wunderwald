import type { Garden } from '../db/types'
import { dekoById, pflanzeById } from '../garden/arten'
import { welke } from '../garden/garden'
import { pflanzeSvg } from '../garden/pflanze-svg'
import type { Tageszeit } from './forest-objects'

/**
 * Malt den Garten in ein Canvas und gibt ein PNG zurück.
 *
 * Die Pflanzen sind dieselben SVG-Zeichnungen wie auf dem Schirm; sie werden
 * als Bilder ins Canvas gemalt. Das kommt ohne externe Schriften und ohne
 * `foreignObject` aus, läuft offline und rendert die Emojis in der
 * Systemschrift des Geräts. Es verlässt nichts das Gerät — die Datei
 * landet nur im Download-Ordner.
 */

const BREITE = 1200
const HOEHE = 800

const HIMMEL: Record<Tageszeit, [string, string]> = {
  morgen: ['#FFE9C4', '#EAF3E2'],
  tag: ['#CFE7F2', '#E7F2DE'],
  abend: ['#FFD2A1', '#F6E2CE'],
  nacht: ['#2B3A63', '#4A5B84'],
}

function svgAlsBild(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('SVG konnte nicht geladen werden'))
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  })
}

export async function zeichneGarten(
  ctx: CanvasRenderingContext2D,
  garden: Garden,
  nickname: string,
  zeit: Tageszeit,
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
  ctx.moveTo(-20, 400)
  ctx.quadraticCurveTo(420, 370, 800, 410)
  ctx.quadraticCurveTo(1030, 432, BREITE + 20, 400)
  ctx.lineTo(BREITE + 20, HOEHE)
  ctx.lineTo(-20, HOEHE)
  ctx.fill()

  // Zaun mit Deko und Besuchern
  ctx.strokeStyle = dunkel ? '#7B6248' : '#C49A6A'
  ctx.lineWidth = 6
  for (let x = 60; x < BREITE - 40; x += 46) {
    ctx.beginPath()
    ctx.moveTo(x, 370)
    ctx.lineTo(x, 420)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(40, 392)
  ctx.lineTo(BREITE - 40, 392)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '56px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
  const randDinge = [
    ...garden.decor.map((d) => dekoById(d.decorId)?.emoji ?? ''),
    ...garden.visitors.slice(0, 6).map((v) => ({ schmetterling: '🦋', biene: '🐝', vogel: '🐦', igel: '🦔', frosch: '🐸', eichhoernchen: '🐿️', marienkaefer: '🐞', hase: '🐰' })[v] ?? ''),
  ].filter(Boolean)
  randDinge.forEach((e, i) => {
    const x = 120 + (i * (BREITE - 240)) / Math.max(1, randDinge.length - 1 || 1)
    ctx.fillText(e, randDinge.length === 1 ? BREITE / 2 : x, 386)
  })

  // Beete in Reihen
  const spalten = garden.bedCount <= 6 ? 3 : 4
  const reihen = Math.ceil(garden.bedCount / spalten)
  const beetB = Math.min(240, (BREITE - 120) / spalten)
  const beetH = Math.min(200, (HOEHE - 470) / reihen)
  for (let slot = 0; slot < garden.bedCount; slot++) {
    const spalte = slot % spalten
    const reihe = Math.floor(slot / spalten)
    const x = 60 + spalte * ((BREITE - 120) / spalten) + (BREITE - 120) / spalten / 2
    const y = 470 + reihe * beetH + beetH * 0.9
    // Erde
    ctx.fillStyle = dunkel ? '#5B4632' : '#A5784F'
    ctx.beginPath()
    ctx.ellipse(x, y, beetB * 0.42, 22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#2E4034'
    ctx.lineWidth = 3
    ctx.stroke()

    const bed = garden.beds.find((b) => b.slot === slot)
    const art = bed ? pflanzeById(bed.speciesId) : undefined
    if (bed && art) {
      const groesse = Math.min(beetB * 0.7, beetH * 0.95)
      try {
        const img = await svgAlsBild(pflanzeSvg({ form: art.form, growth: bed.growth, welk: welke(bed), farbe: art.farbe }, groesse))
        ctx.drawImage(img, x - groesse / 2, y + 6 - groesse * 1.2 * 0.88, groesse, groesse * 1.2)
      } catch {
        ctx.font = `${Math.round(groesse * 0.5)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
        ctx.fillText(art.emoji, x, y - 10)
      }
    }
  }

  // Titel
  ctx.font = '600 46px Fredoka, Trebuchet MS, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = dunkel ? '#F2F7EC' : '#2E4034'
  ctx.fillText(`${nickname}s Garten`, 48, 78)
  ctx.font = '400 24px Nunito, sans-serif'
  ctx.fillText(
    `${garden.beds.length} Pflanzen · ${garden.harvestsTotal} ${garden.harvestsTotal === 1 ? 'Ernte' : 'Ernten'}`,
    48,
    112,
  )
}

/** Erzeugt das PNG und stößt den Download an. */
export async function exportiereGartenBild(garden: Garden, nickname: string, zeit: Tageszeit): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = BREITE
  canvas.height = HOEHE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')

  await zeichneGarten(ctx, garden, nickname, zeit)

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('Bild konnte nicht erzeugt werden')

  const dateiname = `${nickname.toLowerCase().replace(/[^a-zäöüß0-9]+/g, '-')}s-garten.png`
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
