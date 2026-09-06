/**
 * Viewport-Wächter.
 *
 * Prüft auf einer Matrix echter Gerätegrößen dreierlei:
 *  1. Kein Spielinhalt rutscht unter die Kopfleiste oder das Funkel-Panel.
 *  2. Nirgends muss horizontal gescrollt werden.
 *  3. Ein Vollbild-Schirm ist genau so hoch wie der Viewport — seine festen
 *     Leisten stehen also nie unterhalb der Falz.
 *  4. Beete, Unkraut, Schnecken und Spur-Knoepfe bleiben gross genug zum Antippen.
 *  5. Hochkant muss die Spielflaeche nicht gescrollt werden, um an die
 *     Bedienung zu kommen.
 *
 * Voraussetzung (bewusst keine devDependency):
 *   npm i -D playwright
 *   npm run build && npx vite preview --port 4173
 *   npm run layout-guard
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4173/Wunderwald/'
const OUT = process.env.SHOTS || '/tmp/wunderwald-layout'
mkdirSync(OUT, { recursive: true })

const ALLE_VIEWPORTS = [
  { name: '360x560', width: 360, height: 560 },
  { name: '360x640', width: 360, height: 640 },
  { name: '390x780', width: 390, height: 780 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '740x360-quer', width: 740, height: 360 },
]
// VIEWPORTS=360x560,740x360-quer laesst nur einzelne Groessen laufen.
const VIEWPORTS = process.env.VIEWPORTS
  ? ALLE_VIEWPORTS.filter((v) => process.env.VIEWPORTS.split(',').includes(v.name))
  : ALLE_VIEWPORTS

const SPIELE = [
  'zahlen-ernte', 'rechen-bruecke', 'zahlen-waage', 'zahlen-sprung',
  'buchstaben-fang', 'wort-baukasten', 'reim-boot',
  'muster-weber', 'paar-finder', 'sortier-werkstatt',
  'flitzer-rallye', 'wissens-quiz', 'schatten-suche', 'zeit-turm', 'ballon-platzer',
  // Mix-Runden ziehen aus allen Spielen ihrer Welt
  'mix-zahlen', 'mix-buchstaben', 'mix-logik', 'mix-entdecker',
]

const befunde = []
function melde(viewport, screen, problem) {
  befunde.push({ viewport, screen, problem })
  console.log(`  ❌ ${viewport} · ${screen}: ${problem}`)
}

/**
 * Kernmessung: Überlappt sichtbarer Stage-Inhalt die festen Leisten?
 * Genau die Messung, mit der der Fehler auf dem Gerät gefunden wurde.
 */
async function pruefeUeberlappung(page) {
  return page.evaluate(() => {
    const probleme = []
    const bar = document.querySelector('.ww-gameshell__bar, .ww-garten__top, .ww-world__top')
    const panel = document.querySelector('.ww-gameshell__funkel, .ww-garten__foot')
    const stage = document.querySelector('.ww-gameshell__stage, .ww-garten__scene')
    if (!stage) return probleme

    const barR = bar?.getBoundingClientRect()
    const panelR = panel?.getBoundingClientRect()

    /*
     * Was das Kind sieht, ist nicht das Rechteck des Elements, sondern dessen
     * Schnitt mit allen scrollenden oder schneidenden Vorfahren. Ohne diesen
     * Schnitt meldet die Messung Inhalt als "unter der Leiste", der in
     * Wahrheit im Scrollbereich weggeschnitten ist.
     */
    const sichtbar = (el) => {
      const r = el.getBoundingClientRect()
      let top = r.top, bottom = r.bottom, left = r.left, right = r.right
      for (let p = el.parentElement; p; p = p.parentElement) {
        const cs = getComputedStyle(p)
        if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
        const pr = p.getBoundingClientRect()
        top = Math.max(top, pr.top); bottom = Math.min(bottom, pr.bottom)
        left = Math.max(left, pr.left); right = Math.min(right, pr.right)
      }
      top = Math.max(top, 0); left = Math.max(left, 0)
      bottom = Math.min(bottom, window.innerHeight); right = Math.min(right, window.innerWidth)
      return { top, bottom, left, right, width: right - left, height: bottom - top }
    }

    // Alle sichtbaren Blattelemente der Stage einsammeln
    const kandidaten = [...stage.querySelectorAll('*')].filter((el) => {
      if (el.children.length > 0) return false
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false
      const r = sichtbar(el)
      return r.width >= 2 && r.height >= 2
    })

    for (const el of kandidaten) {
      const r = sichtbar(el)
      const wer = el.className?.baseVal ?? el.className ?? el.tagName
      if (barR && r.top < barR.bottom - 1 && r.bottom > barR.top) {
        probleme.push(`"${String(wer).slice(0, 40)}" liegt ${Math.round(barR.bottom - r.top)}px unter der Kopfleiste`)
      }
      if (panelR && r.bottom > panelR.top + 1 && r.top < panelR.bottom) {
        probleme.push(`"${String(wer).slice(0, 40)}" ragt ${Math.round(r.bottom - panelR.top)}px in das untere Panel`)
      }
    }
    return [...new Set(probleme)].slice(0, 4)
  })
}

/**
 * Zweite Kernmessung: Ein Vollbild-Schirm ist genau so hoch wie der Viewport.
 * Ist er hoeher, steht seine Fussleiste unterhalb der Falz — auf dem Geraet
 * heisst das: Giesskanne und Kamera sind schlicht nicht erreichbar. Genau so
 * ist der Fehler im vollen Wald aufgefallen, den die Ueberlappungsmessung
 * nicht sehen konnte.
 */
async function pruefeVollbild(page) {
  return page.evaluate(() => {
    const probleme = []
    const schirm = document.querySelector('.ww-vollbild')
    if (!schirm) return probleme

    const vh = window.innerHeight
    const r = schirm.getBoundingClientRect()
    if (Math.round(r.height) > vh + 1) {
      probleme.push(`Vollbild-Schirm ${Math.round(r.height)}px hoch bei ${vh}px Viewport`)
    }
    if (document.documentElement.scrollHeight > vh + 1) {
      probleme.push(`Seite scrollt vertikal (${document.documentElement.scrollHeight} > ${vh})`)
    }
    // Jede feste Leiste muss vollstaendig sichtbar sein.
    for (const sel of ['.ww-gameshell__bar', '.ww-gameshell__funkel', '.ww-garten__top', '.ww-garten__foot']) {
      const el = schirm.querySelector(sel)
      if (!el) continue
      const b = el.getBoundingClientRect()
      if (b.bottom > vh + 1) probleme.push(`"${sel}" endet ${Math.round(b.bottom - vh)}px unter dem Bildrand`)
      if (b.top < -1) probleme.push(`"${sel}" beginnt ${Math.round(-b.top)}px ueber dem Bildrand`)
    }
    return [...new Set(probleme)].slice(0, 4)
  })
}

/**
 * Vierte Messung: Was das Kind bedienen muss, liegt im Bild.
 *
 * Die Spielflaeche darf scrollen — aber wenn der einzige Knopf oder der
 * Vorrat erst nach dem Scrollen auftaucht, sieht ein Vierjaehriger ein
 * Spiel ohne Bedienung. Geprueft wird deshalb, dass die Stage gar nicht
 * erst scrollen muss.
 *
 * Nur hochkant. Quer auf einem 360 px hohen Handy bleiben zwischen
 * Kopfleiste und Funkel-Ecke keine 190 px uebrig — dort ist Scrollen kein
 * Layoutfehler, sondern die einzige Moeglichkeit. Der Ueberlappungs- und
 * der Vollbild-Test decken diesen Fall weiterhin ab.
 */
async function pruefeBedienung(page) {
  return page.evaluate(() => {
    const probleme = []
    const stage = document.querySelector('.ww-gameshell__stage')
    if (!stage) return probleme
    if (window.innerWidth > window.innerHeight) return probleme
    if (stage.scrollHeight > stage.clientHeight + 2) {
      probleme.push(
        `Spielflaeche muss gescrollt werden (${stage.scrollHeight} > ${stage.clientHeight})`,
      )
    }
    return probleme
  })
}

/**
 * Dritte Messung: Beete bleiben antippbar. Wird der Garten groesser als
 * der Bildschirm, darf er scrollen — aber nicht so zusammenschrumpfen, dass
 * ein Kinderfinger die Tomate nicht mehr trifft. Auch Unkraut und Schnecke
 * muessen Kinderfinger-Groesse haben.
 */
async function pruefeTippziele(page) {
  return page.evaluate(() => {
    const probleme = []
    const min = 44
    for (const el of document.querySelectorAll('.ww-beet__knopf, .ww-beet__unkraut, .ww-beet__schnecke, .ww-rallye__spur, .ww-ballon__ballon, .ww-werkzeug')) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 && r.height < 1) continue
      if (r.width < min || r.height < min) {
        probleme.push(`"${el.className.split(' ')[0]}" nur ${Math.round(r.width)}x${Math.round(r.height)}px (min ${min})`)
      }
    }
    return [...new Set(probleme)].slice(0, 2)
  })
}

async function pruefeScreen(page, viewport, screen, hash, warten = 1400, screenshot = true) {
  await page.evaluate((h) => { location.hash = h }, hash)
  await page.waitForTimeout(warten)

  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  if (sw > iw + 1) melde(viewport, screen, `horizontales Scrollen (${sw} > ${iw})`)

  for (const p of await pruefeUeberlappung(page)) melde(viewport, screen, p)
  for (const p of await pruefeVollbild(page)) melde(viewport, screen, p)
  for (const p of await pruefeTippziele(page)) melde(viewport, screen, p)
  for (const p of await pruefeBedienung(page)) melde(viewport, screen, p)

  if (screenshot) {
    await page.screenshot({ path: `${OUT}/${viewport}-${screen.replace(/\W+/g, '-')}.png` })
  }
}

/** Legt Familie + zwei Kinder an: eines auf Startstufe, eines auf Stufe 9. */
async function seed(page) {
  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Willkommen im Wunderwald/ }).waitFor({ timeout: 20000 })
  await page.evaluate(async () => {
    const enc = new TextEncoder()
    const salt = new Uint8Array(16); crypto.getRandomValues(salt)
    const key = await crypto.subtle.importKey('raw', enc.encode('1234'), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
    const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

    const req = indexedDB.open('wunderwald')
    const db = await new Promise((r) => { req.onsuccess = () => r(req.result) })
    const tx = db.transaction(['family', 'children', 'progress'], 'readwrite')
    tx.objectStore('family').put({
      id: 'family', parentName: 'Guard', pinHash: hex(bits), pinSalt: hex(salt.buffer),
      recoveryHash: '', recoverySalt: '', createdAt: 1,
      settings: { ttsOn: false, soundOn: false, dailyLimitMin: 0, pinFails: 0, pinLockedUntil: 0, lastBackupAt: Date.now(), installHintDismissed: true },
    })
    const now = Date.now()
    const beet = (slot, speciesId, growth, water, extra = {}) => ({
      slot, speciesId, plantedAt: now - 86400000, growth, water, updatedAt: now,
      weeds: 0, snail: false, harvests: 0, ...extra,
    })
    // Kleiner Garten: sechs Beete, drei davon bepflanzt.
    const gartenKlein = {
      bedCount: 6, compost: 1, harvestsTotal: 0, visitors: ['schmetterling'], decor: [{ slot: 0, decorId: 'bank' }],
      beds: [beet(0, 'tulpe', 0.9, 80), beet(1, 'moehre', 0.4, 20, { weeds: 1 }), beet(2, 'sonnenblume', 0.15, 90)],
    }
    // Grosser Garten: zwoelf Beete voll, alle Deko, viele Besucher - der Stresstest fuers Layout.
    const arten = ['tulpe', 'moehre', 'radieschen', 'sonnenblume', 'salat', 'erdbeere', 'lavendel',
      'tomate', 'mais', 'bohne', 'rose', 'kuerbis']
    const gartenGross = {
      bedCount: 12, compost: 5, harvestsTotal: 20,
      visitors: ['schmetterling', 'biene', 'vogel', 'igel', 'frosch', 'eichhoernchen', 'marienkaefer', 'hase'],
      decor: ['vogelhaus', 'bank', 'teich', 'bienenstock', 'vogelscheuche', 'laterne', 'gartenzwerg', 'brunnen']
        .map((decorId, slot) => ({ slot, decorId })),
      beds: arten.map((a, i) => beet(i, a, i % 3 === 0 ? 1 : 0.3 + i * 0.05, i % 2 ? 15 : 85, { weeds: i % 4 === 0 ? 2 : 0, snail: i % 5 === 0 })),
    }

    for (const [id, name, level] of [['klein', 'Mia', 4], ['gross', 'Ben', 9]]) {
      const gross = id === 'gross'
      tx.objectStore('children').put({
        id, nickname: name, avatarId: 'hase', birthYear: 2019, createdAt: gross ? 2 : 1,
        stars: 60, starsTotal: 260, companion: { level: 5, xp: 0, outfitId: 'hut', ownedOutfits: [] },
        forest: [], inventory: [], milestones: [], wateredDays: [],
        forestDays: gross ? 12 : 3, lastVisitDay: '2020-01-01', toured: true,
        garden: gross ? gartenGross : gartenKlein,
      })
      for (const w of ['zahlen', 'buchstaben', 'logik', 'entdecker']) {
        tx.objectStore('progress').put({ childId: id, worldId: w, level, xp: 0, streak: 0, failStreak: 0, recentTimes: [] })
      }
    }
    await new Promise((r) => { tx.oncomplete = r })
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

for (const vp of VIEWPORTS) {
  console.log(`\n▸ ${vp.name}`)
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, locale: 'de-DE' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => melde(vp.name, 'seite', `JS-Fehler: ${String(e).slice(0, 90)}`))
  await seed(page)

  await pruefeScreen(page, vp.name, 'weltkarte', '#/kind/klein', 2000)
  for (const w of ['zahlen', 'buchstaben', 'logik', 'entdecker']) {
    await pruefeScreen(page, vp.name, `welt-${w}`, `#/kind/klein/welt/${w}`)
  }
  // Jedes Spiel auf niedriger UND hoher Stufe.
  // Zweimal, mit einem Neuladen dazwischen: Die Aufgabe wird zufaellig
  // gezogen, und drei Fruechte brauchen weniger Platz als zwanzig. Ein
  // einzelner Zug wuerde die grossen Faelle einfach verpassen.
  for (const kind of ['klein', 'gross']) {
    for (const g of SPIELE) {
      await pruefeScreen(page, vp.name, `${g}-${kind}`, `#/kind/${kind}/spiel/${g}`, 1800)
      await page.reload({ waitUntil: 'networkidle' })
      await pruefeScreen(page, vp.name, `${g}-${kind}`, `#/kind/${kind}/spiel/${g}`, 1600, false)
    }
  }
  await pruefeScreen(page, vp.name, 'gartenbuch', `#/kind/gross/waldbuch`, 1600)

  // Garten in beiden Ausbaustufen: sechs Beete und zwoelf volle Beete.
  await pruefeScreen(page, vp.name, 'mein-garten-klein', '#/kind/klein/wald', 1800)
  await pruefeScreen(page, vp.name, 'mein-garten-gross', '#/kind/gross/wald', 2200)
  // Laden mit beiden Reitern - das laengste scrollbare Blatt der App.
  await page.getByRole('button', { name: /Laden/ }).first().click().catch(() => {})
  await page.waitForTimeout(900)
  await pruefeScreen(page, vp.name, 'garten-laden-samen', '#/kind/gross/wald', 700)
  await page.getByRole('tab', { name: /Deko/ }).click().catch(() => {})
  await page.waitForTimeout(600)
  await pruefeScreen(page, vp.name, 'garten-laden-deko', '#/kind/gross/wald', 600)
  await page.getByRole('button', { name: /Schlie\u00dfen|Zur\u00fcck|Fertig/ }).first().click().catch(() => {})
  await page.waitForTimeout(700)

  // Aktionsblase an einem Beet: sie darf nicht aus dem Bild laufen.
  await page.locator('.ww-beet--voll .ww-beet__knopf').first().click({ force: true }).catch(() => {})
  await page.waitForTimeout(700)
  await pruefeScreen(page, vp.name, 'garten-aktionsblase', '#/kind/gross/wald', 600)

  // Elternbereich (hinter PIN)
  await page.evaluate(() => { location.hash = '#/eltern' })
  await page.waitForTimeout(1600)
  for (const d of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: d, exact: true }).click().catch(() => {})
  }
  await page.waitForTimeout(1600)
  await pruefeScreen(page, vp.name, 'eltern', '#/eltern', 1600)

  if (!befunde.some((b) => b.viewport === vp.name)) console.log('  ✅ alles im Rahmen')
  await ctx.close()
}

await browser.close()

console.log('\n' + '─'.repeat(60))
if (befunde.length === 0) {
  console.log('✅ Layout-Wächter: kein Screen überlappt eine Leiste, kein horizontales Scrollen.')
} else {
  console.log(`❌ ${befunde.length} Befund(e):`)
  befunde.forEach((b) => console.log(`   ${b.viewport} · ${b.screen}: ${b.problem}`))
  process.exitCode = 1
}
console.log(`Screenshots: ${OUT}`)
