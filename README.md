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
npm test         # Unit-Tests (Adaptivität + alle Aufgaben-Generatoren)
npm run build    # Typecheck + Produktions-Build nach dist/
npm run preview  # dist/ lokal servieren (PWA-Test)
npm run icons    # public/icons/*.png aus src/assets/icon.svg neu rendern
```

> **Repo-Name und `base` müssen zusammenpassen.** Das Repo heißt `Wunderwald`, deshalb steht in
> `vite.config.ts` `base: '/Wunderwald/'`. Wird das Repo umbenannt, muss dieser Wert mit.

## Deployment

Push auf `main` → GitHub Actions baut und deployt nach GitHub Pages
(`.github/workflows/deploy.yml`). In den Repo-Settings muss **Pages → Source: GitHub Actions**
einmalig manuell gesetzt sein.

## Lizenzen

Code: siehe Repo. Schriften **Fredoka** und **Nunito** stehen unter der
SIL Open Font License 1.1 — Lizenztexte in `public/fonts/`.
