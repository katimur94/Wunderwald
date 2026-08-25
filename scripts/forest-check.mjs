/**
 * Wald-Prüfung (Phase 8).
 *
 * Fährt den lebendigen Wald in allen Ausbaustufen und zu allen Tageszeiten ab
 * und prüft die Handgriffe, die man nur im echten Browser sieht: Aktionsblase,
 * Kiste, Gießen und das gespeicherte Bild.
 *
 * Voraussetzung (bewusst keine devDependency):
 *   npm i -D playwright
 *   npm run build && npx vite preview --port 4173
 *   npm run forest-check
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4173/Wunderwald/'
const OUT = process.env.SHOTS || '/tmp/wunderwald-wald'
mkdirSync(OUT, { recursive: true })

const ergebnisse = []
function pruefe(titel, ok, detail = '') {
  ergebnisse.push({ titel, ok })
  console.log(`  ${ok ? '✅' : '❌'} ${titel}${detail ? ` — ${detail}` : ''}`)
}

/** Objekte für einen Wald, der alle drei Bereiche füllt. */
const OBJEKTE = [
  'baum', 'blume', 'busch', 'tanne', 'sonnenblume', 'pilzhaus', 'bank', 'hase',
  'igel', 'vogelhaus', 'erdbeerbeet', 'lagerfeuer', 'laterne', 'schaukel',
  'bienenstock', 'reh', 'schmetterlinge', 'regenbogen', 'baum', 'blume',
  'busch', 'tanne', 'bank', 'laterne',                       // 0–23  Wiese
  'seerose', 'teich', 'bruecke', 'ente', 'seerose', 'teich', 'bruecke', 'ente', // 24–31 Bach
  'tanne', 'fuchsbau', 'eule', 'baum', 'blume', 'hase', 'igel', 'vogelhaus',    // 32–39 Hügel
]

/**
 * Legt ein Kind mit `anzahl` Objekten an und öffnet dessen Wald.
 * `stunde` fälscht die Uhr, damit die Tagesstimmung prüfbar wird.
 */
async function oeffneWald(browser, name, { anzahl, stunde, breite = 390, hoehe = 800 }) {
  const ctx = await browser.newContext({
    viewport: { width: breite, height: hoehe }, locale: 'de-DE', acceptDownloads: true,
  })
  const page = await ctx.newPage()
  const fehler = []
  page.on('pageerror', (e) => fehler.push(String(e).slice(0, 140)))
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text().slice(0, 140)) })

  // Uhrzeit fälschen, bevor irgendein Skript der Seite läuft.
  await page.addInitScript((std) => {
    const Echt = Date
    class Fake extends Echt {
      constructor(...a) { super(...(a.length ? a : [2026, 4, 12, std, 30, 0])) }
      static now() { return new Echt(2026, 4, 12, std, 30, 0).getTime() }
    }
    window.Date = Fake
  }, stunde)

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Willkommen/ }).waitFor({ timeout: 20000 })

  await page.evaluate(async ([n, objs]) => {
    const req = indexedDB.open('wunderwald')
    const db = await new Promise((r) => { req.onsuccess = () => r(req.result) })
    const tx = db.transaction(['family', 'children', 'progress'], 'readwrite')
    tx.objectStore('family').put({
      id: 'family', parentName: 'T', pinHash: 'x', pinSalt: 'y',
      recoveryHash: '', recoverySalt: '', createdAt: 1,
      settings: { ttsOn: false, soundOn: false, dailyLimitMin: 0, pinFails: 0, pinLockedUntil: 0, lastBackupAt: Date.now(), installHintDismissed: true },
    })
    // Die ersten sechs Pflanzen bleiben jung — sonst gäbe es nichts zu gießen.
    const forest = Array.from({ length: n }, (_, i) => ({
      slot: i, objectId: objs[i], placedAt: 1,
      growthDays: i < 6 ? 0 : 5, lastGrowthDay: new Date().toISOString().slice(0, 10),
    }))
    tx.objectStore('children').put({
      id: 'k', nickname: 'Mia', avatarId: 'hase', birthYear: 2019, createdAt: 1,
      stars: 120, starsTotal: 300, companion: { level: 6, xp: 0, outfitId: 'hut', ownedOutfits: [] },
      forest, inventory: [{ objectId: 'baum', growthDays: 4 }],
      // Alle Geschenk-Marken vorab setzen: sonst zieht beim Laden ein Reh ein
      // und die Zählung stimmt nicht mehr. Dass ein Geschenk genau einmal
      // kommt, prüfen die Unit-Tests.
      milestones: ['forest-10', 'forest-25', 'forest-50', 'bereich-bach', 'bereich-huegel',
        'set-wasser', 'set-vogel', 'set-schmetterlinge'],
      toured: true, lastWatered: '', forestDays: 7, lastVisitDay: '',
    })
    for (const w of ['zahlen', 'buchstaben', 'logik']) {
      tx.objectStore('progress').put({ childId: 'k', worldId: w, level: 5, xp: 0, streak: 0, failStreak: 0, recentTimes: [] })
    }
    await new Promise((r) => { tx.oncomplete = r })
  }, [anzahl, OBJEKTE.slice(0, anzahl)])

  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  await page.evaluate(() => { location.hash = '#/kind/k/wald' })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  return { ctx, page, fehler }
}

/** Liest das Kind direkt aus IndexedDB — Anzeige kann täuschen, Daten nicht. */
function kindLesen(page) {
  return page.evaluate(async () => {
    const req = indexedDB.open('wunderwald')
    const db = await new Promise((r) => { req.onsuccess = () => r(req.result) })
    return new Promise((r) => {
      const g = db.transaction('children').objectStore('children').get('k')
      g.onsuccess = () => r(g.result)
    })
  })
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

/* ---------- Ausbaustufen und Tageszeiten ---------- */
console.log('\n▸ Ausbaustufen und Tagesstimmung')
for (const [name, anzahl, stunde, zonenSoll] of [
  ['klein-tag', 8, 12, 1],
  ['bach-tag', 14, 12, 2],
  ['voll-tag', 24, 12, 3],
  ['voll-abend', 38, 19, 3],
  ['voll-nacht', 38, 23, 3],
  ['voll-morgen', 38, 7, 3],
]) {
  const { ctx, page, fehler } = await oeffneWald(browser, name, { anzahl, stunde })
  const zonen = await page.locator('.ww-zone').count()
  const sichtbar = await page.locator('.ww-planted').count()
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  pruefe(
    `${name}: ${zonenSoll} Bereich(e), alle ${anzahl} Objekte, kein Überlauf`,
    zonen === zonenSoll && sichtbar === anzahl && sw <= iw + 1 && fehler.length === 0,
    `Zonen ${zonen}, Objekte ${sichtbar}, scrollWidth ${sw}/${iw}${fehler.length ? `, ${fehler[0]}` : ''}`,
  )
  await ctx.close()
}

/* ---------- Handgriffe am Objekt ---------- */
console.log('\n▸ Kiste, Gießen und Bild')
{
  const { ctx, page, fehler } = await oeffneWald(browser, 'interaktion', { anzahl: 30, stunde: 12 })
  const vorher = await kindLesen(page)

  await page.locator('.ww-slotcell--voll').first().click()
  await page.waitForTimeout(700)
  pruefe('Antippen öffnet die Aktionsblase', (await page.locator('.ww-aktionen').count()) > 0)
  await page.screenshot({ path: `${OUT}/aktionsblase.png` })

  await page.getByRole('button', { name: 'In die Kiste' }).click()
  await page.waitForTimeout(1000)
  const nachKiste = await kindLesen(page)
  pruefe(
    'Einlagern nimmt aus dem Wald und legt in die Kiste',
    nachKiste.forest.length === vorher.forest.length - 1 && nachKiste.inventory.length === vorher.inventory.length + 1,
    `Wald ${vorher.forest.length} → ${nachKiste.forest.length}, Kiste ${vorher.inventory.length} → ${nachKiste.inventory.length}`,
  )

  await page.locator('.ww-kanne').click()
  await page.waitForTimeout(600)
  const jung = page.locator('.ww-slotcell--voll').filter({ hasText: '🌱' }).first()
  await ((await jung.count()) ? jung : page.locator('.ww-slotcell--voll').first()).click()
  await page.waitForTimeout(1200)
  const nachGiessen = await kindLesen(page)
  pruefe('Gießen wird für heute vermerkt', Boolean(nachGiessen.lastWatered), nachGiessen.lastWatered)

  await page.locator('.ww-kanne').click()
  await page.waitForTimeout(600)
  pruefe('Zweites Gießen am selben Tag ist gesperrt', (await page.locator('.ww-kanne--leer').count()) > 0)

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
    page.locator('.ww-bildbtn').click(),
  ])
  pruefe(
    'Bild wird als PNG gespeichert',
    Boolean(download) && /\.png$/.test(download.suggestedFilename()),
    download ? download.suggestedFilename() : 'kein Download',
  )
  if (download) await download.saveAs(`${OUT}/${download.suggestedFilename()}`)

  pruefe('Keine JavaScript-Fehler', fehler.length === 0, fehler.slice(0, 2).join(' | ') || 'keine')
  await ctx.close()
}

await browser.close()

console.log('\n' + '─'.repeat(60))
const offen = ergebnisse.filter((e) => !e.ok)
if (offen.length === 0) {
  console.log(`✅ Wald-Prüfung: ${ergebnisse.length} von ${ergebnisse.length} in Ordnung.`)
} else {
  console.log(`❌ ${offen.length} von ${ergebnisse.length} fehlgeschlagen:`)
  offen.forEach((e) => console.log(`   ${e.titel}`))
  process.exitCode = 1
}
console.log(`Screenshots: ${OUT}`)
