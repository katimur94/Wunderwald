/**
 * Pseudo-3D-Renderer der Flitzer-Rallye (Canvas 2D).
 *
 * Klassische Straßenprojektion wie in Rennspielen der Achtziger: Die Strecke
 * ist eine Liste von Stücken mit Krümmung und Höhe; jedes Stück wird aus der
 * Kamerasicht auf den Schirm projiziert und von hinten nach vorn gemalt.
 * Keine WebGL-Abhängigkeit, keine Bibliothek — läuft auf jedem Tablet, das
 * ein Canvas kann, und braucht keine Assets: Bäume, Autos und Tore werden
 * gezeichnet, Tiere und Blumen sind System-Emojis.
 */

import {
  CAM_H,
  DRAW_DIST,
  ROAD_W,
  SEG_LEN,
  SPUREN,
  hoeheAt,
  type Funke,
  type Gegner,
  type Segment,
  type SpriteArt,
} from './rallye'

export interface TorAnzeige {
  z: number
  optionen: string[]
  antwortIdx: number
  /** Lösung leuchten lassen (nach dem zweiten Fehler) */
  zeigeLoesung: boolean
  /** Option, die gerade falsch durchfahren wurde (wackelt) */
  falschIdx: number | null
}

export interface RenderState {
  segments: Segment[]
  /** Position des Autos auf der Strecke */
  z: number
  /** Querposition −1 … 1 */
  x: number
  /** Aktuelles Tempo, für Streifen und Neigung */
  speed: number
  maxSpeed: number
  tor: TorAnzeige | null
  zielZ: number | null
  gegner: Gegner[]
  funken: Funke[]
  /** 0 … 1: Turbo-Stärke */
  boost: number
  /** 0 … 1: Schlamm nach falscher Antwort */
  schlamm: number
  /** Laufende Zeit in Sekunden — für Räder, Wolken, Funkeln */
  t: number
  fahrer: { emoji: string; farbe: string }
  /** Lenkeinschlag −1 … 1 */
  lenk: number
  /** Hintergrundversatz durch Kurven */
  himmelX: number
}

/* ------------------------------------------------------------------ */
/* Farben — die Wunderwald-Palette                                     */
/* ------------------------------------------------------------------ */

const FARBE = {
  himmelOben: '#BEE3F5',
  himmelUnten: '#EAF6F0',
  bergFern: '#BFD9AE',
  bergNah: '#A9CE96',
  grasHell: '#8FC479',
  grasDunkel: '#7FB069',
  strasseHell: '#8A8B8F',
  strasseDunkel: '#7F8084',
  randHell: '#FBFDF8',
  randDunkel: '#E4634F',
  linie: '#FBFDF8',
  tinte: '#2E4034',
  sonne: '#F6BD41',
  ziel1: '#2E4034',
  ziel2: '#FBFDF8',
}

const TOR_FARBEN = ['#E4634F', '#F6BD41', '#6FB5C9']

/* ------------------------------------------------------------------ */
/* Projektion                                                          */
/* ------------------------------------------------------------------ */

interface Punkt {
  x: number
  y: number
  w: number
  scale: number
}

const camDepth = 1 / Math.tan((100 / 2) * (Math.PI / 180))

function projiziere(
  weltX: number,
  weltY: number,
  weltZ: number,
  camX: number,
  camY: number,
  camZ: number,
  breite: number,
  hoehe: number,
): Punkt {
  const cz = Math.max(1, weltZ - camZ)
  const scale = camDepth / cz
  return {
    x: breite / 2 + scale * (weltX - camX) * (breite / 2),
    y: hoehe / 2 - scale * (weltY - camY) * (hoehe / 2),
    w: scale * ROAD_W * (breite / 2),
    scale,
  }
}

function rundeEcke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

/* ------------------------------------------------------------------ */
/* Hintergrund                                                         */
/* ------------------------------------------------------------------ */

function maleHimmel(ctx: CanvasRenderingContext2D, w: number, h: number, horizont: number, st: RenderState) {
  const g = ctx.createLinearGradient(0, 0, 0, horizont)
  g.addColorStop(0, FARBE.himmelOben)
  g.addColorStop(1, FARBE.himmelUnten)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // Sonne
  ctx.fillStyle = FARBE.sonne
  ctx.beginPath()
  ctx.arc(w * 0.78 - st.himmelX * 0.05, horizont * 0.32, Math.max(18, w * 0.05), 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(246, 189, 65, 0.25)'
  ctx.beginPath()
  ctx.arc(w * 0.78 - st.himmelX * 0.05, horizont * 0.32, Math.max(28, w * 0.075), 0, Math.PI * 2)
  ctx.fill()

  // Wolken (laufen langsam)
  ctx.fillStyle = 'rgba(251, 253, 248, 0.9)'
  const wolken = [
    [0.12, 0.2, 1.0],
    [0.5, 0.14, 0.8],
    [0.85, 0.26, 0.7],
  ]
  for (const [wx, wy, ws] of wolken) {
    const cx = ((wx * w + st.t * 8 - st.himmelX * 0.12) % (w + 160) + (w + 160)) % (w + 160) - 80
    const cy = horizont * wy
    const r = Math.max(10, w * 0.03) * ws
    ctx.beginPath()
    ctx.ellipse(cx, cy, r * 2.4, r * 0.9, 0, 0, Math.PI * 2)
    ctx.ellipse(cx - r * 0.9, cy + r * 0.1, r * 1.1, r * 0.8, 0, 0, Math.PI * 2)
    ctx.ellipse(cx + r * 0.9, cy - r * 0.05, r * 1.3, r * 0.95, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Zwei Hügelketten mit Parallaxe
  const kette = (farbe: string, faktor: number, amp: number, freq: number, basis: number) => {
    ctx.fillStyle = farbe
    ctx.beginPath()
    ctx.moveTo(0, h)
    const schritte = 24
    for (let i = 0; i <= schritte; i++) {
      const px = (i / schritte) * w
      const phase = (px + st.himmelX * faktor) / w
      const py = horizont - basis - Math.abs(Math.sin(phase * freq * Math.PI) * amp) - Math.sin(phase * 7) * amp * 0.2
      ctx.lineTo(px, py)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
  }
  kette(FARBE.bergFern, 0.35, horizont * 0.22, 1.6, horizont * 0.02)
  kette(FARBE.bergNah, 0.7, horizont * 0.13, 2.4, -horizont * 0.02)
}

/* ------------------------------------------------------------------ */
/* Sprites am Straßenrand                                              */
/* ------------------------------------------------------------------ */

const EMOJI_SPRITES: Partial<Record<SpriteArt, string>> = {
  blume: '🌷',
  pilz: '🍄',
  hase: '🐰',
  reh: '🦌',
}

function maleSprite(
  ctx: CanvasRenderingContext2D,
  art: SpriteArt,
  x: number,
  y: number,
  scale: number,
  clip: number,
  breite: number,
) {
  // Grundgröße in Weltmaßen: Bäume ~1.6 Straßenbreiten hoch
  const einheit = scale * (breite / 2) * ROAD_W
  if (einheit < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, breite, clip)
  ctx.clip()

  const emoji = EMOJI_SPRITES[art]
  if (emoji) {
    const groesse = einheit * (art === 'reh' ? 0.75 : art === 'hase' ? 0.45 : 0.4)
    if (groesse < 6) {
      ctx.restore()
      return
    }
    ctx.font = `${groesse}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(emoji, x, y)
    ctx.restore()
    return
  }

  ctx.lineWidth = Math.max(1, einheit * 0.012)
  ctx.strokeStyle = FARBE.tinte
  if (art === 'baum') {
    const stamm = einheit * 0.5
    ctx.fillStyle = '#B98A5E'
    ctx.fillRect(x - stamm * 0.12, y - stamm, stamm * 0.24, stamm)
    ctx.fillStyle = '#5F9A57'
    ctx.beginPath()
    ctx.arc(x, y - stamm * 1.35, einheit * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#7FB069'
    ctx.beginPath()
    ctx.arc(x - einheit * 0.12, y - stamm * 1.5, einheit * 0.24, 0, Math.PI * 2)
    ctx.fill()
  } else if (art === 'tanne') {
    const hoehe = einheit * 1.2
    ctx.fillStyle = '#B98A5E'
    ctx.fillRect(x - hoehe * 0.05, y - hoehe * 0.25, hoehe * 0.1, hoehe * 0.25)
    ctx.fillStyle = '#3C7E5D'
    for (let i = 0; i < 3; i++) {
      const b = hoehe * (0.5 - i * 0.12)
      const oben = y - hoehe * (0.5 + i * 0.25)
      ctx.beginPath()
      ctx.moveTo(x - b, oben + hoehe * 0.3)
      ctx.lineTo(x, oben)
      ctx.lineTo(x + b, oben + hoehe * 0.3)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  } else if (art === 'busch') {
    ctx.fillStyle = '#8CBB77'
    ctx.beginPath()
    ctx.ellipse(x, y - einheit * 0.18, einheit * 0.38, einheit * 0.2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (art === 'stein') {
    ctx.fillStyle = '#B8B6AE'
    ctx.beginPath()
    ctx.ellipse(x, y - einheit * 0.08, einheit * 0.2, einheit * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (art === 'zaun') {
    ctx.fillStyle = '#D9B98C'
    const breiteZ = einheit * 0.9
    const hoeheZ = einheit * 0.22
    ctx.fillRect(x - breiteZ / 2, y - hoeheZ * 0.7, breiteZ, hoeheZ * 0.12)
    for (let i = 0; i < 5; i++) {
      const px = x - breiteZ / 2 + (i / 4) * breiteZ
      ctx.fillRect(px - breiteZ * 0.02, y - hoeheZ, breiteZ * 0.04, hoeheZ)
    }
  } else if (art === 'schild') {
    const pfahl = einheit * 0.7
    ctx.fillStyle = '#B98A5E'
    ctx.fillRect(x - pfahl * 0.05, y - pfahl, pfahl * 0.1, pfahl)
    ctx.fillStyle = '#F6BD41'
    rundeEcke(ctx, x - pfahl * 0.35, y - pfahl * 1.25, pfahl * 0.7, pfahl * 0.4, pfahl * 0.08)
    ctx.fill()
    ctx.stroke()
  } else if (art === 'laterne') {
    const pfahl = einheit * 0.9
    ctx.fillStyle = FARBE.tinte
    ctx.fillRect(x - pfahl * 0.03, y - pfahl, pfahl * 0.06, pfahl)
    ctx.fillStyle = '#FFE9A8'
    ctx.beginPath()
    ctx.arc(x, y - pfahl, pfahl * 0.09, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Autos                                                               */
/* ------------------------------------------------------------------ */

/** Ein Kart von hinten. `b` ist die Breite auf dem Schirm. */
export function maleKart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  b: number,
  farbe: string,
  emoji: string,
  lenk: number,
  t: number,
  boost: number,
) {
  if (b < 4) return
  const h = b * 0.62
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(lenk * 0.06)
  ctx.lineWidth = Math.max(1, b * 0.035)
  ctx.strokeStyle = FARBE.tinte
  ctx.lineJoin = 'round'

  // Turbo-Flammen
  if (boost > 0) {
    const flacker = 0.8 + Math.sin(t * 40) * 0.2
    ctx.fillStyle = '#F6BD41'
    ctx.beginPath()
    ctx.moveTo(-b * 0.18, -h * 0.1)
    ctx.lineTo(-b * 0.28, h * 0.2 + h * 0.45 * boost * flacker)
    ctx.lineTo(-b * 0.08, -h * 0.05)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#E4634F'
    ctx.beginPath()
    ctx.moveTo(b * 0.18, -h * 0.1)
    ctx.lineTo(b * 0.28, h * 0.2 + h * 0.45 * boost * (1.2 - flacker))
    ctx.lineTo(b * 0.08, -h * 0.05)
    ctx.closePath()
    ctx.fill()
  }

  // Schatten
  ctx.fillStyle = 'rgba(46, 64, 52, 0.22)'
  ctx.beginPath()
  ctx.ellipse(0, h * 0.02, b * 0.55, h * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hinterräder
  const radDreh = (t * 30) % (Math.PI * 2)
  const rad = (rx: number) => {
    ctx.fillStyle = FARBE.tinte
    rundeEcke(ctx, rx - b * 0.11, -h * 0.28, b * 0.22, h * 0.34, b * 0.05)
    ctx.fill()
    ctx.fillStyle = '#B8B6AE'
    const nabe = h * 0.06 * Math.abs(Math.cos(radDreh))
    ctx.fillRect(rx - b * 0.07, -h * 0.13 - nabe / 2, b * 0.14, Math.max(1, nabe))
  }
  rad(-b * 0.36)
  rad(b * 0.36)

  // Karosserie
  ctx.fillStyle = farbe
  rundeEcke(ctx, -b * 0.42, -h * 0.55, b * 0.84, h * 0.5, b * 0.1)
  ctx.fill()
  ctx.stroke()
  // Heckflügel
  ctx.fillStyle = '#FBFDF8'
  rundeEcke(ctx, -b * 0.4, -h * 0.62, b * 0.8, h * 0.12, b * 0.04)
  ctx.fill()
  ctx.stroke()
  // Nummernfeld
  ctx.fillStyle = '#FBFDF8'
  ctx.beginPath()
  ctx.arc(0, -h * 0.3, b * 0.11, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Sitz und Fahrer
  ctx.fillStyle = FARBE.tinte
  rundeEcke(ctx, -b * 0.2, -h * 0.92, b * 0.4, h * 0.42, b * 0.08)
  ctx.fill()
  ctx.font = `${b * 0.34}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 0, -h * 0.78)
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Tore                                                                */
/* ------------------------------------------------------------------ */

function maleTor(
  ctx: CanvasRenderingContext2D,
  p: Punkt,
  tor: TorAnzeige,
  breite: number,
  clip: number,
  t: number,
) {
  const spurW = p.w * 0.66
  const hoehe = Math.max(4, p.w * 0.62)
  if (spurW < 3) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, breite, clip)
  ctx.clip()
  ctx.lineWidth = Math.max(1, p.w * 0.012)
  ctx.strokeStyle = FARBE.tinte
  ctx.lineJoin = 'round'

  tor.optionen.forEach((opt, i) => {
    const cx = p.x + SPUREN[i] * p.w
    const pfostenB = Math.max(1, spurW * 0.06)
    const richtig = tor.zeigeLoesung && i === tor.antwortIdx
    const falsch = tor.falschIdx === i
    const wackel = falsch ? Math.sin(t * 40) * spurW * 0.03 : 0
    const puls = richtig ? 1 + Math.sin(t * 6) * 0.05 : 1

    // Pfosten
    ctx.fillStyle = '#FBFDF8'
    ctx.fillRect(cx - spurW * 0.46, p.y - hoehe, pfostenB, hoehe)
    ctx.fillRect(cx + spurW * 0.46 - pfostenB, p.y - hoehe, pfostenB, hoehe)
    ctx.strokeRect(cx - spurW * 0.46, p.y - hoehe, pfostenB, hoehe)
    ctx.strokeRect(cx + spurW * 0.46 - pfostenB, p.y - hoehe, pfostenB, hoehe)

    // Banner
    const bannerH = hoehe * 0.5 * puls
    const bannerW = spurW * 0.94 * puls
    ctx.fillStyle = richtig ? '#7FB069' : TOR_FARBEN[i]
    rundeEcke(ctx, cx - bannerW / 2 + wackel, p.y - hoehe - bannerH * 0.15, bannerW, bannerH, bannerH * 0.25)
    ctx.fill()
    ctx.stroke()
    if (richtig) {
      ctx.strokeStyle = '#F6BD41'
      ctx.lineWidth = Math.max(2, p.w * 0.02)
      rundeEcke(ctx, cx - bannerW / 2 + wackel, p.y - hoehe - bannerH * 0.15, bannerW, bannerH, bannerH * 0.25)
      ctx.stroke()
      ctx.strokeStyle = FARBE.tinte
      ctx.lineWidth = Math.max(1, p.w * 0.012)
    }

    // Beschriftung
    const laenge = [...opt].length
    const schrift = Math.min(bannerH * 0.62, (bannerW * 0.88) / Math.max(1, laenge * 0.58))
    if (schrift >= 5) {
      ctx.fillStyle = i === 2 && !richtig ? FARBE.tinte : FARBE.tinte
      ctx.font = `600 ${schrift}px Fredoka, "Trebuchet MS", system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(opt, cx + wackel, p.y - hoehe - bannerH * 0.15 + bannerH / 2)
    }

    // Lösung: Pfeil auf die Straße
    if (richtig) {
      ctx.fillStyle = '#F6BD41'
      ctx.beginPath()
      ctx.moveTo(cx, p.y - hoehe * 0.15)
      ctx.lineTo(cx - spurW * 0.16, p.y - hoehe * 0.4)
      ctx.lineTo(cx + spurW * 0.16, p.y - hoehe * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  })
  ctx.restore()
}

function maleZiel(ctx: CanvasRenderingContext2D, p: Punkt, breite: number, clip: number) {
  if (p.w < 6) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, breite, clip)
  ctx.clip()
  const hoehe = p.w * 0.7
  const pfosten = Math.max(1, p.w * 0.035)
  ctx.fillStyle = FARBE.tinte
  ctx.fillRect(p.x - p.w - pfosten, p.y - hoehe, pfosten * 2, hoehe)
  ctx.fillRect(p.x + p.w - pfosten, p.y - hoehe, pfosten * 2, hoehe)
  // Karo-Banner
  const bannerH = hoehe * 0.28
  const felder = 14
  const fb = (p.w * 2) / felder
  const fh = bannerH / 2
  for (let i = 0; i < felder; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? FARBE.ziel1 : FARBE.ziel2
      ctx.fillRect(p.x - p.w + i * fb, p.y - hoehe + j * fh, fb + 0.5, fh + 0.5)
    }
  }
  ctx.lineWidth = Math.max(1, p.w * 0.012)
  ctx.strokeStyle = FARBE.tinte
  ctx.strokeRect(p.x - p.w, p.y - hoehe, p.w * 2, bannerH)
  // Karo-Streifen auf der Straße
  const streifenH = Math.max(2, p.w * 0.06)
  for (let i = 0; i < felder; i++) {
    ctx.fillStyle = i % 2 === 0 ? FARBE.ziel1 : FARBE.ziel2
    ctx.fillRect(p.x - p.w + i * fb, p.y - streifenH, fb + 0.5, streifenH)
  }
  ctx.restore()
}

function maleFunke(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, clip: number, breite: number) {
  if (r < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, breite, clip)
  ctx.clip()
  ctx.translate(x, y - r * 1.4 - Math.abs(Math.sin(t * 4)) * r * 0.4)
  ctx.rotate(t * 1.5)
  ctx.fillStyle = FARBE.sonne
  ctx.strokeStyle = FARBE.tinte
  ctx.lineWidth = Math.max(1, r * 0.12)
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const rr = i % 2 === 0 ? r : r * 0.45
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/* ------------------------------------------------------------------ */
/* Hauptbild                                                           */
/* ------------------------------------------------------------------ */

interface SpriteAuftrag {
  tiefe: number
  male: () => void
}

export function render(ctx: CanvasRenderingContext2D, breite: number, hoehe: number, st: RenderState) {
  const { segments } = st
  const n = segments.length
  const basisIdx = ((Math.floor(st.z / SEG_LEN) % n) + n) % n
  const basis = segments[basisIdx]
  const basisAnteil = (((st.z % SEG_LEN) + SEG_LEN) % SEG_LEN) / SEG_LEN
  const fahrerY = hoeheAt(segments, st.z)
  const camX = st.x * ROAD_W
  const camY = fahrerY + CAM_H
  const camZ = st.z - CAM_H * camDepth

  // Der Horizont liegt bei der Höhe, auf die eine flache Straße in der Ferne zuläuft.
  const horizont = hoehe / 2
  maleHimmel(ctx, breite, hoehe, horizont, st)

  let x = 0
  let dx = -(basis.curve * basisAnteil)
  let maxY = hoehe
  const auftraege: SpriteAuftrag[] = []
  const punkte: { p1: Punkt; p2: Punkt; clip: number; seg: Segment; z1: number }[] = []
  /*
   * Alle Positionen sind absolut (das Auto fährt Runde um Runde weiter),
   * die Strecke wiederholt sich: Der Anfang der aktuellen Runde plus der
   * Index des Stücks ergibt seine absolute Position — und Stücke hinter dem
   * Rundenende gehören schon zur nächsten Runde.
   */
  const rundeLaenge = n * SEG_LEN
  const rundeStart = Math.floor(st.z / rundeLaenge) * rundeLaenge

  for (let i = 0; i < DRAW_DIST; i++) {
    const idx = (basisIdx + i) % n
    const seg = segments[idx]
    const looped = idx < basisIdx ? rundeLaenge : 0
    const z1 = rundeStart + idx * SEG_LEN + looped
    const z2 = z1 + SEG_LEN
    // Kurven: die Straße wandert mit jedem Stück weiter zur Seite.
    const p1 = projiziere(x, seg.y1, z1, camX, camY, camZ, breite, hoehe)
    const p2 = projiziere(x + dx, seg.y2, z2, camX, camY, camZ, breite, hoehe)
    x += dx
    dx += seg.curve
    const clip = maxY

    if (z1 - camZ <= camDepth || p2.y >= p1.y || p2.y >= maxY) {
      punkte.push({ p1, p2, clip, seg, z1 })
      continue
    }

    // Gras
    const grasFarbe = Math.floor(idx / 3) % 2 === 0 ? FARBE.grasHell : FARBE.grasDunkel
    ctx.fillStyle = grasFarbe
    ctx.fillRect(0, p2.y, breite, p1.y - p2.y)

    // Straße mit Randstreifen und Mittellinie
    const strasse = Math.floor(idx / 3) % 2 === 0 ? FARBE.strasseHell : FARBE.strasseDunkel
    const rand = Math.floor(idx / 3) % 2 === 0 ? FARBE.randHell : FARBE.randDunkel
    const r1 = p1.w / 7
    const r2 = p2.w / 7
    ctx.fillStyle = rand
    ctx.beginPath()
    ctx.moveTo(p1.x - p1.w - r1, p1.y)
    ctx.lineTo(p1.x + p1.w + r1, p1.y)
    ctx.lineTo(p2.x + p2.w + r2, p2.y)
    ctx.lineTo(p2.x - p2.w - r2, p2.y)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = strasse
    ctx.beginPath()
    ctx.moveTo(p1.x - p1.w, p1.y)
    ctx.lineTo(p1.x + p1.w, p1.y)
    ctx.lineTo(p2.x + p2.w, p2.y)
    ctx.lineTo(p2.x - p2.w, p2.y)
    ctx.closePath()
    ctx.fill()
    if (Math.floor(idx / 3) % 2 === 0) {
      const l1 = p1.w / 32
      const l2 = p2.w / 32
      ctx.fillStyle = FARBE.linie
      for (const spur of [-1 / 3, 1 / 3]) {
        ctx.beginPath()
        ctx.moveTo(p1.x + spur * p1.w - l1, p1.y)
        ctx.lineTo(p1.x + spur * p1.w + l1, p1.y)
        ctx.lineTo(p2.x + spur * p2.w + l2, p2.y)
        ctx.lineTo(p2.x + spur * p2.w - l2, p2.y)
        ctx.closePath()
        ctx.fill()
      }
    }
    maxY = p2.y
    punkte.push({ p1, p2, clip, seg, z1 })
  }

  // Sprites von hinten nach vorn, nach ihrem Stück geclippt
  for (let i = punkte.length - 1; i >= 0; i--) {
    const { p1, p2, clip, seg, z1 } = punkte[i]
    if (p1.scale <= 0 || z1 - camZ <= camDepth) continue
    for (const sp of seg.sprites) {
      const sx = p1.x + p1.w * sp.offset
      auftraege.push({
        tiefe: i,
        male: () => maleSprite(ctx, sp.art, sx, p1.y, p1.scale, clip, breite),
      })
    }
    // Funken
    for (const f of st.funken) {
      if (f.weg) continue
      if (f.z >= z1 && f.z < z1 + SEG_LEN) {
        const anteil = (f.z - z1) / SEG_LEN
        const px = p1.x + (p2.x - p1.x) * anteil + f.x * (p1.w + (p2.w - p1.w) * anteil)
        const py = p1.y + (p2.y - p1.y) * anteil
        const pw = p1.w + (p2.w - p1.w) * anteil
        auftraege.push({ tiefe: i, male: () => maleFunke(ctx, px, py, pw * 0.09, st.t, clip, breite) })
      }
    }
    // Gegner
    for (const g of st.gegner) {
      const gz = st.z + g.vorsprung * SEG_LEN
      if (gz >= z1 && gz < z1 + SEG_LEN) {
        const anteil = (gz - z1) / SEG_LEN
        const px = p1.x + (p2.x - p1.x) * anteil + g.x * (p1.w + (p2.w - p1.w) * anteil)
        const py = p1.y + (p2.y - p1.y) * anteil
        const pw = p1.w + (p2.w - p1.w) * anteil
        auftraege.push({
          tiefe: i,
          male: () => {
            ctx.save()
            ctx.beginPath()
            ctx.rect(0, 0, breite, clip)
            ctx.clip()
            maleKart(ctx, px, py, pw * 0.5, g.farbe, g.emoji, 0, st.t + g.vorsprung, 0)
            ctx.restore()
          },
        })
      }
    }
    // Tor
    if (st.tor && st.tor.z >= z1 && st.tor.z < z1 + SEG_LEN) {
      const tor = st.tor
      auftraege.push({ tiefe: i, male: () => maleTor(ctx, p1, tor, breite, clip, st.t) })
    }
    // Ziel
    if (st.zielZ !== null && st.zielZ >= z1 && st.zielZ < z1 + SEG_LEN) {
      auftraege.push({ tiefe: i, male: () => maleZiel(ctx, p1, breite, clip) })
    }
  }
  // Weit entfernte zuerst (hoher Index), nahe zuletzt
  auftraege.sort((a, b) => b.tiefe - a.tiefe)
  for (const a of auftraege) a.male()

  // Das eigene Auto: unten in der Mitte, hüpft leicht mit dem Tempo
  const kartB = Math.min(breite * 0.34, hoehe * 0.42)
  const huepf = Math.sin(st.t * 22) * (st.speed / Math.max(1, st.maxSpeed)) * kartB * 0.012
  maleKart(ctx, breite / 2 + st.lenk * kartB * 0.05, hoehe - kartB * 0.12 + huepf, kartB, st.fahrer.farbe, st.fahrer.emoji, st.lenk, st.t, st.boost)

  // Turbo: Tempolinien am Rand
  if (st.boost > 0.05) {
    ctx.strokeStyle = `rgba(251, 253, 248, ${0.5 * st.boost})`
    ctx.lineWidth = 2
    for (let i = 0; i < 10; i++) {
      const y = ((i * 97 + st.t * 900) % hoehe)
      const seite = i % 2 === 0 ? 0 : breite
      const richtung = i % 2 === 0 ? 1 : -1
      ctx.beginPath()
      ctx.moveTo(seite, y)
      ctx.lineTo(seite + richtung * (breite * 0.1 + (i % 3) * 14), y - 8)
      ctx.stroke()
    }
  }

  // Schlamm nach falscher Antwort
  if (st.schlamm > 0.02) {
    ctx.fillStyle = `rgba(142, 104, 66, ${0.35 * st.schlamm})`
    for (let i = 0; i < 12; i++) {
      const px = ((i * 137) % breite)
      const py = hoehe * 0.5 + ((i * 71) % (hoehe * 0.5))
      ctx.beginPath()
      ctx.arc(px, py + (1 - st.schlamm) * 40, 10 + (i % 4) * 8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
