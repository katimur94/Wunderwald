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
```

> **Repo-Name und `base` müssen zusammenpassen.** Das Repo heißt `Wunderwald`, deshalb steht in
> `vite.config.ts` `base: '/Wunderwald/'`. Wird das Repo umbenannt, muss dieser Wert mit.

## Deployment

Push auf `main` → GitHub Actions baut und deployt nach GitHub Pages
(`.github/workflows/deploy.yml`).

**Einmalig nötig:** GitHub Pages muss für das Repo aktiviert sein. Zwei Wege:

1. **Ein Klick:** Settings → Pages → Source: **GitHub Actions**. Danach den Workflow erneut
   starten (Actions → „Deploy Wunderwald" → Run workflow).
2. **Vollautomatisch:** ein Personal Access Token als Repo-Secret `PAGES_TOKEN` hinterlegen
   (klassisch: Scope `repo`; fein granular: Administration + Pages, je schreibend). Dann aktiviert
   `actions/configure-pages` die Seite beim nächsten Lauf selbst.

Der eingebaute `GITHUB_TOKEN` kann das **nicht** — die REST-Route zum Anlegen einer Pages-Seite
verlangt `Administration: write`, und diese Berechtigung lässt sich in einem Workflow gar nicht
anfordern. Details in `DECISIONS.md`, D19.

## Abnahme

Stand des letzten vollständigen Laufs (`npm test`, `npm run build`, Lighthouse, `npm run acceptance`):

| # | Kriterium | Ergebnis |
|---|---|---|
| 15.1 | `npm run build` ohne Fehler, Deploy-Workflow grün | ✅ Build grün, Workflow läuft Tests + Build vor dem Deploy |
| 15.2 | Lighthouse: installierbar, Performance ≥ 90 (Mobile) | ✅ Performance 94–96 (Streuung über mehrere Läufe), Accessibility 100, Best Practices 100, SEO 100; Manifest + Service Worker aktiv |
| 15.3 | Flugmodus: App startet, Spiel spielbar, Daten bleiben | ✅ geprüft im Browser mit abgeschaltetem Netz |
| 15.4 | Frische Installation → Onboarding → alle 6 Spiele → Sterne → Wald → Neustart | ✅ alle sechs Spiele durchgespielt, Sterne vergeben, Objekt gepflanzt, nach Reload unverändert |
| 15.5 | 360 px ohne horizontales Scrollen, Tablet quer nutzt den Platz | ✅ alle Screens passen; auf dem Tablet stehen die vier Portale nebeneinander |
| 15.6 | Export erzeugt Datei, Import stellt Zustand her | ✅ Export → frische Instanz → Import → identischer Zustand |
| 15.7 | Unit-Tests für `adaptivity.ts` | ✅ 23 Tests (Auf-/Abstieg, Grenzen 1 und 10, Hilfe-Fälle) |
| 15.8 | Generator-Tests: je Stufe 100 Aufgaben, Lösung genau einmal enthalten | ✅ alle sechs Spiele, zusätzlich fachliche Prüfungen je Stufe |
| 15.9 | Kein Request auf fremde Domains | ✅ Netzwerk-Mitschnitt über den kompletten Durchlauf: keiner |
| 15.10 | Ton aus + Vorlesen aus → App voll nutzbar | ✅ Runde ohne Ton und ohne `speechSynthesis` beendet, Anweisung steht in der Sprechblase |

Insgesamt **189 Unit-Tests** und **17 Browser-Prüfungen**.

`npm audit --omit=dev` meldet 0 Schwachstellen — die ausgelieferten Abhängigkeiten sind sauber.
Die verbleibenden Meldungen betreffen ausschließlich Entwicklungswerkzeuge (Vite-Dev-Server,
Vitest-UI), die weder in der CI noch in Produktion laufen. Details in `DECISIONS.md`, D18.

## Lizenzen

Code: siehe Repo. Schriften **Fredoka** und **Nunito** stehen unter der
SIL Open Font License 1.1 — Lizenztexte in `public/fonts/`.
