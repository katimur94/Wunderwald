/**
 * Viewport-Wächter.
 *
 * Prüft auf einer Matrix echter Gerätegrößen, dass auf KEINEM Screen
 * Spielinhalt unter die Kopfleiste oder das Funkel-Panel rutscht und dass
 * nirgends horizontal gescrollt werden muss.
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
  'zahlen-ernte', 'rechen-bruecke', 'buchstaben-fang',
  'wort-baukasten', 'muster-weber', 'paar-finder',
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

    // Alle sichtbaren Blattelemente der Stage einsammeln
    const kandidaten = [...stage.querySelectorAll('*')].filter((el) => {
      if (el.children.length > 0) return false
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) return false
      const cs = getComputedStyle(el)
      return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'
    })

    for (const el of kandidaten) {
      const r = el.getBoundingClientRect()
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

async function pruefeScreen(page, viewport, screen, hash, warten = 1400) {
  await page.evaluate((h) => { location.hash = h }, hash)
  await page.waitForTimeout(warten)

  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  if (sw > iw + 1) melde(viewport, screen, `horizontales Scrollen (${sw} > ${iw})`)

  for (const p of await pruefeUeberlappung(page)) melde(viewport, screen, p)

  await page.screenshot({ path: `${OUT}/${viewport}-${screen.replace(/\W+/g, '-')}.png` })
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
    const forest = Array.from({ length: 14 }, (_, i) => ({
      slot: i, objectId: ['baum', 'blume', 'busch', 'tanne', 'pilzhaus', 'hase'][i % 6],
      placedAt: 1, growthDays: 4, lastGrowthDay: '2020-01-01',
    }))
    for (const [id, name, level] of [['klein', 'Mia', 4], ['gross', 'Ben', 9]]) {
      tx.objectStore('children').put({
        id, nickname: name, avatarId: 'hase', birthYear: 2019, createdAt: id === 'klein' ? 1 : 2,
        stars: 60, starsTotal: 260, companion: { level: 5, xp: 0, outfitId: 'hut', ownedOutfits: [] },
        forest, milestones: ['forest-10'], toured: true,
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
  // Jedes Spiel auf niedriger UND hoher Stufe
  for (const kind of ['klein', 'gross']) {
    for (const g of SPIELE) {
      await pruefeScreen(page, vp.name, `${g}-${kind}`, `#/kind/${kind}/spiel/${g}`, 1800)
    }
  }
  await pruefeScreen(page, vp.name, 'mein-wald', '#/kind/klein/wald', 1800)

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
