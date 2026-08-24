# Entscheidungen

Hier stehen Punkte, die die Spezifikation offen gelassen hat oder wo bewusst von ihr
abgewichen wurde — jeweils mit Begründung.

## D1 — `base` ist `/Wunderwald/`, nicht `/wunderwald/`
Die Spec nennt den Repo-Namen `wunderwald`, das tatsächliche Repo heißt aber `katimur94/Wunderwald`
(großes W). GitHub Pages ist pfad-sensitiv, daher steht in `vite.config.ts`
`base: '/Wunderwald/'`. Die Spec erlaubt das ausdrücklich („falls anders, `base` anpassen“).

## D2 — Schriftdateien liegen unter `src/assets/fonts/`, nicht `public/fonts/`
Aus `public/` referenzierte Schriften müssten in CSS als `/fonts/…` stehen. Das funktioniert im
Produktions-Build (Vite setzt `base` davor), im Dev-Server aber nicht — dort liegt alles unter
`/Wunderwald/`, und `/fonts/…` läuft ins 404. Über `src/assets/` löst Vite die Pfade in **beiden**
Modi korrekt auf und hasht die Dateien für saubere Cache-Invalidierung.
Die OFL-Lizenztexte bleiben zusätzlich in `public/fonts/` gut sichtbar liegen.
Es wird weiterhin nichts extern nachgeladen — die Dateien liegen im Repo.

## D3 — Nur die Subsets `latin` + `latin-ext`
Deutsch braucht kein Kyrillisch, Griechisch oder Hebräisch. Nunito ist eine Variable Font;
Google liefert für 400 und 700 dieselbe Datei, deshalb liegt sie nur einmal im Repo und wird mit
`font-weight: 200 1000` deklariert.

## D4 — `build.assetsInlineLimit: 0`
Sonst würde Vite kleine Assets (u. a. ein Font-Subset) als Base64 in die CSS einbetten. Als eigene
Dateien landen sie sauber im Workbox-Precache und werden einzeln gecacht.

## D5 — Zusätzlicher CI-Workflow
Neben `deploy.yml` (nur `main`) gibt es `ci.yml` für Branches und Pull Requests: Tests + Build.
So bricht ein Deploy nie an etwas, das vorher hätte auffallen können. Der Deploy-Workflow lässt
`npm test` ebenfalls laufen, bevor er baut.

## D6 — Wiederherstellungssatz: 3 Wörter aus einer Wortliste im Wald-Thema
Die Spec fordert „3 zufällige deutsche Wörter“. Gezogen wird aus einer kuratierten Liste von
96 kurzen, gut merkbaren Substantiven (`src/db/recovery-words.ts`), damit Eltern den Satz wirklich
notieren und wieder tippen können. Verglichen wird case-insensitiv und ohne Leerzeichen.

## D7 — Sperre nach Fehlversuchen liegt in `family.settings`
Die Spec sagt „Timestamp in `family`-Settings“. Umgesetzt als `pinLockedUntil` und `pinFails`
innerhalb von `settings`, damit das Dexie-Schema unverändert bleibt.

## D8 — Tageslimit zählt aktive Spielzeit, nicht Kalenderzeit
Gezählt wird die Zeit in Sessions (`sessions.startedAt` … `endedAt`) des laufenden Tages je Kind.
Nur-Anschauen im Wald zählt nicht mit, das Limit blockiert auch nur das Spielen.

## D9 — Paar-Finder meldet pro Brett genau einen `attempt`
Bei allen anderen Spielen ist eine Runde = 6 Aufgaben = 6 Attempts. Memory ist ein Brett; ein
Brett wird als ein Attempt geschrieben (`correct`, wenn es mit höchstens `Paare + 4` Fehlversuchen
gelöst wurde), damit die Fehlerquoten im Elternbereich vergleichbar bleiben.

## D10 — „Sachaufgaben“ (Zahlen-Ernte Stufe 9–10) sind generiert, nicht vorformuliert
Die Sätze entstehen aus Satzschablonen plus generierten Zahlen und Tieren, damit Aufgaben nicht
abgespult wirken. Vorgelesen wird der komplette Satz, angezeigt werden die Tiere zusätzlich als
Emoji — Nichtleser können mitzählen.

## D11 — Zoom bleibt erlaubt
Ursprünglich stand `maximum-scale=1.0, user-scalable=no` im Viewport-Meta, um versehentliches
Zoomen durch Kinderfinger zu verhindern. Lighthouse bemängelt das zu Recht: Zoom zu sperren ist
ein echtes Barrierefreiheits-Problem, und im Elternbereich stehen längere Texte. Stattdessen
verhindert `touch-action: manipulation` das Doppeltipp-Zoomen — der eigentliche Auslöser beim
Spielen. Danach: Lighthouse-Accessibility 100.

## D12 — Route-Splitting statt eines großen Bündels
Spiele, „Mein Wald“, Elternbereich und die Datenschutz-Seite werden per `React.lazy` nachgeladen.
Der erste Start muss nur Onboarding, Kind-Auswahl und Weltkarte laden. Alle Teile liegen trotzdem
im Workbox-Precache, sind also offline verfügbar.

## D13 — Ton und Vorlesen werden zentral gesetzt
`audio.setEnabled()` und `setTtsEnabled()` laufen einmal in `App.tsx` gegen die Familien-
Einstellungen. Vorher fragte jeder Screen einzeln ab — Aufrufe tief in den Spielen (`sprich(wort)`)
hätten die Einstellung umgangen.

## D14 — `ttsSupported()` prüft die Methode, nicht den Schlüssel
`'speechSynthesis' in window` ist zu schwach: Manche Browser und Datenschutz-Erweiterungen legen
die Eigenschaft an, liefern aber `undefined`. Der Modul-Code lief dann beim Import in einen
TypeError und die ganze App startete nicht mehr. Geprüft wird jetzt
`typeof window.speechSynthesis?.speak === 'function'`, und die Stimmenabfrage liegt in try/catch.
Gefunden hat das der Akzeptanztest zu Kriterium 15.10.

## D15 — Framer Motion respektiert „Bewegung reduzieren“ global
`tokens.css` deckt nur CSS-Animationen ab. Die Dauerschleifen von Framer Motion (Funkels Blinzeln,
schwebende Blätter, laufender Fuchs) liefen weiter. `<MotionConfig reducedMotion="user">` in
`App.tsx` schaltet sie systemweit ab; Ein- und Ausblenden bleibt erhalten.

## D16 — Browser-Werkzeuge sind keine devDependencies
`playwright` und `lighthouse` stehen bewusst NICHT in der `package.json`. Sonst würde `npm ci`
im Deploy-Workflow bei jedem Push Browser nachladen. `npm run smoke` und `npm run acceptance`
setzen eine lokale Installation voraus (`npm i -D playwright`) — beschrieben im README.

## D17 — `registerType: 'prompt'` statt `'autoUpdate'`
Abschnitt 5.1 der Spezifikation nennt `registerType: 'autoUpdate'`, Abschnitt 6.2 verlangt einen
Balken „Neue Version – neu laden“, der **nur** auf ruhigen Screens erscheint und **nie** mitten im
Spiel. Beides zusammen geht nicht: Im `autoUpdate`-Modus erzeugt `vite-plugin-pwa` den Code
`wb.addEventListener('activated', e => (e.isUpdate || e.isExternal) && location.reload())` — die
Seite lädt sich also von selbst neu, notfalls mitten in einer Aufgabe. Zusätzlich ruft der
Modus `onNeedRefresh` nie auf, der Balken wäre also toter Code gewesen.

Da die Verhaltensvorgabe (6.2) das eigentliche Ziel beschreibt und die Config-Zeile (5.1) nur das
Mittel, gewinnt 6.2: `registerType: 'prompt'` plus eigener `UpdateBar`. Ergebnis: Ein Update wird
angeboten, sobald das Kind auf der Kind-Auswahl, im Onboarding oder im Elternbereich ist —
und niemals während einer Runde.

## D18 — Abhängigkeiten: Laufzeit sauber, Werkzeuge bewusst auf altem Stand
`npm audit --omit=dev` meldet **0 Schwachstellen** — was an die Kinder ausgeliefert wird, ist frei
von bekannten Meldungen. Dafür wurde React Router von 6 auf 7.18.2 gehoben (Open-Redirect über
Backslashes in `<Link>`/`useNavigate`, GHSA-wrjc-x8rr-h8h6). Ausnutzbar wäre das hier ohnehin nicht,
weil Wunderwald ausschließlich fest verdrahtete interne Pfade navigiert — aber eine bekannte
Schwachstelle in einer Kinder-App stehen zu lassen, ist keine gute Idee. `sharp` (nur für das
Icon-Skript) wurde auf 0.35.3 gehoben (libvips-CVEs).

Bewusst **nicht** gehoben:
- **vite / esbuild**: Die Meldungen betreffen ausschließlich den Entwicklungs-Server. Der läuft
  weder in der CI noch in Produktion. Ein Sprung von Vite 5 auf 8 würde `vite-plugin-pwa` 0.21
  mitreißen — das Risiko steht in keinem Verhältnis.
- **vitest**: Die kritische Meldung greift nur, wenn der Vitest-UI-Server lauscht
  (`vitest --ui`). Das Projekt startet ihn nie.

Beides ist beim nächsten größeren Aufräumen fällig, blockiert aber nichts.
