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
