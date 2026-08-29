# 🌲 Wunderwald

**Lern-Spiel-PWA für Kinder von ca. 4 bis 10 Jahren.**
Kinder lösen kurze, adaptiv schwieriger werdende Aufgaben in drei Lernwelten und bauen mit
verdienten Sternen ihren eigenen Wald auf, der sichtbar wächst. Der Begleiter-Fuchs **Funkel**
liest alle Anweisungen vor — so können auch Nichtleser alleine spielen.

👉 **[Zur App](https://katimur94.github.io/Wunderwald/)**

---

## Wunderwald funkt nicht nach Hause

- **Alle Daten bleiben auf dem Gerät.** Gespeichert wird ausschließlich lokal im Browser
  (IndexedDB). Es gibt keinen Server, keine Cloud, keine Accounts.
- **Keine externen Requests zur Laufzeit.** Keine CDNs, keine Google-Fonts-Links, keine Tracker,
  keine Werbung, keine Analytics. Schriften liegen als Dateien im Repo.
- **Keine Berechtigungen** außer der Bitte, den lokalen Speicher zu schützen
  (`navigator.storage.persist()`). Kein Zugriff auf Kamera, Mikrofon oder Standort.
- **Kinder werden nur mit Spitzname und Avatar geführt.** Das Geburtsjahr ist optional und wird
  nur einmalig für die Startstufe benutzt.
- **Eltern-PIN** wird nie im Klartext gespeichert (PBKDF2-SHA-256, 100 000 Iterationen, Salt).
- **Datensicherung** liegt in eurer Hand: Export als JSON-Datei, Import auf einem anderen Gerät.
  Das ist auch der Weg für den Geräteumzug.

## Die zehn Spiele

| Welt | Spiele |
|---|---|
| 🔢 **Zahlenland** | Zahlen-Ernte (zählen, vergleichen, ergänzen) · Rechen-Brücke (plus, minus, Einmaleins) · Zahlen-Waage (zerlegen und ergänzen) · Zahlen-Sprung (Jump-and-Run: laufen, springen, das Ergebnis von unten treffen) |
| 🔤 **Buchstabenwald** | Buchstaben-Fang (Anlaute) · Wort-Baukasten (Wörter bauen) · Reim-Boot (Reime, Silben, Wortpaare) |
| 🧩 **Logik-Labor** | Muster-Weber (Muster und Reihen) · Paar-Finder (Merkspiel) · Sortier-Werkstatt (Art und Merkmal) |

Dazu hat jede Welt eine **Überraschungs-Runde**: sechs Aufgaben, bunt gemischt aus allen Spielen
dieser Welt. Im eigenen Wald sammelt sich außerdem das **Waldbuch** — eine Seite mit echten
Sachinfos zu jedem Tier und jeder Pflanze, die das Kind besitzt.

## Für Eltern

Wunderwald misst **keinen IQ** und vergibt keine Note. Stattdessen führt die App pro Kind und
Lernwelt eine Stufe von 1 bis 10 und beschreibt sie im Elternbereich in Klartext
(„Zählt sicher bis 20, vergleicht Mengen, erste Plusaufgaben bis 10.“).
Die Stufe passt sich still an die Leistung an — Kinder sehen keinen Abstieg, sondern nur
freundliche Meilensteine.

## Technik

| Baustein | Wahl |
|---|---|
| Build | Vite + React 18 + TypeScript |
| PWA | `vite-plugin-pwa` (Workbox, `autoUpdate`), Offline-first |
| Lokale DB | Dexie (IndexedDB) |
| State | Zustand |
| Routing | React Router (**HashRouter** — GitHub Pages hat kein SPA-Fallback) |
| Animation | Framer Motion |
| Sound | Web Audio API, **synthetisiert** — keine Audio-Dateien |
| Sprachausgabe | Web Speech API (`de-DE`) |
| Grafik | Inline-SVG + System-Emojis |
| PIN | Web Crypto (PBKDF2 + SHA-256) |

## Entwickeln

```bash
npm install
npm run dev      # http://localhost:5173/Wunderwald/
npm test         # Unit-Tests (Adaptivität, Generatoren, Backup, Hinweise …)
npm run build    # Typecheck + Produktions-Build nach dist/
npm run preview  # dist/ lokal servieren (PWA-Test)
npm run icons    # public/icons/*.png aus src/assets/icon.svg neu rendern
```

Im Entwicklungsmodus gibt es zwei Werkstatt-Seiten (im Produktions-Build nicht enthalten):
`#/dev/spiele` zeigt jedes Spiel auf jeder Stufe, `#/dev/funkel` alle Zustände des Fuchses.

### Browser-Tests

`playwright` ist absichtlich keine devDependency, damit `npm ci` im Deploy nichts nachlädt.
Für die Browser-Läufe einmalig installieren:

```bash
npm i -D playwright && npx playwright install chromium
npm run build && npx vite preview --port 4173 &
npm run smoke        # kompletter Durchlauf, prüft auch: keine externen Requests
npm run acceptance   # Akzeptanzkriterien aus der Spezifikation, Abschnitt 15
npm run layout-guard # Viewport-Wächter (siehe unten)
npm run forest-check # Wald in allen Ausbaustufen: Kiste, Gießen, Bild
```

### Layout-Wächter

`npm run layout-guard` fährt fünf echte Gerätegrößen ab — 360×560, 360×640, 390×780, 768×1024 und
quer 740×360 — und prüft auf jedem Screen vier Dinge:

1. Kein sichtbarer Spielinhalt rutscht unter die Kopfleiste oder das Funkel-Panel.
2. Nirgends muss horizontal gescrollt werden.
3. Ein Vollbild-Schirm ist genau so hoch wie der Viewport — keine feste Leiste steht unterhalb
   des Bildrands.
4. Ein belegter Waldplatz bleibt groß genug zum Antippen.

Gemessen wird dabei das **sichtbare** Rechteck: erst mit allen schneidenden Vorfahren und dem
Viewport verschnitten, denn was im Scrollbereich weggeschnitten ist, überlappt nichts.

Durchlaufen werden Weltkarte, alle Welten, **jedes Spiel auf niedriger und hoher Stufe**, Mein
Wald in zwei Ausbaustufen (14 und 38 Dinge), Shop, Kiste und der Elternbereich; Screenshots landen
unter `/tmp/wunderwald-layout` (oder `$SHOTS`).

Das ist das Netz gegen genau die Klasse von Fehlern, die auf einem Desktop-Browser nie auffällt:
Auf 360×560 ist zwischen den Leisten kaum Platz, ein zentrierter Flex-Container schneidet bei
Überlauf oben ab statt zu scrollen — und ein `height: 100dvh` nützt nichts, solange derselbe
Kasten `flex: 1` trägt (siehe `DECISIONS.md`, D33).

### Wald-Prüfung

`npm run forest-check` öffnet den Wald in allen Ausbaustufen (ein Bereich, zwei, alle drei) und zu
vier Tageszeiten und prüft die Handgriffe, die nur im echten Browser sichtbar werden: Aktionsblase
am Objekt, Einlagern in die Kiste, Gießen (und dass es am selben Tag kein zweites Mal geht) und
das gespeicherte PNG.

> **Repo-Name und `base` müssen zusammenpassen.** Das Repo heißt `Wunderwald`, deshalb steht in
> `vite.config.ts` `base: '/Wunderwald/'`. Wird das Repo umbenannt, muss dieser Wert mit.

## Deployment

Push auf `main` → GitHub Actions baut und deployt nach GitHub Pages
(`.github/workflows/deploy.yml`).

GitHub Pages ist für dieses Repo aktiviert (Settings → Pages → Source: **GitHub Actions**) —
für den laufenden Betrieb ist nichts weiter zu tun.

**Beim Aufsetzen in einem frischen Repo** sind drei Einstellungen nötig:

1. **Settings → Pages → Source: „GitHub Actions"** — nicht „Deploy from a branch". Letzteres
   veröffentlicht den Quellcode statt des Builds: Die Seite antwortet dann mit 200, bleibt aber
   weiß, weil sie `/src/main.tsx` einbindet.
2. **Settings → General → Default branch: `main`.**
3. **Settings → Environments → `github-pages` → Deployment branches and tags** — `main` erlauben
   oder auf „No restriction" stellen. GitHub trägt hier beim Aktivieren von Pages den damaligen
   Default-Branch fest ein; die Regel folgt einer späteren Umstellung nicht.

Alternativ zu Punkt 1 lässt sich ein Personal Access Token als Repo-Secret `PAGES_TOKEN`
hinterlegen (klassisch: Scope `repo`; fein granular: Administration + Pages, je schreibend) — dann
aktiviert `actions/configure-pages` die Seite beim ersten Lauf selbst.

> **Beim Prüfen:** Ein Status 200 auf der Pages-URL beweist noch nichts. Entscheidend ist, ob
> `assets/*.js` und `sw.js` ausgeliefert werden — sonst liegt dort der Quellcode statt der App.

Der eingebaute `GITHUB_TOKEN` kann das **nicht** — die REST-Route zum Anlegen einer Pages-Seite
verlangt `Administration: write`, und diese Berechtigung lässt sich in einem Workflow gar nicht
anfordern. Details in `DECISIONS.md`, D19.

## Abnahme

Stand des letzten vollständigen Laufs (`npm test`, `npm run build`, Lighthouse, `npm run acceptance`):

| # | Kriterium | Ergebnis |
|---|---|---|
| 15.1 | `npm run build` ohne Fehler, Deploy-Workflow grün | ✅ Build grün, Workflow läuft Tests + Build vor dem Deploy |
| 15.2 | Lighthouse: installierbar, Performance ≥ 90 (Mobile) | ✅ Mobile 95 / 100 / 100 / 100, Desktop 100 / 100 / 100 / 100; Manifest + Service Worker aktiv |
| 15.3 | Flugmodus: App startet, Spiel spielbar, Daten bleiben | ✅ geprüft im Browser mit abgeschaltetem Netz |
| 15.4 | Frische Installation → Onboarding → alle Spiele → Sterne → Wald → Neustart | ✅ durchgespielt, Sterne vergeben, Objekt gepflanzt, nach Reload unverändert |
| 15.5 | 360 px ohne horizontales Scrollen, Tablet quer nutzt den Platz | ✅ alle Screens passen; auf dem Tablet stehen die vier Portale nebeneinander |
| 15.6 | Export erzeugt Datei, Import stellt Zustand her | ✅ Export → frische Instanz → Import → identischer Zustand |
| 15.7 | Unit-Tests für `adaptivity.ts` | ✅ 23 Tests (Auf-/Abstieg, Grenzen 1 und 10, Hilfe-Fälle) |
| 15.8 | Generator-Tests: je Stufe 100 Aufgaben, Lösung genau einmal enthalten | ✅ alle zehn Spiele plus Mix-Runde, zusätzlich fachliche Prüfungen je Stufe |
| 15.9 | Kein Request auf fremde Domains | ✅ Netzwerk-Mitschnitt über den kompletten Durchlauf: keiner |
| 15.10 | Ton aus + Vorlesen aus → App voll nutzbar | ✅ Runde ohne Ton und ohne `speechSynthesis` beendet, Anweisung steht in der Sprechblase |

Insgesamt **350 Unit-Tests** und **29 Browser-Prüfungen** (Akzeptanz, Layout-Wächter, Wald-Prüfung).

`npm audit --omit=dev` meldet 0 Schwachstellen — die ausgelieferten Abhängigkeiten sind sauber.
Die verbleibenden Meldungen betreffen ausschließlich Entwicklungswerkzeuge (Vite-Dev-Server,
Vitest-UI), die weder in der CI noch in Produktion laufen. Details in `DECISIONS.md`, D18.

## Lizenzen

Code: siehe Repo. Schriften **Fredoka** und **Nunito** stehen unter der
SIL Open Font License 1.1 — Lizenztexte in `public/fonts/`.
