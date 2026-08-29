/**
 * Alle Texte von Funkel liegen hier zentral — so klingt Lob nie repetitiv
 * und nichts ist doppelt hart codiert.
 */

import type { WorldId } from '../db/types'

function pick<T>(list: T[], rng: () => number = Math.random): T {
  return list[Math.floor(rng() * list.length)]
}

/* ---------------------------- Begrüßungen ---------------------------- */

const GREETINGS = [
  'Schön, dass du da bist! Wohin wollen wir heute?',
  'Hallo! Der Wald hat auf dich gewartet.',
  'Da bist du ja! Ich hab schon Beeren gesammelt.',
  'Hey! Such dir ein Abenteuer aus.',
  'Willkommen zurück! Was möchtest du entdecken?',
  'Guten Tag! Heute riecht es nach Abenteuer.',
]

const GREETINGS_NAMED = [
  'Hallo {name}! Womit fangen wir an?',
  '{name}, da bist du ja! Ich freu mich.',
  'Schön dich zu sehen, {name}!',
  '{name}, komm mit — der Wald ist wach.',
]

export function begruessung(name?: string, rng?: () => number): string {
  if (name && Math.random() < 0.6) return pick(GREETINGS_NAMED, rng).replace('{name}', name)
  return pick(GREETINGS, rng)
}

/* ------------------------------ Lob (×10) ---------------------------- */

const PRAISE = [
  'Genau richtig!',
  'Super gemacht!',
  'Das stimmt!',
  'Klasse, weiter so!',
  'Perfekt getroffen!',
  'Stark! Du kannst das.',
  'Richtig! Ich staune.',
  'Ja! Das war knifflig.',
  'Bravo! Genau so.',
  'Toll gemacht!',
]

export function lob(rng?: () => number): string {
  return pick(PRAISE, rng)
}

/* ----------------------------- Trost (×6) ---------------------------- */

const COMFORT = [
  'Fast! Schau nochmal.',
  'Knapp daneben — probier es nochmal.',
  'Nicht schlimm. Noch ein Versuch?',
  'Hm, das war es nicht. Schau genau hin.',
  'Fast richtig! Ich glaub an dich.',
  'Kein Problem — nochmal in Ruhe.',
]

export function trost(rng?: () => number): string {
  return pick(COMFORT, rng)
}

/* -------------------- Nach dem zweiten Fehler: Hilfe ------------------ */

const SHOW_SOLUTION = [
  'Komm, ich zeig es dir.',
  'Ich mach es einmal vor.',
  'Pass auf, so geht das.',
  'Schau her, ich helfe dir.',
]

export function zeigeLoesung(rng?: () => number): string {
  return pick(SHOW_SOLUTION, rng)
}

/* --------------------------- Stufe runter ---------------------------- */

const EASE_OFF = [
  'Das war ganz schön schwer. Machen wir es kurz leichter.',
  'Kein Stress — die nächsten Aufgaben sind einfacher.',
  'Wir nehmen jetzt ein paar leichtere. Du schaffst das.',
  'Ich such dir was Einfacheres raus. Weiter geht’s!',
]

export function leichter(rng?: () => number): string {
  return pick(EASE_OFF, rng)
}

/* --------------------------- Rundenschluss --------------------------- */

export function rundeFertig(richtig: number, gesamt: number, sterne: number): string {
  const kern =
    richtig === gesamt
      ? 'Alles richtig! Wahnsinn!'
      : richtig >= gesamt - 1
        ? 'Fast alles richtig — stark!'
        : richtig >= gesamt / 2
          ? 'Gut gemacht!'
          : 'Geschafft! Übung macht stark.'
  const sternText = sterne === 1 ? 'einen Stern' : `${sterne} Sterne`
  return `${kern} Du hast ${sternText} verdient.`
}

export function meilenstein(titel: string): string {
  return `Du bist jetzt ${titel}! Dafür gibt es Extra-Sterne.`
}

/* ------------------------------ Tageslimit --------------------------- */

export const MUEDE =
  'Ich bin müde – morgen wachsen neue Abenteuer! Deinen Wald darfst du aber noch anschauen.'

/* --------------------------- Hilfetexte je Spiel --------------------- */

export const GAME_HELP: Record<string, string> = {
  'zahlen-ernte': 'Tippe die Früchte an, dann zähle ich mit. Danach tippst du die richtige Zahl.',
  'rechen-bruecke': 'Rechne die Aufgabe in der Mitte. Tippe dann den Stein mit dem Ergebnis.',
  'buchstaben-fang': 'Sprich das Wort langsam mit. Der erste Laut verrät dir den Buchstaben.',
  'wort-baukasten': 'Zieh die Bausteine in die leeren Felder. Ich lese dir jedes Stück vor.',
  'muster-weber': 'Schau dir die Reihe genau an. Welche Perle passt als nächste?',
  'paar-finder': 'Decke zwei Karten auf. Merk dir gut, wo welches Bild war.',
  'zahlen-sprung':
    'Tippe auf die Wiese, dann springe ich. Spring von unten gegen den Block mit dem Ergebnis — oder tipp den Block direkt an, dann flitze ich hin.',
}

export function hilfeFuer(gameId: string): string {
  return GAME_HELP[gameId] ?? 'Tippe auf die richtige Antwort. Ich lese die Aufgabe gern nochmal vor.'
}

/* ------------------------------ Weltkarte ---------------------------- */

export const TOUR: string[] = [
  'Hallo! Ich bin Funkel und zeige dir den Wunderwald.',
  'Im Zahlenland zählst und rechnest du.',
  'Im Buchstabenwald findest du Laute und baust Wörter.',
  'Im Logik-Labor löst du Muster und Rätsel.',
  'Für jede richtige Aufgabe bekommst du Sterne.',
  'Mit den Sternen pflanzt du deinen eigenen Wald. Los geht’s!',
]

const TIPS = [
  'Wusstest du? Eichhörnchen vergessen, wo sie ihre Nüsse vergraben — daraus wachsen neue Bäume.',
  'Wenn du jeden Tag ein bisschen spielst, wachsen deine Bäume weiter.',
  'Tipp: Sag die Aufgabe laut mit. Dann merkst du sie dir besser.',
  'Tipp: Wenn du nicht weiterweißt, tippe auf das Fragezeichen. Dann helfe ich.',
  'Im Wunderwald darf man Fehler machen. Davon lernt man am meisten.',
  'Sterne kannst du in deinem Wald ausgeben. Bäume kosten acht Stück.',
]

export function tippDesTages(rng?: () => number): string {
  return pick(TIPS, rng)
}

/* --------------------------- Welt-Begrüßungen ------------------------ */

export const WORLD_INTRO: Record<WorldId, string> = {
  zahlen: 'Willkommen im Zahlenland! Such dir ein Spiel aus.',
  buchstaben: 'Im Buchstabenwald rascheln die Laute. Womit möchtest du spielen?',
  logik: 'Das Logik-Labor brummt schon. Welches Rätsel darf es sein?',
}
