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

## D19 — Pages-Aktivierung im Workflow: geht nur mit PAT
Die Seite lieferte 404, weil zwei Dinge fehlten: Pages war im Repo nie aktiviert
(`has_pages: false`), und den Branch `main`, auf den `deploy.yml` hört, gab es gar nicht — der
erste Push hatte `claude/wunderwald-spec-2bcuvg` angelegt, und GitHub machte diesen Branch zum
Standard. Der Deploy-Workflow ist also nie gelaufen.

`main` ist jetzt angelegt und gepusht, damit der Trigger `push: branches: [main]` überhaupt greift.

Der zweite Teil ließ sich **nicht** wie geplant lösen. `actions/configure-pages@v5` mit
`enablement: true` scheiterte im Lauf reproduzierbar:

```
Get Pages site failed.    Error: Not Found
Create Pages site failed. Error: Resource not accessible by integration
```

Ursache ist keine vergessene Zeile im `permissions`-Block, sondern eine Grenze der API: Die Route
`POST /repos/{owner}/{repo}/pages` verlangt neben `Pages: write` auch `Administration: write` —
und `administration` gibt es in den Workflow-Berechtigungen überhaupt nicht (verfügbar sind
`actions`, `attestations`, `checks`, `contents`, `deployments`, `discussions`, `id-token`,
`issues`, `models`, `packages`, `pages`, `pull-requests`, `repository-projects`,
`security-events`, `statuses`). Der eingebaute `GITHUB_TOKEN` kann eine Pages-Seite deshalb
grundsätzlich nicht anlegen, egal wie der Block aussieht.

Umgesetzt ist daher die Variante, die in allen drei Zuständen funktioniert:

```yaml
- uses: actions/configure-pages@v5
  continue-on-error: true
  with:
    enablement: true
    token: ${{ secrets.PAGES_TOKEN || github.token }}
```

- **Mit** einem PAT im Secret `PAGES_TOKEN` aktiviert der Workflow Pages tatsächlich selbst —
  dann ist kein Klick in den Settings nötig, so wie ursprünglich gewünscht.
- **Ohne** PAT scheitert nur dieser eine Schritt, der Lauf geht weiter. Sobald Pages einmal
  eingeschaltet ist, findet `configure-pages` die Seite und der Schritt wird von selbst grün.

Ein PAT wäre ein langlebiges Geheimnis mit Administrationsrechten am Repo, nur um einen einmaligen
Schalter zu ersetzen. Für dieses Projekt ist der eine Klick unter Settings → Pages → Source:
GitHub Actions das kleinere Übel; das Secret bleibt als Option dokumentiert.

**Erledigt.** Nötig waren am Ende drei Handgriffe in der Weboberfläche — der erste war bekannt,
die beiden anderen kosteten je einen fehlgeschlagenen Lauf, bis sie gefunden waren:

1. **Settings → Pages → Source: „GitHub Actions".** Nicht „Deploy from a branch": In diesem Modus
   veröffentlicht GitHub den Branch-Inhalt roh, also den Quellcode. Die Seite lieferte dann zwar
   200, band aber `/src/main.tsx` ein — kein Browser führt TypeScript aus, das Ergebnis war eine
   weiße Seite. Der gebaute Stand liegt in `dist/` und kommt ausschließlich über den Workflow dorthin.
2. **Settings → General → Default branch: `main`.** Vorher war der Feature-Branch Standard, weil
   der erste Push ihn angelegt hatte.
3. **Settings → Environments → `github-pages` → Deployment branches and tags: „No restriction"**
   (oder `main` erlauben). Beim Aktivieren von Pages legt GitHub diese Umgebung mit einer
   Branch-Regel an, die den damaligen Default-Branch **fest** einträgt. Sie folgt einer späteren
   Umstellung des Default-Branch nicht. Solange die Regel den alten Namen nannte, wurde der
   deploy-Job nach zwei Sekunden abgewiesen — ohne einen einzigen ausgeführten Schritt und ohne
   Log, weil ein Job, der nie startet, nichts schreibt.

Diagnose-Merksatz für das nächste Mal: **build-Job grün, deploy-Job nach Sekunden rot mit null
Schritten** heißt immer Umgebungs-Sperre, nie ein Fehler im Deploy selbst. Und **eine 200 auf der
Pages-URL beweist nichts** — prüfen muss man, ob `assets/*.js` ausgeliefert wird.

Ein `PAGES_TOKEN` wird nicht gebraucht; der Weg bleibt nur für ein frisch aufgesetztes Repo
dokumentiert.


## D20 — Vendor-Chunks statt eines 494-kB-Bündels
Trotz Route-Splitting (D12) lag alles, was nicht lazy war, in einem einzigen `index-*.js` von
494 kB (164 kB gzip). Über `build.rollupOptions.output.manualChunks` liegen die Bibliotheken jetzt
in drei eigenen Chunks:

| Chunk | Inhalt | Größe | gzip |
|---|---|---|---|
| `react` | react, react-dom, react-router-dom, scheduler | 180,0 kB | 59,0 kB |
| `motion` | framer-motion samt motion-dom/motion-utils | 114,7 kB | 37,9 kB |
| `db` | dexie, zustand | 97,1 kB | 32,8 kB |
| `index` | der eigene App-Code | 100,6 kB | 33,8 kB |

Kein Chunk liegt mehr über 250 kB, das Hauptbündel ist von 494 kB auf 101 kB geschrumpft. Zwei
Gründe, warum das hier mehr bringt als üblich: Der Browser lädt die Teile parallel, und ein Update
am App-Code wirft die Bibliotheken nicht mehr aus dem Cache — bei einer Offline-PWA, die ihre
Dateien dauerhaft vorhält, spart das bei jedem Deploy den erneuten Download von rund 390 kB.

`manualChunks` ist bewusst als **Funktion** geschrieben, nicht als Objekt: Nur so landen auch die
internen Pakete zuverlässig im richtigen Chunk (`scheduler` bei React, `motion-dom`/`motion-utils`
bei Framer Motion) statt zurück im Hauptbündel.

Geprüft: Der Workbox-Precache enthält alle 35 Einträge inklusive der drei neuen Chunks, und die
App startet im Flugmodus weiterhin — Weltkarte, Spiel, Wald und Elternbereich (alle vier lazy
geladen) laufen ohne Netz.

## D21 — Sprachausgabe nach Hintergrund-Wechsel wieder anwerfen
Safari auf iOS pausiert `speechSynthesis`, sobald die Seite in den Hintergrund geht — Tab-Wechsel,
Bildschirmsperre, App-Umschalter. Beim Zurückkommen setzt es die Ausgabe oft **nicht** von selbst
fort. Für Wunderwald ist das kein Schönheitsfehler: Funkel liest die Aufgaben vor, und ein
Vorschulkind, dem plötzlich niemand mehr die Aufgabe sagt, kann nicht weiterspielen.

Zwei Netze gegen den Hänger:
1. Ein `visibilitychange`-Listener ruft `speechSynthesis.resume()`, sobald
   `document.visibilityState === 'visible'` ist.
2. `sprich()` ruft vor jedem `speak()` zusätzlich `resume()`. Ohne das bliebe der Aufruf
   wirkungslos, falls die Ausgabe noch pausiert ist.

Beides steckt in `try/catch` — schlägt `resume()` fehl, läuft die App weiter, nur eben ohne Ton.
Auf Browsern ohne Pausierung ist der Aufruf ein No-op.

Das Verhalten bei `ttsSupported() === false` ändert sich nicht: Ist `speechSynthesis` gar nicht da
oder fehlt ihm `speak()`, wird kein Listener registriert und kein `resume()` gerufen — geprüft von
`src/audio/tts.test.ts`, das beide Zweige mit einem gestellten DOM durchspielt.

## D22 — Leisten stehen fest, die Mitte scrollt
Der auf echten Geräten gemeldete Fehler hatte eine einzige Ursache: `.ww-gameshell__stage`
zentrierte mit `align-items: center`, hatte aber kein `overflow`. Ein Flex-Container schneidet bei
Überlauf **oben** ab — der Inhalt rutschte unter die Titelleiste und unten unter das Funkel-Panel,
und weil nichts scrollte, war er schlicht nicht erreichbar.

Die Regel lautet jetzt überall gleich: Leisten `flex: none`, der Inhalt dazwischen
`flex: 1; min-height: 0; overflow-y: auto`, und zentriert wird ausschließlich über `margin: auto`
des inneren Wrappers. `margin: auto` ist die einzige Zentrierung, die bei Überlauf oben stehen
lässt statt abzuschneiden.

Dazu `height: 100vh; height: 100dvh` in dieser Reihenfolge: `vh` bleibt beim Ein- und Ausfahren
der mobilen Browserleiste stehen, `dvh` folgt mit. Die erste Zeile ist der Fallback für Browser
ohne `dvh`. `#root` nutzt `min-height: 100dvh`; kein Screen rechnet mehr mit `100vh`.

Betroffen: GameShell, Mein Wald, Belohnungsscreen. Weltkarte und Welt-Screens haben keine feste
Fußleiste und dürfen als Ganzes scrollen.

## D23 — Das Memory-Brett rechnet seine Kartengröße selbst aus
`min-height: 64px` an der Karte plus festes Seitenverhältnis konnte ab 16 Karten gar nicht mehr
passen — das Brett sprengte jede kleine Fläche zwangsläufig. Ein Memory-Brett zu scrollen ist
keine Option: Wer sich merken soll, wo etwas lag, muss alles gleichzeitig sehen.

Jetzt misst sich die Spielfläche per `ResizeObserver`, und `computeBoardLayout()` probiert die
Spaltenzahlen 2–6 (hoch) bzw. 4–8 (quer) durch und nimmt die, bei der die Karten am größten
werden. Die Größe kommt als Inline-Style an die Karte, die Emoji-Schrift als 50 % der
Kartenbreite, Text (Buchstaben, Rechnungen) als 40 % bei mindestens 16 px.

Unterschreitet selbst die beste Aufteilung 44 px Kartenbreite, fallen zwei Paare weg — still,
ohne Ansage, genau wie die Stufenanpassung. Lieber ein kleineres Brett als unlesbare Karten.
Die Rechnung ist eine reine Funktion und ohne DOM getestet (u. a.: passt das Brett in jede
geprüfte Fläche wirklich vollständig hinein?).

## D24 — Ziehen läuft am React-State vorbei
`useDragDrop` machte pro `pointermove` ein `setState` (also einen React-Render pro
Fingerbewegung), las dabei für **alle** Zonen `getBoundingClientRect()` (Layout-Thrashing) und
bewegte den fliegenden Stein über `left`/`top` statt `transform`.

Neu:
- Die Position liegt in einer Ref. Ein `requestAnimationFrame`-Loop — der nur während eines Drags
  läuft — schreibt sie einmal pro Frame direkt als `translate3d` auf das Element.
- Die Zielzonen werden **einmal** beim Drag-Start vermessen und für die Dauer des Drags behalten.
  Während eines Drags scrollt ohnehin nichts (`touch-action: none` auf dem Stein).
- Der einzige React-State, der sich während eines Drags ändert, ist die hervorgehobene Zielzone —
  und auch die nur bei echtem Wechsel.

Gemessen mit 4-facher CPU-Drosselung: größte Lücke zwischen zwei Ghost-Frames **19 ms**
(also ein Frame), und **eine** DOM-Mutation im Bausteine-Vorrat über den gesamten Zug — React
rendert nicht mehr mit.

**Tipp-Tipp als zweiter, gleichwertiger Weg:** Stein antippen wählt ihn aus (pulsierender Rahmen,
Funkel spricht ihn), Ziel antippen setzt ihn, erneutes Antippen wählt ab. Für kleine Kinderhände
oft leichter als Ziehen — und zugleich die barrierefreie Bedienung. Ziehen bleibt unverändert.

## D25 — GameShell setzt beim Spielwechsel zurück
Beim Bauen des Layout-Wächters fiel ein Absturz auf, der nichts mit dem Layout zu tun hatte:
Wechselt man direkt von einem Spiel ins nächste (gleiche Route, nur anderer Parameter — per
Adresse oder Zurück-Taste), bleibt die GameShell montiert. Das neue Spiel bekam dann für einen
Render die Aufgabe des alten und stürzte beim Auspacken der Daten ab
(`Cannot read properties of undefined`).

Die Shell merkt sich jetzt, zu welchem Spiel die aktuelle Aufgabe gehört, rendert das Spiel erst
bei Übereinstimmung und setzt bei einem Wechsel der `gameId` den kompletten Rundenzustand zurück.

## D26 — Layout-Wächter als eigenes Werkzeug
`scripts/layout-guard.mjs` fährt fünf echte Gerätegrößen ab (360×560, 360×640, 390×780, 768×1024
und quer 740×360) und prüft auf jedem Screen zweierlei: Überlappt sichtbarer Inhalt der
Spielfläche die Rechtecke von Kopfleiste oder Funkel-Panel, und muss irgendwo horizontal
gescrollt werden. Genau die Messung, mit der der Fehler ursprünglich gefunden wurde.

Durchlaufen werden Weltkarte, alle drei Welten, **jedes Spiel auf niedriger und auf hoher Stufe**
(zwei Kinder werden dafür angelegt, eines auf Stufe 4, eines auf Stufe 9), Mein Wald und der
Elternbereich. Wie `smoke.mjs` braucht das Skript eine lokale Playwright-Installation und läuft
deshalb nicht in der CI.

## D27 — Schema 2: neue Felder mit Vorgabe statt Fallunterscheidung im Code
Der lebendige Wald braucht vier neue Felder am Kind: `inventory` (die Kiste), `lastWatered`,
`forestDays` und `lastVisitDay`. Dexie bekommt dafür `version(2)` mit einem `upgrade`, das jedes
vorhandene Kind einmalig auf sinnvolle Vorgaben setzt.

Die Alternative wäre gewesen, die Felder optional zu lassen und überall im Code `?? []` bzw.
`?? 0` zu schreiben. Das hält jede alte Kombination für immer am Leben — und man merkt erst beim
Absturz, welche Stelle man vergessen hat. Nach der Migration darf der Code davon ausgehen, dass
die Felder da sind. Ein eigener Test (`migration.test.ts`) legt einen Wald im alten Format an,
öffnet die Datenbank in Version 2 und prüft, dass nichts verloren geht und die Vorgaben stehen.

Der Sicherungs-Export trägt die Schema-Nummer mit; der Test vergleicht sie gegen die Konstante
`SCHEMA_VERSION`, damit er die nächste Migration überlebt, statt bei jeder Version zu brechen.

## D28 — Bereiche sind Slot-Bereiche, keine eigenen Gitter
Bachufer und Hügel könnten je ein eigenes Gitter mit eigener Zählung bekommen. Stattdessen ist
der Wald **eine** durchnummerierte Fläche: Wiese 0–23, Bach 24–31, Hügel 32–39. `zoneOfSlot`
rechnet aus der Nummer den Bereich aus.

Das kostet nichts und spart viel: Ein gepflanztes Objekt bleibt einfach `{ slot, objectId }`, die
alten Wälder passen unverändert weiter, und Umräumen zwischen Bereichen ist eine Zuweisung statt
eines Umzugs zwischen Datenstrukturen. Welche Objekte wo stehen dürfen, entscheidet `zonen` am
Objekt (Seerose nur an den Bach, Fuchsbau nur auf den Hügel, Laterne überall) — geprüft in
`darfInZone`, angewendet in `freeSlots`, damit gar nicht erst ein unmöglicher Platz angeboten wird.

Freigeschaltet wird nach Anzahl der Objekte (Bach ab 12, Hügel ab 20), gefeiert genau einmal:
`neuerBereich` gibt den Bereich nur zurück, solange die Marke `bereich-<zone>` fehlt.

## D29 — Set-Boni laufen über die vorhandene Meilenstein-Mechanik
Drei Sammlungen bringen ein Geschenk: drei Wasser-Dinge locken die Ente, ein Vogelhaus neben zwei
Bäumen den Vogel, fünf verschiedene Pflanzen die Schmetterlinge. Technisch ist das kein zweites
System, sondern derselbe Weg wie bei den Sternen-Meilensteinen: Die Prüfung hängt in
`pendingGift`, die Marke landet in `milestones`, das Geschenk kommt geschenkt in den Wald.

Ein Bonus wird damit garantiert nur einmal vergeben, auch wenn das Kind das auslösende Objekt
wieder einlagert und neu setzt — und der Elternbereich zeigt Set-Boni ohne Zusatzcode mit an.

## D30 — Gießen ist eine Tagesfrage, kein Pflegedruck
Einmal am Tag darf gegossen werden; das bringt jeder jungen Pflanze einen Wachstumstag. Umgesetzt
als Vergleich von `lastWatered` mit dem heutigen `dayKey` — kein Timer, keine Erinnerung, keine
Benachrichtigung.

Bewusst fehlt die Gegenrichtung: Nicht-Gießen schadet nie. Pflanzen welken nicht, nichts geht
kaputt, nichts läuft ab. Ein Kind, das eine Woche nicht da war, findet seinen Wald genau so
wieder, wie es ihn verlassen hat. Ein Spiel für Vierjährige darf kein schlechtes Gewissen bauen.
Ist heute schon gegossen, wird die Kanne blass und Funkel sagt, dass es morgen wieder geht —
statt eines gesperrten Knopfes ohne Erklärung.

## D31 — Tiere wandern beim Betreten, nicht im Hintergrund
Höchstens ein Tier wechselt pro Besuch den Platz, und zwar mit 30 % Wahrscheinlichkeit beim Laden
des Waldes. Kein Intervall, kein Timer, keine Animation, die im Hintergrund weiterläuft.

Ein Wald, in dem sich ständig etwas bewegt, zieht die Aufmerksamkeit vom Spiel ab und lässt das
Gerät nie zur Ruhe kommen. So ist der Effekt trotzdem da, wo er wirkt: Beim Wiederkommen ist etwas
anders — „das Reh ist umgezogen“ — und dazwischen ist Ruhe. Angetippte Tiere antworten mit ihrem
Klang (`bird`, `hop`, `rustle`, alle synthetisiert wie alle anderen) und einem Waldbuch-Fakt.

## D32 — Das Waldbild wird gezeichnet, nicht abfotografiert
„Mein Wald als Bild“ malt die Szene auf ein Canvas und lädt sie als PNG herunter — Himmelverlauf
nach Tageszeit, Gelände, Objekte als Emoji über `fillText`.

Der naheliegende Weg wäre gewesen, das DOM als SVG zu serialisieren und daraus ein Bild zu machen.
Das bringt aber die ganze Seite mit: externe Schriftverweise, `foreignObject`-Eigenheiten je
Browser, und ein Ergebnis, das je nach Bildschirmgröße anders aussieht. Gezeichnet ist das Bild in
jedem Browser gleich groß (1200×800) und hängt an keinem einzigen Layoutdetail.

Das Bild entsteht im Gerät und wird als Datei gespeichert — kein Upload, kein Teilen-Dialog, kein
Server. Es ist der einzige Weg, auf dem etwas aus dem Wunderwald herauskommt, und er führt in den
Download-Ordner des eigenen Geräts.

## D33 — `.ww-vollbild`: `flex: none` ist der Kern, nicht `height`
Der erweiterte Wald hat einen Fehler ans Licht gebracht, den der Wächter aus Phase 7 nicht sehen
konnte. `.ww-forest` und `.ww-gameshell` trugen `height: 100dvh` — aber zugleich `flex: 1`. In
einem Spalten-Flexbereich ist `height` dann nur die Ausgangsgröße: Ein Kind mit großer
Mindesthöhe drückt den Schirm darüber hinaus. Bei 38 Objekten war der Wald 670 px hoch auf einem
560 px hohen Bildschirm — Gießkanne, Kamera und Pflanzen-Knopf standen **110 px unterhalb der
Falz** und waren schlicht nicht erreichbar. Quer waren es 355 px.

Neu gibt es eine gemeinsame Grundform `.ww-vollbild` mit `flex: none` plus `height`/`max-height:
100dvh`. Damit gilt die Höhe, und der Überlauf wird innen gelöst, wo er hingehört. Beide
Vollbild-Schirme benutzen sie.

Innen löst ihn der Wald so: Passt er nicht mehr, **scrollt** der Zonen-Streifen, statt sich
zusammenzudrücken. Die Zeilenhöhe hat mit `--touch-min` einen festen Boden, die Spaltenzahl
richtet sich über `auto-fill` nach der Breite (hochkant vier, quer mehr). Ein Platz bleibt so
immer groß genug zum Antippen — vorher schrumpften die Felder unter 44 px, und ein Kinderfinger
trifft dann kein Reh mehr.

Weil die Streifen scrollen können, das gemalte Gelände dahinter aber steht, trägt jeder Bereich
jetzt seinen eigenen Farbstreifen. Und die Reihenfolge ist nicht mehr die umgekehrte
Freischalt-Reihenfolge (die legte den Bach über die Wiese), sondern eine Landschaft von oben nach
unten: Hügel, Wiese, Bach — dieselbe Reihenfolge, die auch das exportierte Bild zeichnet.

## D34 — Der Wächter misst jetzt sichtbare Rechtecke, nicht rohe
Damit D33 nicht wiederkommt, prüft `layout-guard.mjs` zwei Dinge mehr: Ein Vollbild-Schirm ist
genau so hoch wie der Viewport (und keine feste Leiste endet unterhalb des Bildrands), und ein
belegter Waldplatz bleibt mindestens 40 px groß. Beide Messungen wurden gegengeprüft, indem der
alte Fehler künstlich wieder eingebaut wurde — sie schlagen an, mit genau den 110 px.

Dabei fiel ein Messfehler in der Überlappungsprüfung selbst auf: Sie las rohe
`getBoundingClientRect()`-Werte und meldete damit Inhalt als „unter der Leiste“, der in Wahrheit
im Scrollbereich weggeschnitten ist. Jetzt wird jedes Rechteck erst mit allen schneidenden
Vorfahren und dem Viewport verschnitten. Das ist die schärfere Messung — sie war es, die den
Wald-Fehler überhaupt sichtbar gemacht hat.

Der Wächter fährt außerdem beide Ausbaustufen ab: ein Wald mit 14 Dingen und einer mit 38 über
alle drei Bereiche, dazu Shop, Kiste und die Aktionsblase am Objekt.
