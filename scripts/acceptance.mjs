/**
 * Akzeptanztest gegen Abschnitt 15 der Spezifikation.
 *
 * Voraussetzung (bewusst KEINE devDependency, damit CI schlank bleibt):
 *   npm i -D playwright
 *   npm run build && npx vite preview --port 4173
 *   npm run acceptance
 *
 * Prüft die Kriterien 15.3 bis 15.10 im echten Browser. 15.1 (Build) und
 * 15.2 (Lighthouse) laufen separat, 15.7/15.8 decken die Unit-Tests ab.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:4173/Wunderwald/'
const OUT = process.env.SHOTS || '/tmp/wunderwald-acceptance'
mkdirSync(OUT, { recursive: true })

const ergebnisse = []
function pruefe(id, titel, ok, detail = '') {
  ergebnisse.push({ id, titel, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${id}  ${titel}${detail ? `\n      ${detail}` : ''}`)
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

async function onboarding(p, { nickname = 'Mia', jahr = '2019', pin = ['1','2','3','4'] } = {}) {
  await p.getByLabel('Wie heißen Sie?').fill('Timur')
  await p.getByRole('button', { name: /Los geht/ }).click()
  for (const d of pin) await p.getByRole('button', { name: d, exact: true }).click()
  await p.getByRole('button', { name: 'Weiter' }).click()
  for (const d of pin) await p.getByRole('button', { name: d, exact: true }).click()
  await p.waitForTimeout(250)
  await p.getByRole('button', { name: 'Weiter' }).click()
  const satz = await p.locator('.ww-phrase').innerText()
  await p.getByRole('checkbox').check()
  await p.getByRole('button', { name: 'Weiter' }).click()
  await p.getByLabel('Spitzname').fill(nickname)
  if (jahr) await p.getByLabel(/Geburtsjahr/).fill(jahr)
  await p.getByRole('button', { name: /Wald öffnen/ }).click()
  await p.waitForURL(/#\/kind\//, { timeout: 15000 })
  await p.waitForTimeout(1200)
  return { satz, childId: p.url().split('/kind/')[1].split('/')[0] }
}

async function dbLesen(p, store) {
  return p.evaluate(async (s) => {
    const req = indexedDB.open('wunderwald')
    const db = await new Promise((r) => { req.onsuccess = () => r(req.result) })
    return new Promise((r) => {
      const g = db.transaction(s).objectStore(s).getAll()
      g.onsuccess = () => r(g.result)
    })
  }, store)
}

/** Löst eine Runde eines Spiels, indem es notfalls alle Optionen durchprobiert. */
async function spieleRunde(p, gameId, childId, maxAufgaben = 8) {
  process.stdout.write(`   … ${gameId}\n`)
  await p.evaluate((u) => { location.hash = u }, `#/kind/${childId}/spiel/${gameId}`)
  await p.waitForTimeout(1400)

  for (let n = 0; n < maxAufgaben * 6; n++) {
    if (await p.locator('.ww-reward').count()) break

    // Wort-Baukasten: ziehen statt tippen
    if (await p.locator('.ww-bau__vorrat').count()) {
      const slots = await p.locator('.ww-slot').count()
      let gesetzt = false
      for (let s = 0; s < slots && !gesetzt; s++) {
        const slot = p.locator('.ww-slot').nth(s)
        if ((await slot.locator('.ww-stein--gesetzt').count()) > 0) continue
        const steine = await p.locator('.ww-bau__vorrat .ww-stein').count()
        for (let i = 0; i < steine; i++) {
          const stein = p.locator('.ww-bau__vorrat .ww-stein').nth(i)
          const a = await stein.boundingBox().catch(() => null)
          const t = await slot.boundingBox().catch(() => null)
          if (!a || !t) continue
          await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
          await p.mouse.down()
          await p.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 })
          await p.mouse.up()
          await p.waitForTimeout(700)
          if ((await slot.locator('.ww-stein--gesetzt').count()) > 0) { gesetzt = true; break }
        }
      }
      if (!gesetzt) await p.waitForTimeout(500)
      continue
    }

    // Memory: systematisch Paare probieren.
    // Der Treiber kann sich Motive merken (Bild-Memory), muss aber auch
    // Bretter lösen, deren beide Karten unterschiedlich aussehen
    // (Bild <-> Anlaut, Rechnung <-> Ergebnis). Deshalb zusätzlich
    // systematisches Durchprobieren noch nicht versuchter Paare.
    if (await p.locator('.ww-karte').count()) {
      const text = new Map()        // Kartenindex -> sichtbarer Text
      const versucht = new Set()    // "i-j" schon probiert

      const zustand = () =>
        p.evaluate(() =>
          [...document.querySelectorAll('.ww-karte')].map((k) => ({
            gefunden: k.className.includes('gefunden'),
            text: k.querySelector('.ww-karte__vorne')?.textContent ?? null,
          })),
        )

      const flip = async (i) => {
        await p.locator('.ww-karte').nth(i).click({ force: true }).catch(() => {})
        await p.waitForTimeout(230)
        const z = await zustand()
        if (z[i]?.text) text.set(i, z[i].text)
        return z
      }

      const anzahl = await p.locator('.ww-karte').count()
      for (let runde = 0; runde < anzahl * anzahl; runde++) {
        const z = await zustand()
        if (z.every((k) => k.gefunden)) break
        const offen = z.map((_, i) => i).filter((i) => !z[i].gefunden)
        if (offen.length < 2) break

        let paar = null
        // Bild-Memory: gleiches Motiv schon zweimal gesehen
        for (const i of offen) {
          for (const j of offen) {
            if (j <= i) continue
            if (text.has(i) && text.get(i) === text.get(j)) { paar = [i, j]; break }
          }
          if (paar) break
        }
        // Sonst das nächste noch nicht probierte Paar
        if (!paar) {
          for (const i of offen) {
            for (const j of offen) {
              if (j <= i || versucht.has(i + '-' + j)) continue
              paar = [i, j]
              break
            }
            if (paar) break
          }
        }
        if (!paar) break

        versucht.add(paar[0] + '-' + paar[1])
        await flip(paar[0])
        await flip(paar[1])
        await p.waitForTimeout(760)
      }
      await p.waitForTimeout(900)
      continue
    }

    // Auswahl-Spiele: Optionen durchprobieren
    const optionen = await p.locator('.ww-choice').count()
    if (optionen === 0) { await p.waitForTimeout(500); continue }
    for (let i = 0; i < optionen; i++) {
      await p.locator('.ww-choice').nth(i).click({ force: true }).catch(() => {})
      await p.waitForTimeout(500)
      if ((await p.locator('.ww-choice').count()) !== optionen) break
      if (await p.locator('.ww-reward').count()) break
    }
    await p.waitForTimeout(400)
  }
  return (await p.locator('.ww-reward').count()) > 0
}

/* ================================================================== */
/* 15.4 – Frische Installation, alle 6 Spiele, Sterne, Wald, Neustart  */
/* ================================================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'de-DE' })
  const p = await ctx.newPage()
  const extern = []
  const fehler = []
  p.on('pageerror', (e) => fehler.push(String(e)))
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()) })
  p.on('request', (r) => {
    const u = new URL(r.url())
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) extern.push(r.url())
  })

  await p.goto(BASE, { waitUntil: 'networkidle' })
  const { childId } = await onboarding(p)
  pruefe('15.4a', 'Onboarding legt Familie und Kind an', (await dbLesen(p, 'children')).length === 1)

  const SPIELE = ['zahlen-ernte', 'rechen-bruecke', 'buchstaben-fang', 'wort-baukasten', 'muster-weber', 'paar-finder']
  const gespielt = []
  for (const g of SPIELE) {
    if (g === 'paar-finder') {
      // Brettgröße auf 3 Paare setzen, damit der Testlauf kurz bleibt. Dass alle
      // Stufen 1..10 saubere Bretter erzeugen, prüfen die Unit-Tests.
      await p.evaluate(async (id) => {
        const req = indexedDB.open('wunderwald')
        const db = await new Promise((r) => { req.onsuccess = () => r(req.result) })
        await new Promise((r) => {
          const st = db.transaction('progress', 'readwrite').objectStore('progress')
          const g2 = st.get([id, 'logik'])
          g2.onsuccess = () => { const pr = g2.result; pr.level = 1; st.put(pr).onsuccess = r }
        })
      }, childId)
    }
    const ok = await spieleRunde(p, g, childId)
    gespielt.push(`${g}${ok ? '' : ' (nicht beendet)'}`)
    if (ok) {
      await p.getByRole('button', { name: 'Zur Karte' }).click().catch(() => {})
      await p.waitForTimeout(900)
    }
  }
  pruefe('15.4b', 'Alle 6 Spiele einmal durchspielbar', gespielt.every((g) => !g.includes('nicht')), gespielt.join(', '))

  const kindNachSpielen = (await dbLesen(p, 'children'))[0]
  pruefe('15.4c', 'Sterne wurden vergeben', kindNachSpielen.stars > 0, `${kindNachSpielen.stars} ⭐ Guthaben, ${kindNachSpielen.starsTotal} ⭐ insgesamt`)

  const versuche = await dbLesen(p, 'attempts')
  pruefe('15.4d', 'Versuche werden protokolliert', versuche.length > 0, `${versuche.length} Einträge`)

  // Objekt im Wald pflanzen
  await p.evaluate((id) => { location.hash = `#/kind/${id}/wald` }, childId)
  await p.waitForTimeout(1500)
  await p.getByRole('button', { name: /Pflanzen/ }).click()
  await p.waitForTimeout(600)
  await p.locator('.ww-shopitem').first().click()
  await p.waitForTimeout(700)
  await p.locator('.ww-slotcell--frei').first().click()
  await p.waitForTimeout(1200)
  const objekte = await p.locator('.ww-planted').count()
  pruefe('15.4e', 'Objekt im Wald sichtbar', objekte > 0, `${objekte} Objekt(e)`)

  // Neustart
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(1600)
  const nachReload = (await dbLesen(p, 'children'))[0]
  pruefe(
    '15.4f',
    'Nach App-Neustart ist alles noch da',
    nachReload.forest.length === kindNachSpielen.forest.length + 1 && nachReload.starsTotal === kindNachSpielen.starsTotal,
    `${nachReload.forest.length} Objekte, ${nachReload.starsTotal} ⭐ insgesamt`,
  )

  /* --- 15.5 Kein horizontales Scrollen auf 360 px --- */
  const seiten = [
    ['Weltkarte', `#/kind/${childId}`],
    ['Zahlenland', `#/kind/${childId}/welt/zahlen`],
    ['Spiel', `#/kind/${childId}/spiel/zahlen-ernte`],
    ['Mein Wald', `#/kind/${childId}/wald`],
    ['Kind-Auswahl', '#/kinder'],
    ['Datenschutz', '#/datenschutz'],
  ]
  const ueberlauf = []
  for (const [name, hash] of seiten) {
    await p.evaluate((h) => { location.hash = h }, hash)
    await p.waitForTimeout(1200)
    const [sw, iw] = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    if (sw > iw + 1) ueberlauf.push(`${name} (${sw} > ${iw})`)
    await p.screenshot({ path: `${OUT}/360-${name.replace(/\W+/g, '-')}.png` })
  }
  pruefe('15.5a', '360 px: kein horizontales Scrollen', ueberlauf.length === 0, ueberlauf.join(', ') || 'alle Seiten passen')

  /* --- 15.9 Keine fremden Domains --- */
  pruefe('15.9', 'Kein einziger Request auf fremde Domains', extern.length === 0, extern.slice(0, 5).join(', ') || 'keine')
  pruefe('15.x', 'Keine JavaScript-Fehler im Betrieb', fehler.length === 0, fehler.slice(0, 3).join(' | ') || 'keine')

  await ctx.close()
}

/* ================================================================== */
/* 15.5b – Tablet quer: Layout nutzt den Platz                          */
/* ================================================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 700 }, locale: 'de-DE' })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  const { childId } = await onboarding(p, { nickname: 'Ben' })
  await p.evaluate((id) => { location.hash = `#/kind/${id}` }, childId)
  await p.waitForTimeout(1400)
  const [sw, iw] = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  const portale = await p.evaluate(() => {
    const els = [...document.querySelectorAll('.ww-portal')]
    return els.length ? new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size : 0
  })
  await p.screenshot({ path: `${OUT}/tablet-weltkarte.png` })
  pruefe('15.5b', 'Tablet quer: kein Überlauf, Portale nebeneinander', sw <= iw + 1 && portale === 1, `scrollWidth ${sw}/${iw}, Portal-Reihen: ${portale}`)
  await ctx.close()
}

/* ================================================================== */
/* 15.3 – Flugmodus                                                     */
/* ================================================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'de-DE' })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  const { childId } = await onboarding(p, { nickname: 'Offline' })
  await p.evaluate(async () => { await navigator.serviceWorker.ready })
  await p.waitForTimeout(3000)

  await ctx.setOffline(true)
  await p.reload({ waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
  const startetOffline = (await p.locator('.ww-map').count()) > 0 || (await p.locator('.ww-kidselect').count()) > 0
  pruefe('15.3a', 'Flugmodus: App startet nach Reload', startetOffline)

  await p.evaluate((id) => { location.hash = `#/kind/${id}/spiel/muster-weber` }, childId)
  await p.waitForTimeout(2000)
  const spielbar = (await p.locator('.ww-choice').count()) > 0
  pruefe('15.3b', 'Flugmodus: Spiel spielbar', spielbar)

  const kinder = await dbLesen(p, 'children')
  pruefe('15.3c', 'Flugmodus: Daten bleiben erhalten', kinder.length === 1 && kinder[0].nickname === 'Offline')
  await p.screenshot({ path: `${OUT}/offline.png` })
  await ctx.close()
}

/* ================================================================== */
/* 15.6 – Export erzeugt Datei, Import stellt Zustand her               */
/* ================================================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 380, height: 900 }, locale: 'de-DE', acceptDownloads: true })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await onboarding(p, { nickname: 'Backup' })

  await p.evaluate(() => { location.hash = '#/eltern' })
  await p.waitForTimeout(900)
  for (const d of ['1', '2', '3', '4']) await p.getByRole('button', { name: d, exact: true }).click()
  await p.waitForTimeout(1400)
  await p.evaluate(() => { location.hash = '#/eltern/sicherung' })
  await p.waitForTimeout(900)

  const [download] = await Promise.all([
    p.waitForEvent('download', { timeout: 20000 }),
    p.getByRole('button', { name: /Sicherung herunterladen/ }).click(),
  ])
  const pfad = `${OUT}/${download.suggestedFilename()}`
  await download.saveAs(pfad)
  pruefe('15.6a', 'Export erzeugt eine Datei', /^wunderwald-backup-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), download.suggestedFilename())

  const inhalt = JSON.parse(await (await import('node:fs/promises')).readFile(pfad, 'utf8'))
  pruefe('15.6b', 'Sicherung enthält Schema-Version und alle Tabellen',
    typeof inhalt.schemaVersion === 'number' && inhalt.data.children.length === 1 && Array.isArray(inhalt.data.progress),
    `Version ${inhalt.schemaVersion}, ${inhalt.data.children.length} Kind, ${inhalt.data.progress.length} Fortschritte`)

  // Frische Instanz: neuer Context, Import
  const ctx2 = await browser.newContext({ viewport: { width: 380, height: 900 }, locale: 'de-DE' })
  const p2 = await ctx2.newPage()
  await p2.goto(BASE, { waitUntil: 'networkidle' })
  await p2.getByRole('heading', { name: /Willkommen im Wunderwald/ }).waitFor()
  await onboarding(p2, { nickname: 'Anders', jahr: '' })
  await p2.evaluate(() => { location.hash = '#/eltern' })
  await p2.waitForTimeout(900)
  for (const d of ['1', '2', '3', '4']) await p2.getByRole('button', { name: d, exact: true }).click()
  await p2.waitForTimeout(1400)
  await p2.evaluate(() => { location.hash = '#/eltern/sicherung' })
  await p2.waitForTimeout(900)
  await p2.locator('input[type=file]').setInputFiles(pfad)
  await p2.waitForTimeout(900)
  await p2.getByRole('button', { name: 'Alles ersetzen' }).click()
  await p2.waitForTimeout(1800)
  const wiederhergestellt = await dbLesen(p2, 'children')
  pruefe('15.6c', 'Import stellt den gesicherten Zustand her',
    wiederhergestellt.length === 1 && wiederhergestellt[0].nickname === 'Backup',
    wiederhergestellt.map((c) => c.nickname).join(', '))
  await ctx2.close()
  await ctx.close()
}

/* ================================================================== */
/* 15.10 – Ohne Ton und ohne Vorlesen voll nutzbar                      */
/* ================================================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'de-DE' })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  const { childId } = await onboarding(p, { nickname: 'Still' })

  // Sprachausgabe komplett unmöglich machen und Ton abschalten
  await p.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { get: () => undefined })
  })
  await p.evaluate(async () => {
    const req = indexedDB.open('wunderwald')
    const db = await new Promise((r) => { req.onsuccess = () => r(req.result) })
    await new Promise((r) => {
      const st = db.transaction('family', 'readwrite').objectStore('family')
      const g = st.get('family')
      g.onsuccess = () => { const f = g.result; f.settings.ttsOn = false; f.settings.soundOn = false; st.put(f).onsuccess = r }
    })
  })
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)

  // Zuerst prüfen, dass die Aufgabe WÄHREND der Runde als Text sichtbar ist —
  // ohne Vorlesen ist die Sprechblase die einzige Quelle der Anweisung.
  await p.evaluate((id) => { location.hash = `#/kind/${id}/spiel/zahlen-ernte` }, childId)
  await p.waitForTimeout(2000)
  const blasenText = await p.locator('.ww-bubble').first().innerText().catch(() => '')
  const frageText = await p.locator('.ww-ernte__frage').first().innerText().catch(() => '')
  await p.screenshot({ path: `${OUT}/ohne-ton.png` })

  const geschafft = await spieleRunde(p, 'zahlen-ernte', childId)
  pruefe(
    '15.10',
    'Ohne Ton und ohne Vorlesen voll nutzbar',
    geschafft && blasenText.length > 5 && frageText.length > 3,
    `Runde beendet: ${geschafft} · Sprechblase: „${blasenText}" · Aufgabentext: „${frageText}"`,
  )
  await ctx.close()
}

await browser.close()

/* ------------------------------------------------------------------ */
console.log('\n' + '─'.repeat(60))
const offen = ergebnisse.filter((r) => !r.ok)
console.log(`${ergebnisse.length - offen.length} von ${ergebnisse.length} Prüfungen bestanden.`)
if (offen.length) {
  console.log('\nOffen:')
  offen.forEach((r) => console.log(`  ❌ ${r.id} ${r.titel} — ${r.detail}`))
  process.exitCode = 1
}
