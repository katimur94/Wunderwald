import { chromium } from 'playwright'
const OUT = '/tmp/claude-0/-home-user-Wunderwald/4513bbf0-4666-5801-acb5-22dc156accb5/scratchpad'
const BASE = 'http://localhost:4190/Wunderwald/'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, locale: 'de-DE' })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', e => errs.push(String(e)))
p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()) })

await p.goto(BASE, { waitUntil: 'networkidle' })
await p.getByLabel('Wie heißen Sie?').fill('Timur')
await p.getByRole('button', { name: /Los geht/ }).click()
for (const d of ['1','2','3','4']) await p.getByRole('button', { name: d, exact: true }).click()
await p.getByRole('button', { name: 'Weiter' }).click()
for (const d of ['1','2','3','4']) await p.getByRole('button', { name: d, exact: true }).click()
await p.waitForTimeout(250); await p.getByRole('button', { name: 'Weiter' }).click()
await p.getByRole('checkbox').check()
await p.getByRole('button', { name: 'Weiter' }).click()
await p.getByLabel('Spitzname').fill('Mia')
await p.getByRole('button', { name: /Wald öffnen/ }).click()
await p.waitForURL(/#\/kind\//, { timeout: 15000 })
const childId = p.url().split('/kind/')[1].split('/')[0]

// Alle Chunks anfassen, damit sie im Precache landen und offline gebraucht werden
for (const hash of [`#/kind/${childId}/wald`, `#/kind/${childId}/spiel/muster-weber`, '#/datenschutz']) {
  await p.evaluate((h) => { location.hash = h }, hash)
  await p.waitForTimeout(1200)
}
await p.evaluate(async () => { await navigator.serviceWorker.ready })
await p.waitForTimeout(3500)

// --- FLUGMODUS ---
await ctx.setOffline(true)
await p.evaluate((id) => { location.hash = `#/kind/${id}` }, childId)
await p.reload({ waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2600)
console.log('offline Weltkarte:', (await p.locator('.ww-map').count()) > 0 ? '✅' : '❌')

await p.evaluate((id) => { location.hash = `#/kind/${id}/spiel/muster-weber` }, childId)
await p.waitForTimeout(2200)
console.log('offline Spiel (lazy chunk):', (await p.locator('.ww-choice').count()) > 0 ? '✅' : '❌')

await p.evaluate((id) => { location.hash = `#/kind/${id}/wald` }, childId)
await p.waitForTimeout(2200)
console.log('offline Mein Wald (lazy chunk):', (await p.locator('.ww-forest').count()) > 0 ? '✅' : '❌')

await p.evaluate(() => { location.hash = '#/eltern' })
await p.waitForTimeout(2600)
console.log('offline Elternbereich (lazy chunk):', (await p.locator('.ww-pinpad').count()) > 0 ? '✅' : '❌')

await p.screenshot({ path: `${OUT}/chunks-offline.png` })
console.log('Fehler:', errs.length ? errs.slice(0,5) : 'keine')
await b.close()
