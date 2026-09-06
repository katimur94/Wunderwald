/**
 * Zeichnet eine Pflanze als SVG-Text — abhängig von Wachstum und Durst.
 *
 * Warum ein String und kein React-Baum: Dieselbe Zeichnung braucht der
 * Garten-Screen (als Inline-SVG) und der Bild-Export (als Image im Canvas).
 * Ein String kann beides, ohne dass die Formen zweimal existieren.
 *
 * Koordinaten: 100 breit, 120 hoch, der Boden liegt bei y = 106.
 */

import type { PflanzenForm } from './arten'

const BODEN = 106
const MITTE = 50

/* ------------------------------------------------------------------ */
/* Farben                                                              */
/* ------------------------------------------------------------------ */

function hex(n: number): string {
  return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
}

/** Mischt zwei Hex-Farben; t = 0 ergibt a, t = 1 ergibt b. */
export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `#${pa.map((v, i) => hex(v + (pb[i] - v) * t)).join('')}`
}

const GRUEN = '#6FA85A'
const GRUEN_DUNKEL = '#4C7B45'
const WELK = '#B9A36A'
const TINTE = '#2E4034'
const ERDE = '#8E6842'

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

const f = (n: number) => Math.round(n * 10) / 10

/** Ein Blatt, das vom Punkt (x, y) in Richtung `winkel` (0 = nach rechts, −90 = nach oben) zeigt. */
function blatt(x: number, y: number, laenge: number, winkel: number, farbe: string, breite = 0.38): string {
  const b = laenge * breite
  return `<path d="M0 0 Q${f(laenge / 2)} ${f(-b)} ${f(laenge)} 0 Q${f(laenge / 2)} ${f(b)} 0 0 Z" transform="translate(${f(x)} ${f(y)}) rotate(${f(winkel)})" fill="${farbe}" stroke="${TINTE}" stroke-width="1.6" stroke-linejoin="round"/>`
}

/** Stiel von (x, BODEN) nach oben; `biegung` schiebt die Spitze zur Seite. */
function stiel(x: number, hoehe: number, biegung: number, dicke: number, farbe: string, yBoden = BODEN): string {
  const spitzeX = x + biegung
  const spitzeY = yBoden - hoehe
  return `<path d="M${f(x)} ${f(yBoden)} Q${f(x + biegung * 0.2)} ${f(yBoden - hoehe * 0.6)} ${f(spitzeX)} ${f(spitzeY)}" fill="none" stroke="${farbe}" stroke-width="${f(dicke)}" stroke-linecap="round"/>`
}

/** Punkt an der Stielkurve bei Anteil t (0 = Boden, 1 = Spitze). */
function amStiel(x: number, hoehe: number, biegung: number, t: number, yBoden = BODEN): [number, number] {
  const cx = x + biegung * 0.2
  const cy = yBoden - hoehe * 0.6
  const ex = x + biegung
  const ey = yBoden - hoehe
  const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex
  const py = (1 - t) * (1 - t) * yBoden + 2 * (1 - t) * t * cy + t * t * ey
  return [px, py]
}

function kreis(x: number, y: number, r: number, farbe: string, strich = 1.6): string {
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${farbe}" stroke="${TINTE}" stroke-width="${strich}"/>`
}

function ellipse(x: number, y: number, rx: number, ry: number, farbe: string, rot = 0): string {
  return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(rot)} ${f(x)} ${f(y)})" fill="${farbe}" stroke="${TINTE}" stroke-width="1.6"/>`
}

/** Erdhügel mit einem Samen — der Anfang von allem. */
function samen(g: number): string {
  const s = 0.5 + Math.min(1, g / 0.06) * 0.5
  return `<ellipse cx="${MITTE}" cy="${BODEN}" rx="${f(14 * s)}" ry="${f(4 * s)}" fill="${ERDE}" stroke="${TINTE}" stroke-width="1.6"/>` +
    (g > 0.02 ? `<path d="M${MITTE} ${BODEN - 1} Q${MITTE} ${f(BODEN - 6 * s - 4)} ${f(MITTE + 3)} ${f(BODEN - 8 * s - 4)}" fill="none" stroke="${GRUEN_DUNKEL}" stroke-width="2" stroke-linecap="round"/>` : '')
}

/** Keimling mit zwei Keimblättern. */
function keimling(t: number, welk: number, gruen: string): string {
  const h = 6 + t * 10
  const droop = welk * 30
  return (
    stiel(MITTE, h, welk * 3, 2.2, GRUEN_DUNKEL) +
    blatt(MITTE, BODEN - h + 2, 7 + t * 4, -150 + droop, gruen) +
    blatt(MITTE, BODEN - h + 2, 7 + t * 4, -30 - droop, gruen)
  )
}

/** Verteilt Blätter am Stiel, abwechselnd links und rechts. */
function blaetterAmStiel(
  x: number,
  hoehe: number,
  biegung: number,
  anzahl: number,
  laenge: number,
  welk: number,
  gruen: string,
  von = 0.2,
  bis = 0.8,
): string {
  let out = ''
  for (let i = 0; i < anzahl; i++) {
    const t = von + (bis - von) * (anzahl === 1 ? 0.5 : i / (anzahl - 1))
    const [px, py] = amStiel(x, hoehe, biegung, t)
    const links = i % 2 === 0
    const basis = links ? -150 : -30
    const droop = welk * 40 * (links ? 1 : -1)
    out += blatt(px, py, laenge * (0.8 + 0.4 * (1 - t)), basis + droop, gruen)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Die Formen                                                          */
/* ------------------------------------------------------------------ */

interface Malen {
  g: number
  welk: number
  farbe: string
  gruen: string
  gruenDunkel: string
}

function tulpe({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  const h = 24 + t * 44
  const bieg = welk * 14
  let out = stiel(MITTE, h, bieg, 3, GRUEN_DUNKEL)
  out += blatt(MITTE - 1, BODEN - 4, 30 + t * 10, -110 + welk * 40, gruen, 0.28)
  out += blatt(MITTE + 1, BODEN - 2, 26 + t * 8, -70 - welk * 40, gruen, 0.28)
  const [kx, ky] = amStiel(MITTE, h, bieg, 1)
  if (g >= 0.55) {
    const s = Math.min(1, (g - 0.55) / 0.3)
    const auf = g >= 0.85 ? 1 : 0.4
    const b = 8 + 6 * s
    const hh = 12 + 8 * s
    const knospe = g < 0.85 ? mix(gruen, farbe, s) : farbe
    out += `<path d="M${f(kx - b)} ${f(ky)} Q${f(kx - b * 1.1)} ${f(ky - hh)} ${f(kx - b * 0.45 * auf)} ${f(ky - hh)} L${f(kx)} ${f(ky - hh * 0.55)} L${f(kx + b * 0.45 * auf)} ${f(ky - hh)} Q${f(kx + b * 1.1)} ${f(ky - hh)} ${f(kx + b)} ${f(ky)} Q${f(kx)} ${f(ky + 5)} ${f(kx - b)} ${f(ky)} Z" fill="${knospe}" stroke="${TINTE}" stroke-width="1.8" stroke-linejoin="round"/>`
    out += `<path d="M${f(kx)} ${f(ky + 2)} L${f(kx)} ${f(ky - hh * 0.5)}" stroke="${TINTE}" stroke-width="1.2" opacity="0.5"/>`
  }
  return out
}

function sonnenblume({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  const h = 28 + t * 52
  const bieg = welk * 18 + (g >= 0.85 ? 4 : 0)
  let out = stiel(MITTE, h, bieg, 3.6, GRUEN_DUNKEL)
  out += blaetterAmStiel(MITTE, h, bieg, 2 + Math.floor(t * 3), 18 + t * 6, welk, gruen, 0.25, 0.7)
  const [kx, ky] = amStiel(MITTE, h, bieg, 1)
  if (g >= 0.5) {
    const s = Math.min(1, (g - 0.5) / 0.35)
    const r = 5 + 8 * s
    if (g >= 0.85) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2
        out += ellipse(kx + Math.cos(a) * r * 1.15, ky + Math.sin(a) * r * 1.15, r * 0.55, r * 0.28, farbe, (a * 180) / Math.PI)
      }
      out += kreis(kx, ky, r * 0.72, '#8E6842', 1.8)
      out += kreis(kx, ky, r * 0.4, '#6B4A2E', 0)
    } else {
      out += kreis(kx, ky, r * 0.7, mix(gruen, farbe, s), 1.8)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3
        out += blatt(kx, ky, r * 0.8, (a * 180) / Math.PI, gruen, 0.5)
      }
    }
  }
  return out
}

function rose({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  const h = 20 + t * 40
  const bieg = welk * 12
  let out = stiel(MITTE, h, bieg, 2.8, GRUEN_DUNKEL)
  // Stacheln
  for (let i = 1; i <= 3; i++) {
    const [px, py] = amStiel(MITTE, h, bieg, i * 0.22)
    out += `<path d="M${f(px)} ${f(py)} l${i % 2 ? 4 : -4} -3" stroke="${TINTE}" stroke-width="1.4" stroke-linecap="round"/>`
  }
  out += blaetterAmStiel(MITTE, h, bieg, 2 + Math.floor(t * 2), 13 + t * 5, welk, gruen, 0.3, 0.7)
  const [kx, ky] = amStiel(MITTE, h, bieg, 1)
  if (g >= 0.5) {
    const s = Math.min(1, (g - 0.5) / 0.35)
    const r = 4 + 7 * s
    const col = g >= 0.85 ? farbe : mix(gruen, farbe, s * 0.7)
    out += kreis(kx, ky, r, col, 1.8)
    if (g >= 0.85) {
      out += `<path d="M${f(kx)} ${f(ky)} m-${f(r * 0.6)} 0 a${f(r * 0.6)} ${f(r * 0.6)} 0 1 1 ${f(r * 0.6)} ${f(r * 0.6)} a${f(r * 0.35)} ${f(r * 0.35)} 0 1 0 ${f(-r * 0.35)} ${f(-r * 0.35)}" fill="none" stroke="${TINTE}" stroke-width="1.2" opacity="0.6"/>`
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        out += ellipse(kx + Math.cos(a) * r * 0.9, ky + Math.sin(a) * r * 0.9, r * 0.55, r * 0.4, col, (a * 180) / Math.PI)
      }
      out += kreis(kx, ky, r * 0.45, mix(col, '#FFFFFF', 0.25), 1.2)
    }
  }
  return out
}

function lavendel({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  let out = ''
  const n = 3 + Math.floor(t * 2)
  for (let i = 0; i < n; i++) {
    const x = MITTE + (i - (n - 1) / 2) * 9
    const h = 22 + t * 30 + (i % 2) * 6
    const bieg = (i - (n - 1) / 2) * 4 + welk * 10
    out += stiel(x, h, bieg, 2, GRUEN_DUNKEL)
    out += blatt(x, BODEN - 6, 9 + t * 3, i % 2 ? -40 - welk * 30 : -140 + welk * 30, mix(gruen, '#9BB59A', 0.5), 0.25)
    if (g >= 0.5) {
      const s = Math.min(1, (g - 0.5) / 0.35)
      const col = g >= 0.85 ? farbe : mix(gruen, farbe, s)
      for (let k = 0; k < 4 + Math.floor(s * 3); k++) {
        const [px, py] = amStiel(x, h, bieg, 1 - k * 0.07)
        out += kreis(px + (k % 2 ? 2 : -2), py, 2.2 + s * 0.8, col, 1)
      }
    }
  }
  return out
}

function moehre({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  let out = ''
  // Wurzel guckt heraus, wenn sie dick genug ist
  if (g >= 0.6) {
    const s = Math.min(1, (g - 0.6) / 0.4)
    out += `<path d="M${f(MITTE - 6 * s)} ${BODEN - 4 * s} Q${MITTE} ${BODEN - 7 * s} ${f(MITTE + 6 * s)} ${BODEN - 4 * s} L${f(MITTE + 6 * s)} ${BODEN + 2} L${f(MITTE - 6 * s)} ${BODEN + 2} Z" fill="${farbe}" stroke="${TINTE}" stroke-width="1.6" stroke-linejoin="round"/>`
  }
  out += `<ellipse cx="${MITTE}" cy="${BODEN + 1}" rx="16" ry="4" fill="${ERDE}" stroke="${TINTE}" stroke-width="1.4"/>`
  const n = 3 + Math.floor(t * 4)
  for (let i = 0; i < n; i++) {
    const a = -90 + (i - (n - 1) / 2) * 22 + (i % 2 ? welk * 25 : -welk * 25)
    const l = 16 + t * 20 - Math.abs(i - (n - 1) / 2) * 3
    const x = MITTE + (i - (n - 1) / 2) * 3
    out += `<path d="M${f(x)} ${BODEN - 2} l${f(Math.cos((a * Math.PI) / 180) * l)} ${f(Math.sin((a * Math.PI) / 180) * l)}" stroke="${GRUEN_DUNKEL}" stroke-width="2" stroke-linecap="round"/>`
    for (let k = 1; k <= 3; k++) {
      const px = x + Math.cos((a * Math.PI) / 180) * l * (k / 3.5)
      const py = BODEN - 2 + Math.sin((a * Math.PI) / 180) * l * (k / 3.5)
      out += blatt(px, py, 5 + t * 3, a + (k % 2 ? 50 : -50), gruen, 0.5)
    }
  }
  return out
}

function radieschen({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  let out = ''
  if (g >= 0.5) {
    const s = Math.min(1, (g - 0.5) / 0.5)
    out += kreis(MITTE, BODEN - 3 * s, 4 + 6 * s, farbe, 1.6)
  }
  out += `<ellipse cx="${MITTE}" cy="${BODEN + 1}" rx="15" ry="4" fill="${ERDE}" stroke="${TINTE}" stroke-width="1.4"/>`
  const n = 3 + Math.floor(t * 3)
  for (let i = 0; i < n; i++) {
    const links = i % 2 === 0
    const a = -90 + (i - (n - 1) / 2) * 26 + (links ? welk * 35 : -welk * 35)
    out += blatt(MITTE, BODEN - 8 * Math.min(1, g / 0.5), 18 + t * 12, a, gruen, 0.42)
  }
  return out
}

function salat({ g, welk, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  let out = `<ellipse cx="${MITTE}" cy="${BODEN + 1}" rx="17" ry="4" fill="${ERDE}" stroke="${TINTE}" stroke-width="1.4"/>`
  const schichten = 2 + Math.floor(t * 3)
  for (let s = schichten; s >= 1; s--) {
    const r = 6 + s * (4 + t * 3)
    const n = 5 + s
    for (let i = 0; i < n; i++) {
      const a = -90 + (i - (n - 1) / 2) * (170 / n)
      const droop = welk * 30 * (Math.cos((a * Math.PI) / 180) > 0 ? -1 : 1)
      const col = mix(gruen, s === 1 ? '#C9E29B' : gruen, 0.5)
      out += blatt(MITTE, BODEN - 4, r, a + droop, col, 0.55)
    }
  }
  return out
}

function tomate({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  const h = 26 + t * 44
  const bieg = welk * 12
  let out = `<path d="M${MITTE + 8} ${BODEN} L${MITTE + 8} ${f(BODEN - h - 6)}" stroke="${ERDE}" stroke-width="2.4" stroke-linecap="round"/>`
  out += stiel(MITTE, h, bieg, 3, GRUEN_DUNKEL)
  out += blaetterAmStiel(MITTE, h, bieg, 3 + Math.floor(t * 3), 14 + t * 5, welk, gruen, 0.2, 0.9)
  if (g >= 0.55) {
    const s = Math.min(1, (g - 0.55) / 0.45)
    const reif = g >= 0.85
    const col = reif ? farbe : mix('#9CC27A', farbe, Math.max(0, (g - 0.7) / 0.15))
    for (let i = 0; i < 3; i++) {
      const [px, py] = amStiel(MITTE, h, bieg, 0.45 + i * 0.2)
      const r = 3 + 4 * s
      out += kreis(px + (i % 2 ? 7 : -7), py + 4, r, col, 1.6)
      out += `<path d="M${f(px + (i % 2 ? 7 : -7) - 2)} ${f(py + 4 - r)} l2 -2 l2 2" fill="none" stroke="${GRUEN_DUNKEL}" stroke-width="1.4"/>`
    }
  }
  return out
}

function erdbeere({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  let out = `<ellipse cx="${MITTE}" cy="${BODEN + 1}" rx="18" ry="4" fill="${ERDE}" stroke="${TINTE}" stroke-width="1.4"/>`
  const n = 3 + Math.floor(t * 3)
  for (let i = 0; i < n; i++) {
    const a = -90 + (i - (n - 1) / 2) * 28
    const droop = welk * 30 * (Math.cos((a * Math.PI) / 180) > 0 ? -1 : 1)
    const l = 14 + t * 8
    const [ex, ey] = [MITTE + Math.cos(((a + droop) * Math.PI) / 180) * l, BODEN - 4 + Math.sin(((a + droop) * Math.PI) / 180) * l]
    out += `<path d="M${MITTE} ${BODEN - 4} L${f(ex)} ${f(ey)}" stroke="${GRUEN_DUNKEL}" stroke-width="1.8"/>`
    for (let k = -1; k <= 1; k++) out += blatt(ex, ey, 7 + t * 2, a + droop + k * 45, gruen, 0.6)
  }
  if (g >= 0.55 && g < 0.85) {
    for (let i = 0; i < 2; i++) {
      const x = MITTE + (i ? 10 : -10)
      const y = BODEN - 18 - t * 6
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2
        out += kreis(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2, '#FBFDF8', 1)
      }
      out += kreis(x, y, 1.6, '#F6BD41', 0.8)
    }
  }
  if (g >= 0.85) {
    for (let i = 0; i < 3; i++) {
      const x = MITTE + (i - 1) * 13
      const y = BODEN - 6 - (i % 2) * 4
      out += `<path d="M${f(x - 5)} ${f(y - 4)} Q${f(x - 6)} ${f(y + 5)} ${f(x)} ${f(y + 8)} Q${f(x + 6)} ${f(y + 5)} ${f(x + 5)} ${f(y - 4)} Z" fill="${farbe}" stroke="${TINTE}" stroke-width="1.6" stroke-linejoin="round"/>`
      out += `<path d="M${f(x - 4)} ${f(y - 4)} l4 -3 l4 3" fill="${gruen}" stroke="${TINTE}" stroke-width="1.2"/>`
      out += `<circle cx="${f(x - 1.5)}" cy="${f(y + 1)}" r="0.7" fill="#FFF0CB"/><circle cx="${f(x + 2)}" cy="${f(y + 3)}" r="0.7" fill="#FFF0CB"/>`
    }
  }
  return out
}

function kuerbis({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  let out = `<path d="M${MITTE - 26} ${BODEN} Q${MITTE - 10} ${BODEN - 14 - t * 8} ${MITTE + 6} ${BODEN - 4} Q${MITTE + 18} ${BODEN + 2} ${MITTE + 30} ${BODEN - 6}" fill="none" stroke="${GRUEN_DUNKEL}" stroke-width="2.4" stroke-linecap="round"/>`
  const n = 2 + Math.floor(t * 3)
  for (let i = 0; i < n; i++) {
    const x = MITTE - 22 + i * 12
    const y = BODEN - 6 - Math.sin(i) * 6
    out += blatt(x, y, 14 + t * 6, -100 + (i % 2 ? 30 : -30) + welk * 35 * (i % 2 ? 1 : -1), gruen, 0.7)
  }
  if (g >= 0.5) {
    const s = Math.min(1, (g - 0.5) / 0.5)
    const r = 5 + 13 * s
    const col = g >= 0.85 ? farbe : mix('#9CC27A', farbe, Math.max(0, (g - 0.65) / 0.2))
    const x = MITTE + 22
    const y = BODEN - r * 0.6
    out += `<ellipse cx="${x}" cy="${f(y)}" rx="${f(r)}" ry="${f(r * 0.72)}" fill="${col}" stroke="${TINTE}" stroke-width="1.8"/>`
    out += `<path d="M${f(x - r * 0.4)} ${f(y - r * 0.68)} Q${f(x - r * 0.5)} ${f(y)} ${f(x - r * 0.4)} ${f(y + r * 0.68)} M${f(x + r * 0.4)} ${f(y - r * 0.68)} Q${f(x + r * 0.5)} ${f(y)} ${f(x + r * 0.4)} ${f(y + r * 0.68)}" fill="none" stroke="${TINTE}" stroke-width="1.2" opacity="0.5"/>`
    out += `<path d="M${x} ${f(y - r * 0.72)} l-1 -5 l4 0 l-1 5 Z" fill="${GRUEN_DUNKEL}" stroke="${TINTE}" stroke-width="1.2"/>`
  }
  return out
}

function baum({ g, welk, farbe, gruen, gruenDunkel }: Malen, kirsche: boolean): string {
  const t = (g - 0.25) / 0.75
  const stammH = 20 + t * 34
  const kroneR = 10 + t * 18
  const bieg = welk * 6
  let out = `<path d="M${MITTE - 3} ${BODEN} L${f(MITTE - 3 + bieg)} ${f(BODEN - stammH)} L${f(MITTE + 3 + bieg)} ${f(BODEN - stammH)} L${MITTE + 3} ${BODEN} Z" fill="${ERDE}" stroke="${TINTE}" stroke-width="1.6" stroke-linejoin="round"/>`
  const kx = MITTE + bieg
  const ky = BODEN - stammH - kroneR * 0.6
  const kronenFarbe = mix(gruen, WELK, welk * 0.7)
  out += kreis(kx - kroneR * 0.55, ky + kroneR * 0.25, kroneR * 0.7, kronenFarbe, 1.8)
  out += kreis(kx + kroneR * 0.55, ky + kroneR * 0.25, kroneR * 0.7, kronenFarbe, 1.8)
  out += kreis(kx, ky - kroneR * 0.2, kroneR * 0.85, mix(kronenFarbe, gruenDunkel, 0.15), 1.8)
  if (g >= 0.5 && g < 0.85) {
    const s = Math.min(1, (g - 0.5) / 0.35)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4
      out += kreis(kx + Math.cos(a) * kroneR * 0.7, ky + Math.sin(a) * kroneR * 0.55, 2 + s, kirsche ? '#FBD9E6' : '#FBFDF8', 1)
    }
  }
  if (g >= 0.85) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.2
      const px = kx + Math.cos(a) * kroneR * 0.65
      const py = ky + Math.sin(a) * kroneR * 0.5
      if (kirsche) {
        out += kreis(px, py, 2.6, farbe, 1.2) + kreis(px + 4, py + 1, 2.6, farbe, 1.2)
        out += `<path d="M${f(px)} ${f(py - 2.6)} q2 -5 4 0" fill="none" stroke="${TINTE}" stroke-width="1"/>`
      } else {
        out += kreis(px, py, 3.4, farbe, 1.3)
      }
    }
  }
  return out
}

function kaktus({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  const h = 22 + t * 34
  const b = 7 + t * 3
  const col = mix(mix(gruen, '#4E9C6A', 0.5), WELK, welk * 0.5)
  let out = `<ellipse cx="${MITTE}" cy="${BODEN + 1}" rx="14" ry="4" fill="#D9B98C" stroke="${TINTE}" stroke-width="1.4"/>`
  out += `<rect x="${f(MITTE - b)}" y="${f(BODEN - h)}" width="${f(b * 2)}" height="${f(h)}" rx="${f(b)}" fill="${col}" stroke="${TINTE}" stroke-width="1.8"/>`
  if (t > 0.35) {
    const armH = 10 + (t - 0.35) * 20
    out += `<path d="M${f(MITTE - b)} ${f(BODEN - h * 0.5)} h-8 v-${f(armH)}" fill="none" stroke="${TINTE}" stroke-width="7.6" stroke-linecap="round" stroke-linejoin="round"/>`
    out += `<path d="M${f(MITTE - b)} ${f(BODEN - h * 0.5)} h-8 v-${f(armH)}" fill="none" stroke="${col}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`
  }
  if (t > 0.6) {
    const armH = 8 + (t - 0.6) * 24
    out += `<path d="M${f(MITTE + b)} ${f(BODEN - h * 0.62)} h8 v-${f(armH)}" fill="none" stroke="${TINTE}" stroke-width="7.6" stroke-linecap="round" stroke-linejoin="round"/>`
    out += `<path d="M${f(MITTE + b)} ${f(BODEN - h * 0.62)} h8 v-${f(armH)}" fill="none" stroke="${col}" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>`
  }
  for (let i = 0; i < 5; i++) {
    const y = BODEN - h * (0.15 + i * 0.17)
    out += `<path d="M${f(MITTE - b + 1)} ${f(y)} l-3 -1 M${f(MITTE + b - 1)} ${f(y)} l3 -1" stroke="${TINTE}" stroke-width="1"/>`
  }
  if (g >= 0.85) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      out += ellipse(MITTE + Math.cos(a) * 5, BODEN - h - 2 + Math.sin(a) * 3, 4, 2.2, farbe, (a * 180) / Math.PI)
    }
    out += kreis(MITTE, BODEN - h - 2, 2.4, '#F6BD41', 1)
  }
  return out
}

function mais({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  const h = 30 + t * 56
  const bieg = welk * 14
  let out = stiel(MITTE, h, bieg, 3.4, GRUEN_DUNKEL)
  const n = 3 + Math.floor(t * 3)
  for (let i = 0; i < n; i++) {
    const tt = 0.15 + (0.75 / n) * i
    const [px, py] = amStiel(MITTE, h, bieg, tt)
    const links = i % 2 === 0
    out += blatt(px, py, 22 + t * 8, (links ? -140 : -40) + welk * 35 * (links ? 1 : -1), gruen, 0.18)
  }
  if (g >= 0.6) {
    const s = Math.min(1, (g - 0.6) / 0.4)
    const [px, py] = amStiel(MITTE, h, bieg, 0.55)
    const col = g >= 0.85 ? farbe : mix(gruen, farbe, s * 0.5)
    out += `<ellipse cx="${f(px + 7)}" cy="${f(py)}" rx="${f(3 + 2 * s)}" ry="${f(8 + 5 * s)}" transform="rotate(-12 ${f(px + 7)} ${f(py)})" fill="${col}" stroke="${TINTE}" stroke-width="1.6"/>`
    out += blatt(px + 4, py + 8, 12 + s * 4, -80, gruen, 0.3)
    if (g >= 0.85) out += `<path d="M${f(px + 8)} ${f(py - 12)} q2 -4 4 -5 q-2 5 -3 6" fill="#D9B98C" stroke="${TINTE}" stroke-width="1"/>`
  }
  const [kx, ky] = amStiel(MITTE, h, bieg, 1)
  if (g >= 0.5) out += `<path d="M${f(kx)} ${f(ky)} l-5 -8 M${f(kx)} ${f(ky)} l0 -10 M${f(kx)} ${f(ky)} l5 -8" stroke="#D9B98C" stroke-width="1.6" stroke-linecap="round"/>`
  return out
}

function bohne({ g, welk, farbe, gruen }: Malen): string {
  const t = (g - 0.25) / 0.75
  const stangeH = 70
  let out = `<path d="M${MITTE + 10} ${BODEN} L${MITTE + 10} ${BODEN - stangeH}" stroke="${ERDE}" stroke-width="3" stroke-linecap="round"/>`
  const h = 20 + t * 48
  // Ranke windet sich um die Stange
  let d = `M${MITTE} ${BODEN}`
  const schritte = 12
  for (let i = 1; i <= schritte; i++) {
    const y = BODEN - (h * i) / schritte
    const x = MITTE + 10 + Math.sin(i * 1.1) * (7 + welk * 3)
    d += ` L${f(x)} ${f(y)}`
  }
  out += `<path d="${d}" fill="none" stroke="${GRUEN_DUNKEL}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`
  const n = 3 + Math.floor(t * 4)
  for (let i = 0; i < n; i++) {
    const y = BODEN - (h * (i + 1)) / (n + 1)
    const links = i % 2 === 0
    const x = MITTE + 10 + Math.sin(((i + 1) * schritte * 1.1) / (n + 1)) * 7
    for (let k = -1; k <= 1; k++) out += blatt(x, y, 8 + t * 3, (links ? -160 : -20) + k * 30 + welk * 30 * (links ? 1 : -1), gruen, 0.55)
  }
  if (g >= 0.7) {
    const s = Math.min(1, (g - 0.7) / 0.3)
    const col = g >= 0.85 ? farbe : mix(gruen, farbe, s)
    for (let i = 0; i < 3; i++) {
      const y = BODEN - h * (0.35 + i * 0.2)
      const x = MITTE + 10 + (i % 2 ? 9 : -9)
      out += `<path d="M${f(x)} ${f(y)} q${i % 2 ? 4 : -4} ${f(6 + s * 6)} ${i % 2 ? 2 : -2} ${f(12 + s * 6)}" fill="none" stroke="${TINTE}" stroke-width="5" stroke-linecap="round"/>`
      out += `<path d="M${f(x)} ${f(y)} q${i % 2 ? 4 : -4} ${f(6 + s * 6)} ${i % 2 ? 2 : -2} ${f(12 + s * 6)}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round"/>`
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Öffentlich                                                          */
/* ------------------------------------------------------------------ */

export interface PflanzenBild {
  form: PflanzenForm
  /** 0 … 1 */
  growth: number
  /** 0 … 1: hängende Blätter, fahle Farbe */
  welk: number
  farbe: string
}

/** Das Innere des SVG — ohne <svg>-Hülle, damit Wrapper frei wählbar sind. */
export function pflanzeInnen({ form, growth, welk, farbe }: PflanzenBild): string {
  const g = Math.max(0, Math.min(1, growth))
  const w = Math.max(0, Math.min(1, welk))
  if (g < 0.06) return samen(g)
  const gruen = mix(GRUEN, WELK, w * 0.75)
  const gruenDunkel = mix(GRUEN_DUNKEL, WELK, w * 0.5)
  if (g < 0.25) return keimling((g - 0.06) / 0.19, w, gruen)
  const m: Malen = { g, welk: w, farbe, gruen, gruenDunkel }
  switch (form) {
    case 'tulpe':
      return tulpe(m)
    case 'sonnenblume':
      return sonnenblume(m)
    case 'rose':
      return rose(m)
    case 'lavendel':
      return lavendel(m)
    case 'moehre':
      return moehre(m)
    case 'radieschen':
      return radieschen(m)
    case 'salat':
      return salat(m)
    case 'tomate':
      return tomate(m)
    case 'erdbeere':
      return erdbeere(m)
    case 'kuerbis':
      return kuerbis(m)
    case 'apfelbaum':
      return baum(m, false)
    case 'kirschbaum':
      return baum(m, true)
    case 'kaktus':
      return kaktus(m)
    case 'mais':
      return mais(m)
    case 'bohne':
      return bohne(m)
  }
}

/** Komplettes SVG — für den Bild-Export und für Tests. */
export function pflanzeSvg(bild: PflanzenBild, groesse = 100): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="${groesse}" height="${Math.round(groesse * 1.2)}">${pflanzeInnen(bild)}</svg>`
}
