/**
 * Viewport-Wächter.
 *
 * Prüft auf einer Matrix echter Gerätegrößen dreierlei:
 *  1. Kein Spielinhalt rutscht unter die Kopfleiste oder das Funkel-Panel.
 *  2. Nirgends muss horizontal gescrollt werden.
 *  3. Ein Vollbild-Schirm ist genau so hoch wie der Viewport — seine festen
 *     Leisten stehen also nie unterhalb der Falz.
 *  4. Waldplaetze bleiben gross genug zum Antippen.
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

const VIEWPORTS = [
  { name: '360x560', width: 360, height: 560 },
  { name: '360x640', width: 360, height: 640 },
  { name: '390x780', width: 390, height: 780 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '740x360-quer', width: 740, height: 360 },
]

const SPIELE = [
  'zahlen-ernte', 'rechen-bruecke', 'zahlen-waage',
  'buchstaben-fang', 'wort-baukasten', 'reim-boot',
  'muster-weber', 'paar-finder', 'sortier-werkstatt',
  // Mix-Runden ziehen aus allen Spielen ihrer Welt
  'mix-zahlen', 'mix-buchstaben', 'mix-logik',
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
    const bar = document.querySelector('.ww-gameshell__bar, .ww-forest__top, .ww-world__top')
    const panel = document.querySelector('.ww-gameshell__funkel, .ww-forest__foot')
    const stage = document.querySelector('.ww-gameshell__stage, .ww-forest__scene')
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
    for (const sel of ['.ww-gameshell__bar', '.ww-gameshell__funkel', '.ww-forest__top', '.ww-forest__foot']) {
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
 * Dritte Messung: Waldplaetze bleiben antippbar. Wird der Wald groesser als
 * der Bildschirm, darf er scrollen — aber nicht so zusammenschrumpfen, dass
 * ein Kinderfinger das Reh nicht mehr trifft.
 */
async function pruefeTippziele(page) {
  return page.evaluate(() => {
    const probleme = []
    const min = 40
    for (const el of document.querySelectorAll('.ww-slotcell--voll')) {
      const r = el.getBoundingClientRect()
      if (r.width < 1 && r.height < 1) continue
      if (r.width < min || r.height < min) {
        probleme.push(`Waldplatz nur ${Math.round(r.width)}x${Math.round(r.height)}px (min ${min})`)
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
    const pflanze = (slot, objectId) => ({
      slot, objectId, placedAt: 1, growthDays: 4, lastGrowthDay: '2020-01-01',
    })
    // Kleiner Wald: Lichtung plus gerade freigeschaltetes Bachufer.
    const waldKlein = Array.from({ length: 14 }, (_, i) =>
      pflanze(i, ['baum', 'blume', 'busch', 'tanne', 'pilzhaus', 'hase'][i % 6]))

    // Grosser Wald: alle drei Bereiche offen und fast voll - der Stresstest fuers Layout.
    const wiese = ['baum', 'blume', 'busch', 'tanne', 'pilzhaus', 'hase', 'bank', 'lagerfeuer',
      'laterne', 'sonnenblume', 'erdbeerbeet', 'vogelhaus', 'schaukel', 'bienenstock', 'igel',
      'reh', 'teich', 'schmetterlinge', 'regenbogen', 'baum', 'blume', 'busch', 'tanne', 'bank']
    const bach = ['seerose', 'teich', 'bruecke', 'ente', 'seerose', 'teich', 'bruecke', 'ente']
    const huegel = ['tanne', 'fuchsbau', 'eule', 'baum', 'blume', 'hase']
    const waldGross = [
      ...wiese.map((o, i) => pflanze(i, o)),
      ...bach.map((o, i) => pflanze(24 + i, o)),
      ...huegel.map((o, i) => pflanze(32 + i, o)),
    ]

    for (const [id, name, level] of [['klein', 'Mia', 4], ['gross', 'Ben', 9]]) {
      const gross = id === 'gross'
      tx.objectStore('children').put({
        id, nickname: name, avatarId: 'hase', birthYear: 2019, createdAt: gross ? 2 : 1,
        stars: 60, starsTotal: 260, companion: { level: 5, xp: 0, outfitId: 'hut', ownedOutfits: [] },
        forest: gross ? waldGross : waldKlein,
        inventory: gross ? [{ objectId: 'baum', growthDays: 4 }, { objectId: 'ente', growthDays: 0 }] : [],
        milestones: gross ? ['forest-10', 'forest-25', 'set-wasser'] : ['forest-10'],
        forestDays: gross ? 12 : 3, lastVisitDay: '2020-01-01', toured: true,
      })
      for (const w of ['zahlen', 'buchstaben', 'logik']) {
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
  for (const w of ['zahlen', 'buchstaben', 'logik']) {
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
  await pruefeScreen(page, vp.name, 'waldbuch', `#/kind/gross/waldbuch`, 1600)

  // Wald in beiden Ausbaustufen: eine Zone und alle drei Zonen fast voll.
  await pruefeScreen(page, vp.name, 'mein-wald-klein', '#/kind/klein/wald', 1800)
  await pruefeScreen(page, vp.name, 'mein-wald-gross', '#/kind/gross/wald', 2200)
  // Shop mit beiden Reitern - das laengste scrollbare Blatt der App.
  await page.getByRole('button', { name: /Pflanzen/ }).first().click().catch(() => {})
  await page.waitForTimeout(900)
  await pruefeScreen(page, vp.name, 'wald-shop-kaufen', '#/kind/gross/wald', 700)
  await page.getByRole('tab', { name: /Kiste/ }).click().catch(() => {})
  await page.waitForTimeout(600)
  await pruefeScreen(page, vp.name, 'wald-shop-kiste', '#/kind/gross/wald', 600)
  await page.getByRole('button', { name: /Schlie\u00dfen|Zur\u00fcck|Fertig/ }).first().click().catch(() => {})
  await page.waitForTimeout(700)

  // Aktionsblase an einem Objekt: sie darf nicht aus dem Bild laufen.
  await page.locator('.ww-slotcell--voll').first().click().catch(() => {})
  await page.waitForTimeout(700)
  await pruefeScreen(page, vp.name, 'wald-aktionsblase', '#/kind/gross/wald', 600)

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
