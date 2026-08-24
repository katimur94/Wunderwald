/**
 * Browser-Rauchtest gegen den Produktions-Build.
 *
 * Voraussetzung (bewusst KEINE devDependency, damit CI schlank bleibt):
 *   npm i -D playwright
 *   npm run build && npx vite preview --port 4173
 *   npm run smoke
 *
 * Prueft die Akzeptanzkriterien 15.4 (kompletter Durchlauf), 15.5 (360px)
 * und 15.9 (kein einziger Request auf fremde Domains).
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:4173/Wunderwald/'
const OUT = process.env.SMOKE_OUT || '/tmp/wunderwald-smoke'

import { mkdirSync } from 'node:fs'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
})
const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'de-DE' })
const page = await ctx.newPage()

const external = []
page.on('request', (r) => {
  const u = new URL(r.url())
  if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol !== 'data:' && u.protocol !== 'blob:') {
    external.push(r.url())
  }
})
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

// --- Onboarding ---
await page.getByRole('heading', { name: /Willkommen im Wunderwald/ }).waitFor({ timeout: 10000 })
await shot('01-willkommen')
await page.getByLabel('Wie heißen Sie?').fill('Timur')
await page.getByRole('button', { name: /Los geht/ }).click()

// PIN
for (const d of ['1','2','3','4']) await page.getByRole('button', { name: d, exact: true }).click()
await shot('02-pin')
await page.getByRole('button', { name: 'Weiter' }).click()
for (const d of ['1','2','3','4']) await page.getByRole('button', { name: d, exact: true }).click()
await page.waitForTimeout(200)
await page.getByRole('button', { name: 'Weiter' }).click()

// Wiederherstellungssatz
await page.getByRole('heading', { name: /Wiederherstellungssatz/ }).waitFor()
const phrase = await page.locator('.ww-phrase').innerText()
await shot('03-satz')
await page.getByRole('checkbox').check()
await page.getByRole('button', { name: 'Weiter' }).click()

// Kind
await page.getByLabel('Spitzname').fill('Mia')
await page.getByRole('button', { name: 'Igel' }).click()
await page.getByLabel(/Geburtsjahr/).fill('2019')
await shot('04-kind')
await page.getByRole('button', { name: /Wald öffnen/ }).click()

// --- Weltkarte ---
await page.waitForURL(/#\/kind\//, { timeout: 10000 })
await page.waitForTimeout(1200)
await shot('05-weltkarte')

// --- In die Welt und ins Spiel ---
await page.getByRole('button', { name: 'Zahlenland' }).click()
await page.waitForTimeout(700)
await shot('06-welt')
await page.getByRole('button', { name: /Probe-Spiel/ }).click()
await page.waitForTimeout(900)
await shot('07-spiel')

// 6 Aufgaben lösen (Antwort steht in der Aufgabe)
let solved = 0
for (let i = 0; i < 12 && solved < 6; i++) {
  const sum = await page.locator('.ww-bigsum').innerText().catch(() => null)
  if (!sum) break
  const m = sum.match(/(\d+)\s*\+\s*(\d+)/)
  if (!m) break
  const answer = String(Number(m[1]) + Number(m[2]))
  const btn = page.locator('.ww-choice', { hasText: new RegExp(`^${answer}$`) }).first()
  await btn.click()
  solved++
  await page.waitForTimeout(1300)
}
await page.waitForTimeout(1500)
await shot('08-belohnung')

const rewardText = await page.locator('.ww-reward').innerText().catch(() => '(kein Belohnungsscreen)')

// --- Persistenz prüfen ---
const dbState = await page.evaluate(async () => {
  const open = indexedDB.open('wunderwald')
  const db = await new Promise((res, rej) => { open.onsuccess = () => res(open.result); open.onerror = () => rej(open.error) })
  function all(store) {
    return new Promise((res) => {
      const tx = db.transaction(store, 'readonly').objectStore(store).getAll()
      tx.onsuccess = () => res(tx.result)
    })
  }
  const [children, attempts, progress, sessions] = await Promise.all([all('children'), all('attempts'), all('progress'), all('sessions')])
  return {
    kind: children[0]?.nickname,
    sterne: children[0]?.stars,
    sterneGesamt: children[0]?.starsTotal,
    attempts: attempts.length,
    attemptSample: attempts[0],
    progressZahlen: progress.find(p => p.worldId === 'zahlen'),
    sessions: sessions.length,
  }
})

console.log('--- Belohnungsscreen ---')
console.log(rewardText)
console.log('--- DB ---')
console.log(JSON.stringify(dbState, null, 2))
console.log('--- Satz ---', phrase)
console.log('--- Externe Requests ---', external.length ? external : 'KEINE')
console.log('--- Fehler ---', errors.length ? errors : 'keine')

await browser.close()
