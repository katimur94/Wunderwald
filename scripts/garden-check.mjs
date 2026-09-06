/**
 * Garten-Prüfung (Phase 11).
 *
 * Fährt den Garten in allen Ausbaustufen und Tageszeiten ab und prüft die
 * Handgriffe, die man nur im echten Browser sieht: Gießen mit Schub,
 * Jäten, Schnecke vertreiben, Ernten mit Sternen und neuen Beeten, Laden,
 * die Übersetzung eines alten Waldes und das gespeicherte Bild.
 *
 * Voraussetzung (bewusst keine devDependency):
 *   npm i -D playwright
 *   npm run build && npx vite preview --port 4173
 *   npm run garden-check
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4173/Wunderwald/'
const OUT = process.env.SHOTS || '/tmp/wunderwald-garten'
mkdirSync(OUT, { recursive: true })

const ergebnisse = []
function pruefe(titel, ok, detail = '') {
  ergebnisse.push({ titel, ok })
  console.log(`  ${ok ? '✅' : '❌'} ${titel}${detail ? ` — ${detail}` : ''}`)
}

const H = 3_600_000

/**
 * Legt ein Kind mit Garten an (und eines nur mit altem Wald) und öffnet den Garten.
 * `stunde` fälscht die Uhr, damit die Tagesstimmung prüfbar wird.
 */
async function oeffneGarten(browser, name, { beete, stunde, breite = 390, hoehe = 800 }) {
  const ctx = await browser.newContext({
    viewport: { width: breite, height: hoehe }, locale: 'de-DE', acceptDownloads: true, hasTouch: true,
  })
  const page = await ctx.newPage()
  const fehler = []
  page.on('pageerror', (e) => fehler.push(String(e).slice(0, 140)))
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 140)) })

  // Uhrzeit fälschen, bevor irgendein Skript der Seite läuft — nur die Stunde,
  // der Tag bleibt echt, sonst verrechnet der Garten Jahre an Wachstum.
  await page.addInitScript((std) => {
    const Echt = Date
    const heute = new Echt()
    const fest = new Echt(heute.getFullYear(), heute.getMonth(), heute.getDate(), std, 30, 0).getTime()
    class Fake extends Echt {
      constructor(...a) { super(...(a.length ? a : [fest])) }
      static now() { return fest }
    }
    window.Date = Fake
  }, stunde)

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Willkommen/ }).waitFor({ timeout: 20000 })

  await page.evaluate(async ([anzahl, H]) => {
    const req = indexedDB.open('wunderwald')
    const db = await new Promise((r) => { req.onsuccess = () => r(req.result) })
    const tx = db.transaction(['family', 'children', 'progress'], 'readwrite')
    tx.objectStore('family').put({
      id: 'family', parentName: 'T', pinHash: 'x', pinSalt: 'y',
      recoveryHash: '', recoverySalt: '', createdAt: 1,
      settings: { ttsOn: false, soundOn: false, dailyLimitMin: 0, pinFails: 0, pinLockedUntil: 0, lastBackupAt: Date.now(), installHintDismissed: true },
    })
    const now = Date.now()
    const bed = (slot, speciesId, growth, water, extra = {}) => ({
      slot, speciesId, plantedAt: now - 48 * H, growth, water, updatedAt: now, weeds: 0, snail: false, harvests: 0, ...extra,
    })
    const arten = ['sonnenblume', 'tomate', 'moehre', 'erdbeere', 'apfelbaum', 'tulpe', 'salat', 'lavendel', 'mais', 'bohne', 'rose', 'kuerbis']
    const beds = arten.slice(0, anzahl).map((a, i) =>
      bed(i, a, i === 0 ? 1 : i === 1 ? 0.7 : 0.15 + i * 0.06, i === 1 ? 20 : i === 4 ? 10 : 70, i === 1 ? { weeds: 2 } : i === 2 ? { snail: true } : {}),
    )
    tx.objectStore('children').put({
      id: 'k', nickname: 'Mia', avatarId: 'fuchs', birthYear: 2019, createdAt: 1,
      stars: 40, starsTotal: 300, companion: { level: 6, xp: 0, outfitId: 'hut', ownedOutfits: [] },
      forest: [], inventory: [], milestones: [], toured: true, wateredDays: [], forestDays: 7, lastVisitDay: '',
      garden: { bedCount: Math.max(6, anzahl), compost: 2, harvestsTotal: 2, visitors: ['schmetterling'],
        decor: [{ slot: 0, decorId: 'bank' }, { slot: 1, decorId: 'vogelhaus' }], beds },
    })
    // Ein Kind aus der Wald-Zeit: nur `forest`, kein `garden`.
    tx.objectStore('children').put({
      id: 'alt', nickname: 'Ben', avatarId: 'baer', birthYear: 2018, createdAt: 2, stars: 20, starsTotal: 120,
      companion: { level: 1, xp: 0, outfitId: null, ownedOutfits: [] }, milestones: [], toured: true,
      forest: [
        { slot: 0, objectId: 'baum', placedAt: 1, growthDays: 4, lastGrowthDay: '2026-01-01' },
        { slot: 1, objectId: 'blume', placedAt: 1, growthDays: 2, lastGrowthDay: '2026-01-01' },
        { slot: 2, objectId: 'teich', placedAt: 1, growthDays: 0, lastGrowthDay: '' },
        { slot: 3, objectId: 'hase', placedAt: 1, growthDays: 0, lastGrowthDay: '' },
      ],
    })
    for (const id of ['k', 'alt']) {
      for (const w of ['zahlen', 'buchstaben', 'logik', 'entdecker']) {
        tx.objectStore('progress').put({ childId: id, worldId: w, level: 5, xp: 0, streak: 0, failStreak: 0, recentTimes: [] })
      }
    }
    await new Promise((r) => { tx.oncomplete = r })
  }, [beete, H])

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.evaluate(() => { location.hash = '#/kind/k/wald' })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  return { ctx, page, fehler }
}

/** Liest ein Kind direkt aus IndexedDB — Anzeige kann täuschen, Daten nicht. */
function kindLesen(page, id = 'k') {
  return page.evaluate(async (id) => {
    const req = indexedDB.open('wunderwald')
    const db = await new Promise((r) => { req.onsuccess = () => r(req.result) })
    return new Promise((r) => {
      const g = db.transaction('children').objectStore('children').get(id)
      g.onsuccess = () => r(g.result)
    })
  }, id)
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

/* ---------- Ausbaustufen und Tageszeiten ---------- */
console.log('\n▸ Ausbaustufen und Tagesstimmung')
for (const [name, beete, stunde] of [
  ['klein-tag', 3, 12],
  ['voll-tag', 12, 12],
  ['voll-abend', 12, 19],
  ['voll-nacht', 12, 23],
  ['voll-morgen', 12, 7],
  ['tablet-quer', 12, 12, 1024, 700],
]) {
  const { ctx, page, fehler } = await oeffneGarten(browser, name, { beete, stunde, breite: name === 'tablet-quer' ? 1024 : 390, hoehe: name === 'tablet-quer' ? 700 : 800 })
  const sichtbar = await page.locator('.ww-beet--voll').count()
  const leer = await page.locator('.ww-beet--leer').count()
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  pruefe(
    `${name}: ${beete} Pflanzen, ${Math.max(6, beete) - beete} freie Beete, kein Überlauf`,
    sichtbar === beete && leer === Math.max(6, beete) - beete && sw <= iw + 1 && fehler.length === 0,
    `Pflanzen ${sichtbar}, frei ${leer}, scrollWidth ${sw}/${iw}${fehler.length ? `, ${fehler[0]}` : ''}`,
  )
  await ctx.close()
}

/* ---------- Handgriffe am Beet ---------- */
console.log('\n▸ Gießen, Jäten, Schnecke, Ernte, Laden und Bild')
{
  const { ctx, page, fehler } = await oeffneGarten(browser, 'interaktion', { beete: 5, stunde: 12 })
  const vorher = await kindLesen(page)

  // Schnecke vertreiben
  await page.getByRole('button', { name: 'Schnecke vertreiben' }).click({ force: true })
  await page.waitForTimeout(600)
  const nachSchnecke = await kindLesen(page)
  pruefe('Schnecke lässt sich vertreiben', !nachSchnecke.garden.beds[2].snail)

  // Unkraut zupfen — gibt Kompost
  await page.getByRole('button', { name: 'Unkraut zupfen' }).first().click({ force: true })
  await page.waitForTimeout(600)
  const nachJaeten = await kindLesen(page)
  pruefe(
    'Jäten nimmt Unkraut weg und füllt den Kompost',
    nachJaeten.garden.beds[1].weeds === 1 && nachJaeten.garden.compost === vorher.garden.compost + 1,
    `Unkraut ${vorher.garden.beds[1].weeds} → ${nachJaeten.garden.beds[1].weeds}, Kompost ${vorher.garden.compost} → ${nachJaeten.garden.compost}`,
  )

  // Gießen: Tank voll, Schub, Tagebuch
  await page.getByRole('button', { name: 'Gießkanne nehmen' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Tomate auf Beet 2/ }).click({ force: true })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/giessen.png` })
  await page.waitForTimeout(800)
  const nachGiessen = await kindLesen(page)
  pruefe(
    'Gießen füllt den Tank, gibt einen Schub und steht im Tagebuch',
    nachGiessen.garden.beds[1].water === 100 &&
      nachGiessen.garden.beds[1].growth > nachJaeten.garden.beds[1].growth &&
      (nachGiessen.wateredDays ?? []).length === 1,
    `Wasser ${Math.round(nachJaeten.garden.beds[1].water)} → ${nachGiessen.garden.beds[1].water}, Wachstum ${nachJaeten.garden.beds[1].growth.toFixed(2)} → ${nachGiessen.garden.beds[1].growth.toFixed(2)}`,
  )
  await page.getByRole('button', { name: 'Gießkanne weglegen' }).click()

  // Ernten: Sterne, Meilenstein, neue Beete
  await page.getByRole('button', { name: /Sonnenblume auf Beet 1/ }).click({ force: true })
  await page.waitForTimeout(500)
  pruefe('Antippen öffnet die Aktionsblase', (await page.locator('.ww-aktionen').count()) > 0)
  await page.screenshot({ path: `${OUT}/aktionsblase.png` })
  await page.getByRole('button', { name: /Ernten/ }).click({ force: true })
  await page.waitForTimeout(1000)
  const nachErnte = await kindLesen(page)
  pruefe(
    'Ernte bringt Sterne, räumt das Beet und schaltet neue Beete frei',
    nachErnte.stars > nachGiessen.stars &&
      nachErnte.garden.beds.every((b) => b.slot !== 0) &&
      nachErnte.garden.harvestsTotal === 3 &&
      nachErnte.garden.bedCount === 8,
    `Sterne ${nachGiessen.stars} → ${nachErnte.stars}, Beete ${nachGiessen.garden.bedCount} → ${nachErnte.garden.bedCount}`,
  )

  // Laden: Samen pflanzen
  await page.getByRole('button', { name: /Leeres Beet/ }).first().click({ force: true })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/laden.png` })
  await page.locator('.ww-shopitem--samen').first().click({ force: true })
  await page.waitForTimeout(900)
  const nachPflanzen = await kindLesen(page)
  pruefe(
    'Samen kaufen pflanzt ins freie Beet und kostet Sterne',
    nachPflanzen.garden.beds.length === nachErnte.garden.beds.length + 1 && nachPflanzen.stars < nachErnte.stars,
    `${nachErnte.garden.beds.length} → ${nachPflanzen.garden.beds.length} Pflanzen, Sterne ${nachErnte.stars} → ${nachPflanzen.stars}`,
  )

  // Bild
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    page.getByRole('button', { name: /als Bild speichern/ }).click(),
  ])
  pruefe(
    'Bild wird als PNG gespeichert',
    Boolean(download) && /\.png$/.test(download.suggestedFilename()),
    download ? download.suggestedFilename() : 'kein Download',
  )
  if (download) await download.saveAs(`${OUT}/${download.suggestedFilename()}`)

  // Alter Wald wird Garten
  await page.evaluate(() => { location.hash = '#/kind/alt/wald' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/migriert.png` })
  const alt = await kindLesen(page, 'alt')
  pruefe(
    'Ein alter Wald wird beim Öffnen zum Garten',
    alt.garden?.beds.map((b) => b.speciesId).join(',') === 'apfelbaum,tulpe' &&
      alt.garden?.decor.some((d) => d.decorId === 'teich') &&
      alt.garden?.visitors.includes('hase'),
    alt.garden ? `${alt.garden.beds.length} Beete, ${alt.garden.decor.length} Deko, Besucher ${alt.garden.visitors.join(', ')}` : 'kein Garten',
  )

  pruefe('Keine JavaScript-Fehler', fehler.length === 0, fehler.slice(0, 2).join(' | ') || 'keine')
  await ctx.close()
}

await browser.close()

console.log('\n' + '─'.repeat(60))
const offen = ergebnisse.filter((e) => !e.ok)
if (offen.length === 0) {
  console.log(`✅ Garten-Prüfung: ${ergebnisse.length} von ${ergebnisse.length} in Ordnung.`)
} else {
  console.log(`❌ ${offen.length} von ${ergebnisse.length} fehlgeschlagen:`)
  offen.forEach((e) => console.log(`   ${e.titel}`))
  process.exitCode = 1
}
console.log(`Screenshots: ${OUT}`)
