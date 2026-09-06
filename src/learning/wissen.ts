/**
 * Die Wissensbank der Entdecker-Wiese: Sachkunde für Kinder von 4 bis 10.
 *
 * Jede Frage hat genau drei Antworten, davon genau eine richtige. Antworten
 * sind kurz (ein Emoji, eine Zahl, ein Wort) — sie müssen auf ein Renn-Tor
 * passen und mit einem Kinderfinger treffbar sein.
 *
 * Zwei Sorten von Einträgen:
 *  - **Feste Fragen**: von Hand formuliert, Antworten stehen fest.
 *  - **Familien**: eine Tabelle (Tier → Laut, Ding → Farbe …) erzeugt viele
 *    Fragen; die Ablenker werden bei jedem Ziehen neu aus der Tabelle gelost.
 *
 * Regeln für jeden Eintrag: fachlich richtig, kein Trick, kein Spezialwissen
 * ohne Stufe dafür, jede Frage beim Vorlesen ohne Bild verständlich.
 */

import { pick, sample, shuffle, type Rng } from '../games/rng'

export type WissensThema =
  | 'tiere'
  | 'natur'
  | 'farben'
  | 'koerper'
  | 'alltag'
  | 'jahr'
  | 'verkehr'
  | 'uhr'
  | 'welt'
  | 'formen'

export interface WissensFrage {
  /** Eindeutig je Frage (nicht je Ablenker-Kombination) — für den Wiederholungsschutz */
  id: string
  /** Ab dieser Stufe (1–10) wird die Frage gestellt */
  stufe: number
  thema: WissensThema
  /** Kurzer Text auf dem Schild */
  frage: string
  /** Großes Bild über der Frage (Emoji), wenn es eins gibt */
  bild?: string
  /** Analoge Uhr statt Bild */
  uhr?: { stunde: number; minute: number }
  /** Genau drei Antworten in Anzeigereihenfolge */
  optionen: string[]
  antwort: string
  /** Was Funkel vorliest — ohne Bild verständlich */
  speak: string
  /** Vorlesename je Option, wenn die Option ein Emoji oder eine Abkürzung ist */
  namen?: Record<string, string>
}

interface Familie {
  id: string
  stufe: number
  thema: WissensThema
  /** Wie viele verschiedene Fragen diese Familie liefern kann (für Tests) */
  anzahl: number
  erzeuge(rng: Rng, index: number): WissensFrage
}

/* ------------------------------------------------------------------ */
/* Bausteine                                                           */
/* ------------------------------------------------------------------ */

/** Zwei Ablenker aus einer Tabelle, deren Antwort sich von der Lösung unterscheidet. */
function ablenker<T>(rng: Rng, alle: T[], loesung: T, wert: (t: T) => string, n = 2): T[] {
  const gesehen = new Set([wert(loesung)])
  const kandidaten = shuffle(rng, alle).filter((t) => {
    const w = wert(t)
    if (gesehen.has(w)) return false
    gesehen.add(w)
    return true
  })
  return kandidaten.slice(0, n)
}

function slug(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  if (s) return s
  // Emojis haben keine Buchstaben — dann zählen die Codepunkte.
  return [...text].map((c) => c.codePointAt(0)!.toString(16)).join('')
}

/**
 * Vorlesetext mit den Antworten in ANZEIGE-Reihenfolge. Ein Kind, das noch
 * nicht liest, hört „Welpe, Kalb oder Fohlen" und tippt das zweite Wort —
 * das klappt nur, wenn die Reihenfolge stimmt.
 */
function mitOptionen(speak: string, optionen: string[], namen?: Record<string, string>): string {
  const worte = optionen.map((o) => namen?.[o] ?? o)
  const liste = `${worte.slice(0, -1).join(', ')} oder ${worte[worte.length - 1]}`
  return speak.replace('{optionen}', liste)
}

/** Feste Frage: alles steht, nur die Reihenfolge der Antworten wird beim Ziehen gemischt. */
function fest(
  stufe: number,
  thema: WissensThema,
  frage: string,
  antwort: string,
  falsch: [string, string],
  speak: string,
  extra: Partial<Pick<WissensFrage, 'bild' | 'namen' | 'uhr'>> = {},
): Familie {
  const id = `${thema}-${slug(frage)}-${slug(antwort)}`
  return {
    id,
    stufe,
    thema,
    anzahl: 1,
    erzeuge(rng) {
      const optionen = shuffle(rng, [antwort, ...falsch])
      return {
        id,
        stufe,
        thema,
        frage,
        antwort,
        optionen,
        speak: mitOptionen(speak, optionen, extra.namen),
        ...extra,
      }
    },
  }
}

/** Tabellen-Familie: je Zeile eine Frage, Ablenker aus den anderen Zeilen. */
function tabelle<T>(
  id: string,
  stufe: number,
  thema: WissensThema,
  zeilen: T[],
  bau: (zeile: T, ablenker: T[], rng: Rng) => Omit<WissensFrage, 'id' | 'stufe' | 'thema' | 'optionen'> & {
    optionen?: string[]
  },
  antwortVon: (zeile: T) => string,
): Familie {
  return {
    id,
    stufe,
    thema,
    anzahl: zeilen.length,
    erzeuge(rng, index) {
      const zeile = zeilen[((index % zeilen.length) + zeilen.length) % zeilen.length]
      const andere = ablenker(rng, zeilen, zeile, antwortVon)
      const teil = bau(zeile, andere, rng)
      const optionen = teil.optionen ?? shuffle(rng, [teil.antwort, ...andere.map(antwortVon)])
      return {
        id: `${id}-${slug(antwortVon(zeile))}-${index % zeilen.length}`,
        stufe,
        thema,
        ...teil,
        optionen,
        speak: mitOptionen(teil.speak, optionen, teil.namen),
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/* Tabellen                                                            */
/* ------------------------------------------------------------------ */

const FARBEN = {
  rot: '🔴', orange: '🟠', gelb: '🟡', grün: '🟢', blau: '🔵', lila: '🟣', braun: '🟤', schwarz: '⚫', weiß: '⚪',
} as const
type Farbe = keyof typeof FARBEN
const FARB_NAMEN: Record<string, string> = Object.fromEntries(
  Object.entries(FARBEN).map(([name, emoji]) => [emoji, name]),
)

const DING_FARBEN: { ding: string; emoji: string; farbe: Farbe }[] = [
  { ding: 'eine Banane', emoji: '🍌', farbe: 'gelb' },
  { ding: 'eine Zitrone', emoji: '🍋', farbe: 'gelb' },
  { ding: 'die Sonne', emoji: '☀️', farbe: 'gelb' },
  { ding: 'eine Erdbeere', emoji: '🍓', farbe: 'rot' },
  { ding: 'eine Tomate', emoji: '🍅', farbe: 'rot' },
  { ding: 'ein Feuerwehrauto', emoji: '🚒', farbe: 'rot' },
  { ding: 'ein Frosch', emoji: '🐸', farbe: 'grün' },
  { ding: 'Gras', emoji: '🌿', farbe: 'grün' },
  { ding: 'eine Gurke', emoji: '🥒', farbe: 'grün' },
  { ding: 'der Himmel am Tag', emoji: '🌤️', farbe: 'blau' },
  { ding: 'das Meer', emoji: '🌊', farbe: 'blau' },
  { ding: 'eine Karotte', emoji: '🥕', farbe: 'orange' },
  { ding: 'eine Orange', emoji: '🍊', farbe: 'orange' },
  { ding: 'ein Kürbis', emoji: '🎃', farbe: 'orange' },
  { ding: 'Schnee', emoji: '❄️', farbe: 'weiß' },
  { ding: 'eine Wolke', emoji: '☁️', farbe: 'weiß' },
  { ding: 'eine Aubergine', emoji: '🍆', farbe: 'lila' },
  { ding: 'eine Traube', emoji: '🍇', farbe: 'lila' },
  { ding: 'ein Baumstamm', emoji: '🪵', farbe: 'braun' },
  { ding: 'Schokolade', emoji: '🍫', farbe: 'braun' },
  { ding: 'eine Fledermaus', emoji: '🦇', farbe: 'schwarz' },
  { ding: 'Kohle', emoji: '🪨', farbe: 'schwarz' },
]

const TIER_LAUTE: { tier: string; artikel: string; emoji: string; laut: string; verb: string }[] = [
  { tier: 'Hund', artikel: 'der', emoji: '🐶', laut: 'Wau-wau', verb: 'bellt' },
  { tier: 'Katze', artikel: 'die', emoji: '🐱', laut: 'Miau', verb: 'miaut' },
  { tier: 'Kuh', artikel: 'die', emoji: '🐮', laut: 'Muh', verb: 'muht' },
  { tier: 'Schaf', artikel: 'das', emoji: '🐑', laut: 'Mäh', verb: 'blökt' },
  { tier: 'Schwein', artikel: 'das', emoji: '🐷', laut: 'Oink', verb: 'grunzt' },
  { tier: 'Ente', artikel: 'die', emoji: '🦆', laut: 'Quak', verb: 'quakt' },
  { tier: 'Hahn', artikel: 'der', emoji: '🐓', laut: 'Kikeriki', verb: 'kräht' },
  { tier: 'Löwe', artikel: 'der', emoji: '🦁', laut: 'Roar', verb: 'brüllt' },
  { tier: 'Biene', artikel: 'die', emoji: '🐝', laut: 'Summ', verb: 'summt' },
  { tier: 'Pferd', artikel: 'das', emoji: '🐴', laut: 'Wieher', verb: 'wiehert' },
  { tier: 'Vogel', artikel: 'der', emoji: '🐦', laut: 'Piep', verb: 'piept' },
  { tier: 'Schlange', artikel: 'die', emoji: '🐍', laut: 'Zisch', verb: 'zischt' },
  { tier: 'Maus', artikel: 'die', emoji: '🐭', laut: 'Fiep', verb: 'fiept' },
  { tier: 'Frosch', artikel: 'der', emoji: '🐸', laut: 'Quaak', verb: 'quakt' },
]

const TIER_KINDER: { tier: string; von: string; emoji: string; kind: string }[] = [
  { tier: 'Hund', von: 'vom Hund', emoji: '🐶', kind: 'Welpe' },
  { tier: 'Katze', von: 'von der Katze', emoji: '🐱', kind: 'Kätzchen' },
  { tier: 'Kuh', von: 'von der Kuh', emoji: '🐮', kind: 'Kalb' },
  { tier: 'Pferd', von: 'vom Pferd', emoji: '🐴', kind: 'Fohlen' },
  { tier: 'Schwein', von: 'vom Schwein', emoji: '🐷', kind: 'Ferkel' },
  { tier: 'Schaf', von: 'vom Schaf', emoji: '🐑', kind: 'Lamm' },
  { tier: 'Huhn', von: 'vom Huhn', emoji: '🐔', kind: 'Küken' },
  { tier: 'Frosch', von: 'vom Frosch', emoji: '🐸', kind: 'Kaulquappe' },
  { tier: 'Hase', von: 'vom Hasen', emoji: '🐰', kind: 'Häschen' },
  { tier: 'Ziege', von: 'von der Ziege', emoji: '🐐', kind: 'Zicklein' },
  { tier: 'Schmetterling', von: 'vom Schmetterling', emoji: '🦋', kind: 'Raupe' },
  { tier: 'Reh', von: 'vom Reh', emoji: '🦌', kind: 'Kitz' },
]

const TIER_ZUHAUSE: { tier: string; artikel: string; emoji: string; ort: string }[] = [
  { tier: 'Fisch', artikel: 'der', emoji: '🐟', ort: 'Wasser' },
  { tier: 'Vogel', artikel: 'der', emoji: '🐦', ort: 'Nest' },
  { tier: 'Pferd', artikel: 'das', emoji: '🐴', ort: 'Stall' },
  { tier: 'Fuchs', artikel: 'der', emoji: '🦊', ort: 'Bau' },
  { tier: 'Bär', artikel: 'der', emoji: '🐻', ort: 'Höhle' },
  { tier: 'Biene', artikel: 'die', emoji: '🐝', ort: 'Stock' },
  { tier: 'Spinne', artikel: 'die', emoji: '🕷️', ort: 'Netz' },
  { tier: 'Hund', artikel: 'der', emoji: '🐶', ort: 'Hütte' },
  { tier: 'Eichhörnchen', artikel: 'das', emoji: '🐿️', ort: 'Baum' },
]

const TIER_FUTTER: { tier: string; artikel: string; emoji: string; futter: string; futterName: string }[] = [
  { tier: 'Hase', artikel: 'der', emoji: '🐰', futter: '🥕', futterName: 'Karotte' },
  { tier: 'Kuh', artikel: 'die', emoji: '🐮', futter: '🌿', futterName: 'Gras' },
  { tier: 'Affe', artikel: 'der', emoji: '🐒', futter: '🍌', futterName: 'Banane' },
  { tier: 'Vogel', artikel: 'der', emoji: '🐦', futter: '🪱', futterName: 'Wurm' },
  { tier: 'Bär', artikel: 'der', emoji: '🐻', futter: '🍯', futterName: 'Honig' },
  { tier: 'Panda', artikel: 'der', emoji: '🐼', futter: '🎋', futterName: 'Bambus' },
  { tier: 'Eichhörnchen', artikel: 'das', emoji: '🐿️', futter: '🌰', futterName: 'Nuss' },
  { tier: 'Biene', artikel: 'die', emoji: '🐝', futter: '🌸', futterName: 'Blüte' },
  { tier: 'Pinguin', artikel: 'der', emoji: '🐧', futter: '🐟', futterName: 'Fisch' },
  { tier: 'Koala', artikel: 'der', emoji: '🐨', futter: '🍃', futterName: 'Blatt' },
]

const GEGENTEILE: [string, string][] = [
  ['heiß', 'kalt'], ['groß', 'klein'], ['hell', 'dunkel'], ['schnell', 'langsam'],
  ['laut', 'leise'], ['nass', 'trocken'], ['oben', 'unten'], ['schwer', 'leicht'],
  ['voll', 'leer'], ['dick', 'dünn'], ['hart', 'weich'], ['süß', 'sauer'],
  ['alt', 'jung'], ['lang', 'kurz'], ['offen', 'zu'],
]

const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

const BEINE: { tier: string; emoji: string; beine: number }[] = [
  { tier: 'ein Hund', emoji: '🐶', beine: 4 },
  { tier: 'eine Katze', emoji: '🐱', beine: 4 },
  { tier: 'ein Pferd', emoji: '🐴', beine: 4 },
  { tier: 'ein Vogel', emoji: '🐦', beine: 2 },
  { tier: 'ein Huhn', emoji: '🐔', beine: 2 },
  { tier: 'eine Spinne', emoji: '🕷️', beine: 8 },
  { tier: 'eine Biene', emoji: '🐝', beine: 6 },
  { tier: 'eine Ameise', emoji: '🐜', beine: 6 },
  { tier: 'ein Käfer', emoji: '🐞', beine: 6 },
  { tier: 'eine Schlange', emoji: '🐍', beine: 0 },
  { tier: 'ein Fisch', emoji: '🐟', beine: 0 },
  { tier: 'ein Mensch', emoji: '🧒', beine: 2 },
]

const LEBENSRAEUME: { tier: string; emoji: string; ort: string }[] = [
  { tier: 'der Pinguin', emoji: '🐧', ort: 'Eis' },
  { tier: 'der Eisbär', emoji: '🐻‍❄️', ort: 'Eis' },
  { tier: 'das Kamel', emoji: '🐫', ort: 'Wüste' },
  { tier: 'der Hai', emoji: '🦈', ort: 'Meer' },
  { tier: 'der Wal', emoji: '🐋', ort: 'Meer' },
  { tier: 'die Eule', emoji: '🦉', ort: 'Wald' },
  { tier: 'das Eichhörnchen', emoji: '🐿️', ort: 'Wald' },
  { tier: 'der Frosch', emoji: '🐸', ort: 'Teich' },
  { tier: 'die Kuh', emoji: '🐮', ort: 'Wiese' },
  { tier: 'der Affe', emoji: '🐒', ort: 'Dschungel' },
  { tier: 'das Krokodil', emoji: '🐊', ort: 'Fluss' },
]

const MATERIAL: { ding: string; emoji: string; stoff: string }[] = [
  { ding: 'ein Fenster', emoji: '🪟', stoff: 'Glas' },
  { ding: 'ein Tisch', emoji: '🪑', stoff: 'Holz' },
  { ding: 'ein Pullover', emoji: '🧶', stoff: 'Wolle' },
  { ding: 'ein Schlüssel', emoji: '🔑', stoff: 'Metall' },
  { ding: 'ein Buch', emoji: '📕', stoff: 'Papier' },
  { ding: 'ein Fahrradreifen', emoji: '🚲', stoff: 'Gummi' },
  { ding: 'eine Mauer', emoji: '🧱', stoff: 'Stein' },
  { ding: 'ein Luftballon', emoji: '🎈', stoff: 'Gummi' },
  { ding: 'eine Zeitung', emoji: '📰', stoff: 'Papier' },
]

const BERUFE: { frage: string; beruf: string; emoji: string }[] = [
  { frage: 'Wer löscht Feuer?', beruf: 'Feuerwehr', emoji: '🚒' },
  { frage: 'Wer hilft dir, wenn du krank bist?', beruf: 'Ärztin', emoji: '🩺' },
  { frage: 'Wer backt Brot und Brötchen?', beruf: 'Bäcker', emoji: '🥖' },
  { frage: 'Wer bringt die Briefe?', beruf: 'Postbotin', emoji: '✉️' },
  { frage: 'Wer fährt den Bus?', beruf: 'Busfahrer', emoji: '🚌' },
  { frage: 'Wer baut Häuser?', beruf: 'Maurer', emoji: '🧱' },
  { frage: 'Wer hilft kranken Tieren?', beruf: 'Tierärztin', emoji: '🐾' },
  { frage: 'Wer schneidet Haare?', beruf: 'Friseur', emoji: '✂️' },
  { frage: 'Wer unterrichtet in der Schule?', beruf: 'Lehrerin', emoji: '🏫' },
  { frage: 'Wer kocht im Restaurant?', beruf: 'Koch', emoji: '🍳' },
  { frage: 'Wer fliegt das Flugzeug?', beruf: 'Pilotin', emoji: '✈️' },
  { frage: 'Wer pflanzt und pflegt Blumen?', beruf: 'Gärtner', emoji: '🌷' },
]

const WERKZEUGE: { wer: string; werkzeug: string; emoji: string }[] = [
  { wer: 'ein Maler', werkzeug: 'Pinsel', emoji: '🖌️' },
  { wer: 'eine Ärztin', werkzeug: 'Stethoskop', emoji: '🩺' },
  { wer: 'ein Gärtner', werkzeug: 'Gießkanne', emoji: '🪣' },
  { wer: 'eine Köchin', werkzeug: 'Kochtopf', emoji: '🍲' },
  { wer: 'ein Zimmermann', werkzeug: 'Hammer', emoji: '🔨' },
  { wer: 'eine Friseurin', werkzeug: 'Schere', emoji: '✂️' },
  { wer: 'die Feuerwehr', werkzeug: 'Schlauch', emoji: '🧯' },
  { wer: 'ein Fotograf', werkzeug: 'Kamera', emoji: '📷' },
  { wer: 'eine Bäckerin', werkzeug: 'Backofen', emoji: '🍞' },
  { wer: 'ein Schreiner', werkzeug: 'Säge', emoji: '🪚' },
]

const HERKUNFT: { frage: string; antwort: string; falsch: [string, string]; bild: string; speak: string }[] = [
  { frage: 'Woher kommt Milch?', antwort: 'Kuh', falsch: ['Huhn', 'Biene'], bild: '🥛', speak: 'Von welchem Tier kommt die Milch? Von der Kuh, vom Huhn oder von der Biene?' },
  { frage: 'Woher kommt Honig?', antwort: 'Biene', falsch: ['Kuh', 'Schaf'], bild: '🍯', speak: 'Von welchem Tier kommt der Honig? Von der Biene, der Kuh oder dem Schaf?' },
  { frage: 'Woher kommt Wolle?', antwort: 'Schaf', falsch: ['Schwein', 'Ente'], bild: '🧶', speak: 'Von welchem Tier kommt die Wolle? Vom Schaf, vom Schwein oder von der Ente?' },
  { frage: 'Woher kommen Eier?', antwort: 'Huhn', falsch: ['Kuh', 'Hund'], bild: '🥚', speak: 'Von welchem Tier kommen die Eier? Vom Huhn, von der Kuh oder vom Hund?' },
  { frage: 'Woraus wird Brot gemacht?', antwort: 'Mehl', falsch: ['Sand', 'Wolle'], bild: '🍞', speak: 'Woraus wird Brot gemacht? Aus Mehl, aus Sand oder aus Wolle?' },
  { frage: 'Woraus wird Käse gemacht?', antwort: 'Milch', falsch: ['Wasser', 'Mehl'], bild: '🧀', speak: 'Woraus wird Käse gemacht? Aus Milch, aus Wasser oder aus Mehl?' },
  { frage: 'Woraus werden Pommes gemacht?', antwort: 'Kartoffel', falsch: ['Apfel', 'Reis'], bild: '🍟', speak: 'Woraus werden Pommes gemacht? Aus Kartoffeln, aus Äpfeln oder aus Reis?' },
  { frage: 'Woraus wird Papier gemacht?', antwort: 'Holz', falsch: ['Stein', 'Glas'], bild: '📄', speak: 'Woraus wird Papier gemacht? Aus Holz, aus Stein oder aus Glas?' },
  { frage: 'Woraus wird Apfelsaft gemacht?', antwort: 'Äpfel', falsch: ['Karotten', 'Nüsse'], bild: '🧃', speak: 'Woraus wird Apfelsaft gemacht? Aus Äpfeln, aus Karotten oder aus Nüssen?' },
  { frage: 'Woraus wird Schokolade gemacht?', antwort: 'Kakao', falsch: ['Kaffee', 'Kohle'], bild: '🍫', speak: 'Woraus wird Schokolade gemacht? Aus Kakao, aus Kaffee oder aus Kohle?' },
]

const VERWANDLUNG: { frage: string; antwort: string; falsch: [string, string]; bild: string; speak: string }[] = [
  { frage: 'Was wird aus einer Raupe?', antwort: '🦋', falsch: ['🐝', '🐌'], bild: '🐛', speak: 'Was wird aus einer Raupe? Ein Schmetterling, eine Biene oder eine Schnecke?' },
  { frage: 'Was wird aus einer Kaulquappe?', antwort: '🐸', falsch: ['🐟', '🐢'], bild: '💧', speak: 'Was wird aus einer Kaulquappe? Ein Frosch, ein Fisch oder eine Schildkröte?' },
  { frage: 'Was schlüpft aus einem Hühnerei?', antwort: '🐥', falsch: ['🐟', '🐰'], bild: '🥚', speak: 'Was schlüpft aus einem Hühnerei? Ein Küken, ein Fisch oder ein Hase?' },
  { frage: 'Was wird aus einem Samen?', antwort: '🌱', falsch: ['🪨', '🐜'], bild: '🌰', speak: 'Was wird aus einem Samen? Eine Pflanze, ein Stein oder eine Ameise?' },
  { frage: 'Was wird aus einer Blüte?', antwort: '🍎', falsch: ['🪨', '❄️'], bild: '🌸', speak: 'Was wird aus einer Blüte am Apfelbaum? Ein Apfel, ein Stein oder Schnee?' },
]
const VERWANDLUNG_NAMEN: Record<string, string> = {
  '🦋': 'Schmetterling', '🐝': 'Biene', '🐌': 'Schnecke', '🐸': 'Frosch', '🐟': 'Fisch', '🐢': 'Schildkröte',
  '🐥': 'Küken', '🐰': 'Hase', '🌱': 'Pflanze', '🪨': 'Stein', '🐜': 'Ameise', '🍎': 'Apfel', '❄️': 'Schnee',
}

/* ------------------------------------------------------------------ */
/* Uhrzeiten                                                           */
/* ------------------------------------------------------------------ */

/** Wie eine Uhrzeit auf dem Tor steht — kurz, so wie Kinder sie sagen. */
export function uhrText(stunde: number, minute: number): string {
  const h = ((stunde - 1) % 12) + 1
  const naechste = (h % 12) + 1
  if (minute === 0) return `${h} Uhr`
  if (minute === 30) return `halb ${naechste}`
  if (minute === 15) return `Viertel nach ${h}`
  if (minute === 45) return `Viertel vor ${naechste}`
  return `${h}:${String(minute).padStart(2, '0')}`
}

function uhrFamilie(id: string, stufe: number, minuten: number[], anzahl: number): Familie {
  return {
    id,
    stufe,
    thema: 'uhr',
    anzahl,
    erzeuge(rng, index) {
      const stunde = (index % 12) + 1
      const minute = minuten[Math.floor(index / 12) % minuten.length]
      const antwort = uhrText(stunde, minute)
      const falsch = new Set<string>()
      let schutz = 0
      while (falsch.size < 2 && schutz++ < 40) {
        const s = ((stunde - 1 + Math.floor(rng() * 11) + 1) % 12) + 1
        const m = pick(rng, minuten)
        const t = uhrText(s, m)
        if (t !== antwort) falsch.add(t)
      }
      // Notnagel, falls die Minutenliste nur einen Wert kennt und die Stunden knapp sind
      for (let s = 1; falsch.size < 2 && s <= 12; s++) {
        const t = uhrText(s, minuten[0])
        if (t !== antwort) falsch.add(t)
      }
      return {
        id: `${id}-${stunde}-${minute}`,
        stufe,
        thema: 'uhr',
        frage: 'Wie spät ist es?',
        uhr: { stunde, minute },
        optionen: shuffle(rng, [antwort, ...falsch]),
        antwort,
        speak: 'Schau auf die Uhr. Wie spät ist es?',
      }
    },
  }
}

/* ------------------------------------------------------------------ */
/* Die Bank                                                            */
/* ------------------------------------------------------------------ */

const TIER_NAMEN: Record<string, string> = Object.fromEntries([
  ...TIER_LAUTE.map((t) => [t.emoji, t.tier]),
  ...TIER_KINDER.map((t) => [t.emoji, t.tier]),
  ...TIER_ZUHAUSE.map((t) => [t.emoji, t.tier]),
  ...TIER_FUTTER.map((t) => [t.futter, t.futterName]),
  ...Object.entries(VERWANDLUNG_NAMEN),
])

export const WISSEN_FAMILIEN: Familie[] = [
  /* ---------- Stufe 1: Tiere, Farben, groß und klein ---------- */
  tabelle('tierlaut', 1, 'tiere', TIER_LAUTE, (z, andere) => ({
    frage: `Wer macht „${z.laut}"?`,
    antwort: z.emoji,
    speak: `Welches Tier macht ${z.laut}? ${[z, ...andere].map((t) => `${t.artikel} ${t.tier}`).join(', ')} — wer ${z.verb} so?`,
    namen: TIER_NAMEN,
  }), (z) => z.emoji),
  tabelle('farbe', 1, 'farben', DING_FARBEN, (z, andere) => ({
    frage: `Welche Farbe hat ${z.ding}?`,
    bild: z.emoji,
    antwort: FARBEN[z.farbe],
    speak: `Welche Farbe hat ${z.ding}? ${[z, ...andere].map((t) => t.farbe).join(', ')}?`,
    namen: FARB_NAMEN,
  }), (z) => FARBEN[z.farbe]),
  fest(1, 'tiere', 'Was ist am größten?', '🐘', ['🐭', '🐜'], 'Was ist am größten? {optionen}?', { namen: { '🐘': 'Elefant', '🐭': 'Maus', '🐜': 'Ameise' } }),
  fest(1, 'tiere', 'Was ist am kleinsten?', '🐜', ['🐴', '🐶'], 'Was ist am kleinsten? {optionen}?', { namen: { '🐜': 'Ameise', '🐴': 'Pferd', '🐶': 'Hund' } }),
  fest(1, 'tiere', 'Was ist am größten?', '🐋', ['🐟', '🐸'], 'Was ist am größten? {optionen}?', { namen: { '🐋': 'Wal', '🐟': 'Fisch', '🐸': 'Frosch' } }),
  fest(1, 'tiere', 'Wer kann fliegen?', '🐦', ['🐟', '🐍'], 'Wer kann fliegen? {optionen}?', { namen: { '🐦': 'Vogel', '🐟': 'Fisch', '🐍': 'Schlange' } }),
  fest(1, 'tiere', 'Wer kann fliegen?', '🦋', ['🐢', '🐌'], 'Wer kann fliegen? {optionen}?', { namen: { '🦋': 'Schmetterling', '🐢': 'Schildkröte', '🐌': 'Schnecke' } }),
  fest(1, 'tiere', 'Wer kann schwimmen?', '🐟', ['🐱', '🐔'], 'Wer kann gut schwimmen? {optionen}?', { namen: { '🐟': 'Fisch', '🐱': 'Katze', '🐔': 'Huhn' } }),
  fest(1, 'tiere', 'Wer lebt im Wasser?', '🐬', ['🐰', '🐿️'], 'Wer lebt im Wasser? {optionen}?', { namen: { '🐬': 'Delfin', '🐰': 'Hase', '🐿️': 'Eichhörnchen' } }),
  fest(1, 'natur', 'Was scheint am Tag?', '☀️', ['🌙', '⭐'], 'Was scheint am Tag hell am Himmel? {optionen}?', { namen: { '☀️': 'Sonne', '🌙': 'Mond', '⭐': 'Stern' } }),
  fest(1, 'natur', 'Was siehst du nachts?', '🌙', ['☀️', '🌈'], 'Was siehst du nachts am Himmel? {optionen}?', { namen: { '🌙': 'Mond', '☀️': 'Sonne', '🌈': 'Regenbogen' } }),
  fest(1, 'alltag', 'Was ziehst du an die Füße?', '👟', ['🧢', '🧤'], 'Was ziehst du an die Füße? {optionen}?', { namen: { '👟': 'Schuhe', '🧢': 'Mütze', '🧤': 'Handschuhe' } }),
  fest(1, 'alltag', 'Was setzt du auf den Kopf?', '🧢', ['🧦', '👖'], 'Was setzt du auf den Kopf? {optionen}?', { namen: { '🧢': 'Mütze', '🧦': 'Socken', '👖': 'Hose' } }),
  fest(1, 'alltag', 'Womit putzt du Zähne?', '🪥', ['🧹', '🔨'], 'Womit putzt du deine Zähne? {optionen}?', { namen: { '🪥': 'Zahnbürste', '🧹': 'Besen', '🔨': 'Hammer' } }),
  fest(1, 'alltag', 'Womit isst du Suppe?', '🥄', ['🔪', '✏️'], 'Womit isst du Suppe? {optionen}?', { namen: { '🥄': 'Löffel', '🔪': 'Messer', '✏️': 'Stift' } }),
  fest(1, 'natur', 'Was wächst im Garten?', '🌷', ['🚗', '🪑'], 'Was wächst im Garten? {optionen}?', { namen: { '🌷': 'Blume', '🚗': 'Auto', '🪑': 'Stuhl' } }),
  fest(1, 'alltag', 'Was ist zum Essen?', '🍎', ['⚽', '🧸'], 'Was kann man essen? {optionen}?', { namen: { '🍎': 'Apfel', '⚽': 'Ball', '🧸': 'Teddy' } }),
  fest(1, 'alltag', 'Was ist zum Trinken?', '🥛', ['🍞', '🧀'], 'Was kann man trinken? {optionen}?', { namen: { '🥛': 'Milch', '🍞': 'Brot', '🧀': 'Käse' } }),

  /* ---------- Stufe 2: Tierkinder, Zuhause, Wetter ---------- */
  tabelle('tierkind', 2, 'tiere', TIER_KINDER, (z, andere) => ({
    frage: `Wie heißt das Kind ${z.von}?`,
    bild: z.emoji,
    antwort: z.kind,
    speak: `Wie heißt das Kind ${z.von}? ${[z, ...andere].map((t) => t.kind).join(', ')}?`,
  }), (z) => z.kind),
  tabelle('zuhause', 2, 'tiere', TIER_ZUHAUSE, (z, andere) => ({
    frage: `Wo wohnt ${z.artikel} ${z.tier}?`,
    bild: z.emoji,
    antwort: z.ort,
    speak: `Wo wohnt ${z.artikel} ${z.tier}? ${[z, ...andere].map((t) => t.ort).join(', ')}?`,
  }), (z) => z.ort),
  fest(2, 'natur', 'Was fällt bei Regen?', '💧', ['🍂', '⭐'], 'Was fällt vom Himmel, wenn es regnet? {optionen}?', { namen: { '💧': 'Tropfen', '🍂': 'Blätter', '⭐': 'Sterne' } }),
  fest(2, 'alltag', 'Was hilft bei Regen?', '☂️', ['🕶️', '🏓'], 'Was hilft dir bei Regen? {optionen}?', { namen: { '☂️': 'Schirm', '🕶️': 'Sonnenbrille', '🏓': 'Schläger' } }),
  fest(2, 'alltag', 'Was hilft bei Kälte?', '🧤', ['🩳', '🩴'], 'Was hilft dir, wenn es kalt ist? {optionen}?', { namen: { '🧤': 'Handschuhe', '🩳': 'kurze Hose', '🩴': 'Flipflops' } }),
  fest(2, 'alltag', 'Was hilft bei Sonne?', '🧢', ['🧣', '☔'], 'Was hilft dir, wenn die Sonne stark scheint? {optionen}?', { namen: { '🧢': 'Kappe', '🧣': 'Schal', '☔': 'Regenschirm' } }),
  fest(2, 'natur', 'Woraus ist ein Schneemann?', '❄️', ['🪨', '🌿'], 'Woraus baut man einen Schneemann? {optionen}?', { namen: { '❄️': 'Schnee', '🪨': 'Steine', '🌿': 'Gras' } }),
  fest(2, 'natur', 'Was macht der Wind?', '🍃', ['🔥', '🧊'], 'Was bewegt der Wind? {optionen}?', { namen: { '🍃': 'Blätter', '🔥': 'Feuer', '🧊': 'Eiswürfel' } }),
  fest(2, 'natur', 'Wann siehst du Sterne?', 'nachts', ['mittags', 'morgens'], 'Wann siehst du die Sterne am Himmel? {optionen}?'),
  fest(2, 'alltag', 'Was machst du morgens?', 'aufstehen', ['schlafen', 'träumen'], 'Was machst du morgens zuerst? {optionen}?'),
  fest(2, 'tiere', 'Wer legt Eier?', '🐔', ['🐶', '🐮'], 'Wer legt Eier? {optionen}?', { namen: { '🐔': 'Huhn', '🐶': 'Hund', '🐮': 'Kuh' } }),
  fest(2, 'tiere', 'Wer hat Stacheln?', '🦔', ['🐰', '🐱'], 'Wer hat Stacheln? {optionen}?', { namen: { '🦔': 'Igel', '🐰': 'Hase', '🐱': 'Katze' } }),
  fest(2, 'tiere', 'Wer hat Federn?', '🦆', ['🐷', '🐍'], 'Wer hat Federn? {optionen}?', { namen: { '🦆': 'Ente', '🐷': 'Schwein', '🐍': 'Schlange' } }),
  fest(2, 'tiere', 'Wer hat einen Panzer?', '🐢', ['🐭', '🐦'], 'Wer hat einen Panzer? {optionen}?', { namen: { '🐢': 'Schildkröte', '🐭': 'Maus', '🐦': 'Vogel' } }),
  fest(2, 'tiere', 'Wer hat einen Rüssel?', '🐘', ['🦒', '🐻'], 'Wer hat einen Rüssel? {optionen}?', { namen: { '🐘': 'Elefant', '🦒': 'Giraffe', '🐻': 'Bär' } }),
  fest(2, 'tiere', 'Wer hat einen langen Hals?', '🦒', ['🐷', '🐸'], 'Wer hat einen langen Hals? {optionen}?', { namen: { '🦒': 'Giraffe', '🐷': 'Schwein', '🐸': 'Frosch' } }),

  /* ---------- Stufe 3: Obst und Gemüse, Körper, Formen ---------- */
  fest(3, 'natur', 'Was ist Obst?', '🍎', ['🥕', '🥦'], 'Was ist Obst? {optionen}?', { namen: { '🍎': 'Apfel', '🥕': 'Karotte', '🥦': 'Brokkoli' } }),
  fest(3, 'natur', 'Was ist Obst?', '🍌', ['🥒', '🧅'], 'Was ist Obst? {optionen}?', { namen: { '🍌': 'Banane', '🥒': 'Gurke', '🧅': 'Zwiebel' } }),
  fest(3, 'natur', 'Was ist Gemüse?', '🥕', ['🍓', '🍇'], 'Was ist Gemüse? {optionen}?', { namen: { '🥕': 'Karotte', '🍓': 'Erdbeere', '🍇': 'Traube' } }),
  fest(3, 'natur', 'Was ist Gemüse?', '🥦', ['🍑', '🍒'], 'Was ist Gemüse? {optionen}?', { namen: { '🥦': 'Brokkoli', '🍑': 'Pfirsich', '🍒': 'Kirsche' } }),
  fest(3, 'natur', 'Was wächst am Baum?', '🍎', ['🥔', '🥕'], 'Was wächst am Baum? {optionen}?', { namen: { '🍎': 'Apfel', '🥔': 'Kartoffel', '🥕': 'Karotte' } }),
  fest(3, 'natur', 'Was wächst unter der Erde?', '🥔', ['🍒', '🍌'], 'Was wächst unter der Erde? {optionen}?', { namen: { '🥔': 'Kartoffel', '🍒': 'Kirsche', '🍌': 'Banane' } }),
  fest(3, 'koerper', 'Womit hörst du?', '👂', ['👃', '👁️'], 'Womit hörst du? {optionen}?', { namen: { '👂': 'Ohr', '👃': 'Nase', '👁️': 'Auge' } }),
  fest(3, 'koerper', 'Womit riechst du?', '👃', ['👂', '🦶'], 'Womit riechst du? {optionen}?', { namen: { '👃': 'Nase', '👂': 'Ohr', '🦶': 'Fuß' } }),
  fest(3, 'koerper', 'Womit siehst du?', '👁️', ['👄', '✋'], 'Womit siehst du? {optionen}?', { namen: { '👁️': 'Auge', '👄': 'Mund', '✋': 'Hand' } }),
  fest(3, 'koerper', 'Womit schmeckst du?', '👅', ['👂', '🦵'], 'Womit schmeckst du? {optionen}?', { namen: { '👅': 'Zunge', '👂': 'Ohr', '🦵': 'Bein' } }),
  fest(3, 'koerper', 'Womit greifst du?', '✋', ['👃', '🦶'], 'Womit greifst du etwas? {optionen}?', { namen: { '✋': 'Hand', '👃': 'Nase', '🦶': 'Fuß' } }),
  fest(3, 'koerper', 'Wie viele Finger hat eine Hand?', '5', ['4', '10'], 'Wie viele Finger hat eine Hand? {optionen}?', { bild: '✋' }),
  fest(3, 'koerper', 'Wie viele Augen hast du?', '2', ['1', '3'], 'Wie viele Augen hast du? {optionen}?', { bild: '👀' }),
  fest(3, 'koerper', 'Wie viele Zehen hat ein Fuß?', '5', ['3', '6'], 'Wie viele Zehen hat ein Fuß? {optionen}?', { bild: '🦶' }),
  fest(3, 'formen', 'Welche Form hat ein Ball?', '⚪', ['⬜', '🔺'], 'Welche Form hat ein Ball? {optionen}?', { bild: '⚽', namen: { '⚪': 'Kreis', '⬜': 'Quadrat', '🔺': 'Dreieck' } }),
  fest(3, 'formen', 'Welche Form hat ein Dach?', '🔺', ['⚪', '⬜'], 'Welche Form hat ein Hausdach? {optionen}?', { bild: '🏠', namen: { '🔺': 'Dreieck', '⚪': 'Kreis', '⬜': 'Quadrat' } }),
  fest(3, 'formen', 'Welche Form hat ein Würfel?', '⬜', ['⚪', '🔺'], 'Welche Form hat die Seite eines Würfels? {optionen}?', { bild: '🎲', namen: { '⬜': 'Quadrat', '⚪': 'Kreis', '🔺': 'Dreieck' } }),
  fest(3, 'formen', 'Wie viele Ecken hat ein Dreieck?', '3', ['4', '0'], 'Wie viele Ecken hat ein Dreieck? {optionen}?', { bild: '🔺' }),
  fest(3, 'formen', 'Wie viele Ecken hat ein Quadrat?', '4', ['3', '5'], 'Wie viele Ecken hat ein Quadrat? {optionen}?', { bild: '⬜' }),
  fest(3, 'formen', 'Wie viele Ecken hat ein Kreis?', '0', ['1', '4'], 'Wie viele Ecken hat ein Kreis? {optionen}?', { bild: '⚪' }),
  fest(3, 'alltag', 'Was ist kalt?', '🧊', ['🔥', '☀️'], 'Was ist kalt? {optionen}?', { namen: { '🧊': 'Eiswürfel', '🔥': 'Feuer', '☀️': 'Sonne' } }),
  fest(3, 'alltag', 'Was ist heiß?', '🔥', ['❄️', '🧊'], 'Was ist heiß? {optionen}?', { namen: { '🔥': 'Feuer', '❄️': 'Schnee', '🧊': 'Eiswürfel' } }),
  fest(3, 'alltag', 'Was ist weich?', '🧸', ['🪨', '🔩'], 'Was ist weich? {optionen}?', { namen: { '🧸': 'Teddy', '🪨': 'Stein', '🔩': 'Schraube' } }),
  fest(3, 'alltag', 'Was ist süß?', '🍯', ['🍋', '🧂'], 'Was schmeckt süß? {optionen}?', { namen: { '🍯': 'Honig', '🍋': 'Zitrone', '🧂': 'Salz' } }),
  fest(3, 'alltag', 'Was ist sauer?', '🍋', ['🍬', '🍯'], 'Was schmeckt sauer? {optionen}?', { namen: { '🍋': 'Zitrone', '🍬': 'Bonbon', '🍯': 'Honig' } }),

  /* ---------- Stufe 4: Jahreszeiten, Futter, Gegenteile ---------- */
  fest(4, 'jahr', 'Wann fällt Schnee?', 'Winter', ['Sommer', 'Frühling'], 'In welcher Jahreszeit fällt Schnee? {optionen}?', { bild: '⛄' }),
  fest(4, 'jahr', 'Wann werden Blätter bunt?', 'Herbst', ['Frühling', 'Sommer'], 'In welcher Jahreszeit werden die Blätter bunt? {optionen}?', { bild: '🍂' }),
  fest(4, 'jahr', 'Wann blühen die ersten Blumen?', 'Frühling', ['Winter', 'Herbst'], 'In welcher Jahreszeit blühen die ersten Blumen? {optionen}?', { bild: '🌷' }),
  fest(4, 'jahr', 'Wann ist es am wärmsten?', 'Sommer', ['Winter', 'Herbst'], 'In welcher Jahreszeit ist es am wärmsten? {optionen}?', { bild: '☀️' }),
  fest(4, 'jahr', 'Was gehört zum Winter?', '⛄', ['🏖️', '🍂'], 'Was gehört zum Winter? {optionen}?', { namen: { '⛄': 'Schneemann', '🏖️': 'Strand', '🍂': 'Herbstlaub' } }),
  fest(4, 'jahr', 'Was gehört zum Sommer?', '🍦', ['⛄', '🎃'], 'Was gehört zum Sommer? {optionen}?', { namen: { '🍦': 'Eis', '⛄': 'Schneemann', '🎃': 'Kürbis' } }),
  fest(4, 'jahr', 'Was gehört zum Herbst?', '🎃', ['🌷', '🏊'], 'Was gehört zum Herbst? {optionen}?', { namen: { '🎃': 'Kürbis', '🌷': 'Tulpe', '🏊': 'Schwimmen' } }),
  fest(4, 'jahr', 'Was gehört zum Frühling?', '🐣', ['🎿', '🍁'], 'Was gehört zum Frühling? {optionen}?', { namen: { '🐣': 'Küken', '🎿': 'Skifahren', '🍁': 'Ahornblatt' } }),
  fest(4, 'jahr', 'Wie viele Jahreszeiten gibt es?', '4', ['2', '7'], 'Wie viele Jahreszeiten gibt es? {optionen}?', { bild: '🍂' }),
  fest(4, 'jahr', 'Was kommt nach dem Winter?', 'Frühling', ['Herbst', 'Sommer'], 'Welche Jahreszeit kommt nach dem Winter? {optionen}?'),
  fest(4, 'jahr', 'Was kommt nach dem Sommer?', 'Herbst', ['Winter', 'Frühling'], 'Welche Jahreszeit kommt nach dem Sommer? {optionen}?'),
  tabelle('futter', 4, 'tiere', TIER_FUTTER, (z, andere) => ({
    frage: `Was frisst ${z.artikel} ${z.tier} gern?`,
    bild: z.emoji,
    antwort: z.futter,
    speak: `Was frisst ${z.artikel} ${z.tier} gern? ${[z, ...andere].map((t) => t.futterName).join(', ')}?`,
    namen: TIER_NAMEN,
  }), (z) => z.futter),
  {
    id: 'gegenteil',
    stufe: 4,
    thema: 'alltag',
    anzahl: GEGENTEILE.length * 2,
    erzeuge(rng, index) {
      const paar = GEGENTEILE[Math.floor(index / 2) % GEGENTEILE.length]
      const [wort, gegen] = index % 2 === 0 ? paar : [paar[1], paar[0]]
      const andere = sample(
        rng,
        GEGENTEILE.flat().filter((w) => w !== wort && w !== gegen),
        2,
      )
      return {
        id: `gegenteil-${slug(wort)}`,
        stufe: 4,
        thema: 'alltag',
        frage: `Gegenteil von „${wort}"?`,
        antwort: gegen,
        optionen: shuffle(rng, [gegen, ...andere]),
        speak: `Was ist das Gegenteil von ${wort}? ${[gegen, ...andere].join(', ')}?`,
      }
    },
  },
  fest(4, 'natur', 'Was braucht eine Pflanze?', '💧', ['🍬', '🔊'], 'Was braucht eine Pflanze zum Wachsen? {optionen}?', { bild: '🌱', namen: { '💧': 'Wasser', '🍬': 'Bonbons', '🔊': 'Lärm' } }),
  fest(4, 'natur', 'Was braucht eine Pflanze noch?', '☀️', ['🌙', '🎵'], 'Was braucht eine Pflanze außer Wasser noch zum Wachsen? {optionen}?', { bild: '🌻', namen: { '☀️': 'Sonnenlicht', '🌙': 'Mondschein', '🎵': 'Musik' } }),
  fest(4, 'natur', 'Wo leben Fische?', 'Wasser', ['Luft', 'Sand'], 'Wo leben Fische? {optionen}?', { bild: '🐠' }),
  fest(4, 'natur', 'Was macht ein Baum im Herbst?', 'Blätter fallen', ['Blüten', 'Schnee'], 'Was passiert bei vielen Bäumen im Herbst? {optionen}?', { bild: '🍁' }),

  /* ---------- Stufe 5: volle Stunden, Wochentage, Verkehr ---------- */
  uhrFamilie('uhr-voll', 5, [0], 12),
  {
    id: 'wochentag-nach',
    stufe: 5,
    thema: 'jahr',
    anzahl: 7,
    erzeuge(rng, index) {
      const i = index % 7
      const tag = WOCHENTAGE[i]
      const antwort = WOCHENTAGE[(i + 1) % 7]
      const andere = sample(rng, WOCHENTAGE.filter((t) => t !== antwort && t !== tag), 2)
      return {
        id: `wochentag-nach-${slug(tag)}`,
        stufe: 5,
        thema: 'jahr',
        frage: `Welcher Tag kommt nach ${tag}?`,
        antwort,
        optionen: shuffle(rng, [antwort, ...andere]),
        speak: `Welcher Tag kommt nach ${tag}? ${[antwort, ...andere].join(', ')}?`,
        bild: '📅',
      }
    },
  },
  fest(5, 'jahr', 'Wie viele Tage hat eine Woche?', '7', ['5', '10'], 'Wie viele Tage hat eine Woche? {optionen}?', { bild: '📅' }),
  fest(5, 'jahr', 'Welcher Tag ist Wochenende?', 'Sonntag', ['Dienstag', 'Mittwoch'], 'Welcher dieser Tage ist am Wochenende? {optionen}?', { bild: '📅' }),
  fest(5, 'jahr', 'Der erste Tag der Woche?', 'Montag', ['Freitag', 'Samstag'], 'Mit welchem Tag beginnt die Schulwoche? {optionen}?', { bild: '📅' }),
  fest(5, 'verkehr', 'Bei welcher Farbe darfst du gehen?', '🟢', ['🔴', '🟡'], 'Bei welcher Ampelfarbe darfst du über die Straße gehen? {optionen}?', { bild: '🚦', namen: FARB_NAMEN }),
  fest(5, 'verkehr', 'Bei welcher Farbe bleibst du stehen?', '🔴', ['🟢', '🔵'], 'Bei welcher Ampelfarbe musst du stehen bleiben? {optionen}?', { bild: '🚦', namen: FARB_NAMEN }),
  fest(5, 'verkehr', 'Wo gehst du sicher über die Straße?', 'Zebrastreifen', ['Kurve', 'Parkplatz'], 'Wo gehst du sicher über die Straße? {optionen}?', { bild: '🚸' }),
  fest(5, 'verkehr', 'Was trägst du beim Radfahren?', 'Helm', ['Krone', 'Badehose'], 'Was trägst du beim Fahrradfahren auf dem Kopf? {optionen}?', { bild: '🚲' }),
  fest(5, 'verkehr', 'Was fährt auf Schienen?', '🚆', ['🚗', '⛵'], 'Was fährt auf Schienen? {optionen}?', { namen: { '🚆': 'Zug', '🚗': 'Auto', '⛵': 'Segelboot' } }),
  fest(5, 'verkehr', 'Was fliegt?', '✈️', ['🚌', '🚂'], 'Was fliegt durch die Luft? {optionen}?', { namen: { '✈️': 'Flugzeug', '🚌': 'Bus', '🚂': 'Lokomotive' } }),
  fest(5, 'verkehr', 'Was fährt auf dem Wasser?', '⛵', ['🚲', '🚜'], 'Was fährt auf dem Wasser? {optionen}?', { namen: { '⛵': 'Segelboot', '🚲': 'Fahrrad', '🚜': 'Traktor' } }),
  fest(5, 'verkehr', 'Wie viele Räder hat ein Fahrrad?', '2', ['3', '4'], 'Wie viele Räder hat ein Fahrrad? {optionen}?', { bild: '🚲' }),
  fest(5, 'verkehr', 'Wie viele Räder hat ein Auto?', '4', ['2', '6'], 'Wie viele Räder hat ein Auto? {optionen}?', { bild: '🚗' }),
  fest(5, 'verkehr', 'Wie viele Räder hat ein Dreirad?', '3', ['2', '4'], 'Wie viele Räder hat ein Dreirad? {optionen}?', { bild: '🛺' }),
  fest(5, 'verkehr', 'Wer hilft bei einem Unfall?', '🚑', ['🚚', '🚕'], 'Welches Fahrzeug kommt bei einem Unfall zu Hilfe? {optionen}?', { namen: { '🚑': 'Krankenwagen', '🚚': 'Lastwagen', '🚕': 'Taxi' } }),
  fest(5, 'verkehr', 'Welche Nummer hat die Feuerwehr?', '112', ['123', '999'], 'Welche Telefonnummer hat die Feuerwehr in Deutschland? {optionen}?', { bild: '🚒' }),
  fest(5, 'alltag', 'Womit misst du Zeit?', '⏰', ['📏', '⚖️'], 'Womit misst du die Zeit? {optionen}?', { namen: { '⏰': 'Uhr', '📏': 'Lineal', '⚖️': 'Waage' } }),
  fest(5, 'alltag', 'Womit misst du Länge?', '📏', ['⏰', '🌡️'], 'Womit misst du, wie lang etwas ist? {optionen}?', { namen: { '📏': 'Lineal', '⏰': 'Uhr', '🌡️': 'Thermometer' } }),
  fest(5, 'alltag', 'Womit misst du Wärme?', '🌡️', ['📏', '⚖️'], 'Womit misst du, wie warm es ist? {optionen}?', { namen: { '🌡️': 'Thermometer', '📏': 'Lineal', '⚖️': 'Waage' } }),

  /* ---------- Stufe 6: Beine und Flügel, Lebensräume, Material ---------- */
  tabelle('beine', 6, 'tiere', BEINE, (z, andere) => ({
    frage: `Wie viele Beine hat ${z.tier}?`,
    bild: z.emoji,
    antwort: String(z.beine),
    speak: `Wie viele Beine hat ${z.tier}? ${[z, ...andere].map((t) => t.beine).join(', ')}?`,
  }), (z) => String(z.beine)),
  fest(6, 'tiere', 'Wie viele Flügel hat ein Vogel?', '2', ['4', '6'], 'Wie viele Flügel hat ein Vogel? {optionen}?', { bild: '🐦' }),
  fest(6, 'tiere', 'Wie viele Flügel hat ein Schmetterling?', '4', ['2', '8'], 'Wie viele Flügel hat ein Schmetterling? {optionen}?', { bild: '🦋' }),
  fest(6, 'tiere', 'Wie viele Arme hat ein Oktopus?', '8', ['6', '10'], 'Wie viele Arme hat ein Oktopus? {optionen}?', { bild: '🐙' }),
  tabelle('lebensraum', 6, 'tiere', LEBENSRAEUME, (z, andere) => ({
    frage: `Wo lebt ${z.tier}?`,
    bild: z.emoji,
    antwort: z.ort,
    speak: `Wo lebt ${z.tier}? ${[z, ...andere].map((t) => t.ort).join(', ')}?`,
  }), (z) => z.ort),
  tabelle('material', 6, 'alltag', MATERIAL, (z, andere) => ({
    frage: `Woraus ist ${z.ding}?`,
    bild: z.emoji,
    antwort: z.stoff,
    speak: `Woraus ist ${z.ding} meistens gemacht? ${[z, ...andere].map((t) => t.stoff).join(', ')}?`,
  }), (z) => z.stoff),
  fest(6, 'natur', 'Was schwimmt oben?', '🪵', ['🪨', '🔑'], 'Was schwimmt oben auf dem Wasser? {optionen}?', { namen: { '🪵': 'Holz', '🪨': 'Stein', '🔑': 'Schlüssel' } }),
  fest(6, 'natur', 'Was geht unter?', '🪨', ['🪶', '🍂'], 'Was geht im Wasser unter? {optionen}?', { namen: { '🪨': 'Stein', '🪶': 'Feder', '🍂': 'Blatt' } }),
  fest(6, 'tiere', 'Welches Tier ist ein Vogel?', '🦆', ['🦇', '🐝'], 'Welches Tier ist ein Vogel? {optionen}?', { namen: { '🦆': 'Ente', '🦇': 'Fledermaus', '🐝': 'Biene' } }),
  fest(6, 'tiere', 'Welches Tier ist ein Insekt?', '🐝', ['🐦', '🐟'], 'Welches Tier ist ein Insekt? {optionen}?', { namen: { '🐝': 'Biene', '🐦': 'Vogel', '🐟': 'Fisch' } }),
  fest(6, 'tiere', 'Welches Tier ist ein Fisch?', '🐠', ['🐬', '🐢'], 'Welches Tier ist ein Fisch: der bunte Fisch, der Delfin oder die Schildkröte?', { namen: { '🐠': 'bunter Fisch', '🐬': 'Delfin', '🐢': 'Schildkröte' } }),
  fest(6, 'tiere', 'Welches Tier ist nachts wach?', '🦉', ['🐔', '🐝'], 'Welches Tier ist nachts wach? {optionen}?', { namen: { '🦉': 'Eule', '🐔': 'Huhn', '🐝': 'Biene' } }),
  fest(6, 'natur', 'Woraus besteht eine Wolke?', 'Wasser', ['Watte', 'Rauch'], 'Woraus besteht eine Wolke? {optionen}?', { bild: '☁️' }),
  fest(6, 'natur', 'Wann siehst du einen Regenbogen?', 'Sonne und Regen', ['nur Schnee', 'nur Nacht'], 'Wann siehst du einen Regenbogen: bei Sonne und Regen zugleich, nur bei Schnee oder nur nachts?', { bild: '🌈' }),
  fest(6, 'koerper', 'Wie viele Sinne hast du?', '5', ['2', '8'], 'Wie viele Sinne hat ein Mensch? {optionen}?', { bild: '👀' }),
  fest(6, 'koerper', 'Womit hörst du Musik?', 'Ohren', ['Augen', 'Nase'], 'Mit welchem Körperteil hörst du Musik? {optionen}?', { bild: '🎵' }),
  fest(6, 'koerper', 'Was schützt deine Haut vor Sonne?', 'Sonnencreme', ['Zahnpasta', 'Ketchup'], 'Was schützt deine Haut vor der Sonne? {optionen}?', { bild: '☀️' }),

  /* ---------- Stufe 7: halbe Stunden, Monate, Berufe ---------- */
  uhrFamilie('uhr-halb', 7, [0, 30], 24),
  {
    id: 'monat-nach',
    stufe: 7,
    thema: 'jahr',
    anzahl: 12,
    erzeuge(rng, index) {
      const i = index % 12
      const monat = MONATE[i]
      const antwort = MONATE[(i + 1) % 12]
      const andere = sample(rng, MONATE.filter((m) => m !== antwort && m !== monat), 2)
      return {
        id: `monat-nach-${slug(monat)}`,
        stufe: 7,
        thema: 'jahr',
        frage: `Welcher Monat kommt nach ${monat}?`,
        antwort,
        optionen: shuffle(rng, [antwort, ...andere]),
        speak: `Welcher Monat kommt nach ${monat}? ${[antwort, ...andere].join(', ')}?`,
        bild: '🗓️',
      }
    },
  },
  fest(7, 'jahr', 'Wie viele Monate hat ein Jahr?', '12', ['10', '7'], 'Wie viele Monate hat ein Jahr? {optionen}?', { bild: '🗓️' }),
  fest(7, 'jahr', 'Der erste Monat im Jahr?', 'Januar', ['Dezember', 'März'], 'Welcher Monat ist der erste im Jahr? {optionen}?', { bild: '🗓️' }),
  fest(7, 'jahr', 'Der letzte Monat im Jahr?', 'Dezember', ['November', 'Januar'], 'Welcher Monat ist der letzte im Jahr? {optionen}?', { bild: '🗓️' }),
  fest(7, 'jahr', 'In welchem Monat ist Weihnachten?', 'Dezember', ['Juli', 'April'], 'In welchem Monat ist Weihnachten? {optionen}?', { bild: '🎄' }),
  fest(7, 'jahr', 'Welcher Monat ist mitten im Sommer?', 'Juli', ['Januar', 'Oktober'], 'Welcher Monat liegt mitten im Sommer? {optionen}?', { bild: '☀️' }),
  tabelle('beruf', 7, 'alltag', BERUFE, (z, andere) => ({
    frage: z.frage,
    bild: z.emoji,
    antwort: z.beruf,
    speak: `${z.frage} ${[z, ...andere].map((t) => t.beruf).join(', ')}?`,
  }), (z) => z.beruf),
  tabelle('werkzeug', 7, 'alltag', WERKZEUGE, (z, andere) => ({
    frage: `Was braucht ${z.wer}?`,
    bild: z.emoji,
    antwort: z.werkzeug,
    speak: `Was braucht ${z.wer} bei der Arbeit? ${[z, ...andere].map((t) => t.werkzeug).join(', ')}?`,
  }), (z) => z.werkzeug),
  fest(7, 'alltag', 'Wie viele Minuten hat eine Stunde?', '60', ['30', '100'], 'Wie viele Minuten hat eine Stunde? {optionen}?', { bild: '⏰' }),
  fest(7, 'alltag', 'Wie viele Stunden hat ein Tag?', '24', ['12', '60'], 'Wie viele Stunden hat ein Tag? {optionen}?', { bild: '🌗' }),
  fest(7, 'natur', 'Was macht ein Igel im Winter?', 'schlafen', ['baden', 'fliegen'], 'Was macht ein Igel den ganzen Winter über? {optionen}?', { bild: '🦔' }),
  fest(7, 'natur', 'Wohin fliegen viele Vögel im Herbst?', 'Süden', ['Norden', 'Mond'], 'Wohin fliegen viele Vögel im Herbst, wo es warm ist? {optionen}?', { bild: '🐦' }),

  /* ---------- Stufe 8: Weltall, Herkunft, Verwandlung ---------- */
  fest(8, 'welt', 'Auf welchem Planeten leben wir?', 'Erde', ['Mars', 'Mond'], 'Auf welchem Planeten leben wir? {optionen}?', { bild: '🌍' }),
  fest(8, 'welt', 'Was ist die Sonne?', 'ein Stern', ['ein Planet', 'ein Mond'], 'Was ist die Sonne? {optionen}?', { bild: '☀️' }),
  fest(8, 'welt', 'Was kreist um die Erde?', 'Mond', ['Sonne', 'Mars'], 'Was kreist um die Erde? {optionen}?', { bild: '🌙' }),
  fest(8, 'welt', 'Wie viele Planeten kreisen um die Sonne?', '8', ['3', '20'], 'Wie viele Planeten kreisen um unsere Sonne? {optionen}?', { bild: '🪐' }),
  fest(8, 'welt', 'Welcher Planet ist rot?', 'Mars', ['Erde', 'Neptun'], 'Welcher Planet sieht rot aus? {optionen}?', { bild: '🔴' }),
  fest(8, 'welt', 'Der größte Planet?', 'Jupiter', ['Merkur', 'Erde'], 'Welcher Planet ist der größte in unserem Sonnensystem? {optionen}?', { bild: '🪐' }),
  fest(8, 'welt', 'Ist der Mond größer als die Erde?', 'kleiner', ['größer', 'gleich groß'], 'Ist der Mond kleiner als die Erde, größer als die Erde, oder sind beide gleich groß?', { bild: '🌙' }),
  fest(8, 'welt', 'Womit fliegt man ins All?', '🚀', ['✈️', '🎈'], 'Womit fliegt man ins Weltall? {optionen}?', { namen: { '🚀': 'Rakete', '✈️': 'Flugzeug', '🎈': 'Luftballon' } }),
  fest(8, 'welt', 'Warum ist es nachts dunkel?', 'Erde dreht sich', ['Sonne ist aus', 'Mond leuchtet'], 'Warum ist es nachts dunkel? Weil sich die Erde von der Sonne wegdreht, weil die Sonne ausgeht oder weil der Mond leuchtet?', { bild: '🌃' }),
  tabelle('herkunft', 8, 'natur', HERKUNFT, (z, _andere, rng) => ({
    frage: z.frage,
    bild: z.bild,
    antwort: z.antwort,
    optionen: shuffle(rng, [z.antwort, ...z.falsch]),
    speak: z.speak,
  }), (z) => z.antwort),
  tabelle('verwandlung', 8, 'natur', VERWANDLUNG, (z, _andere, rng) => ({
    frage: z.frage,
    bild: z.bild,
    antwort: z.antwort,
    optionen: shuffle(rng, [z.antwort, ...z.falsch]),
    speak: z.speak,
    namen: VERWANDLUNG_NAMEN,
  }), (z) => z.antwort),
  fest(8, 'natur', 'Was wird aus Wasser bei Frost?', 'Eis', ['Dampf', 'Sand'], 'Was wird aus Wasser, wenn es sehr kalt ist? {optionen}?', { bild: '🧊' }),
  fest(8, 'natur', 'Was wird aus Wasser beim Kochen?', 'Dampf', ['Eis', 'Öl'], 'Was steigt aus kochendem Wasser auf? {optionen}?', { bild: '♨️' }),
  fest(8, 'natur', 'Wo landet der Regen?', 'Fluss', ['Wolke', 'Sonne'], 'Wohin fließt das Regenwasser am Ende? {optionen}?', { bild: '🌧️' }),
  fest(8, 'natur', 'Woher kommt der Regen?', 'Wolken', ['Bäume', 'Berge'], 'Woher kommt der Regen? {optionen}?', { bild: '☁️' }),
  fest(8, 'koerper', 'Welches Organ pumpt Blut?', 'Herz', ['Lunge', 'Magen'], 'Welches Organ pumpt das Blut durch deinen Körper? {optionen}?', { bild: '❤️' }),
  fest(8, 'koerper', 'Womit atmest du?', 'Lunge', ['Herz', 'Knie'], 'Mit welchem Organ atmest du? {optionen}?', { bild: '🫁' }),
  fest(8, 'koerper', 'Was schützt dein Gehirn?', 'Schädel', ['Haut', 'Haare'], 'Was schützt dein Gehirn im Kopf? {optionen}?', { bild: '🧠' }),
  fest(8, 'koerper', 'Wozu sind Zähne da?', 'kauen', ['hören', 'laufen'], 'Wozu brauchst du deine Zähne? {optionen}?', { bild: '🦷' }),

  /* ---------- Stufe 9: Viertelstunden, Recycling, Himmelsrichtungen ---------- */
  uhrFamilie('uhr-viertel', 9, [0, 15, 30, 45], 48),
  fest(9, 'alltag', 'Wohin kommt Papier?', 'blaue Tonne', ['gelbe Tonne', 'Biotonne'], 'In welche Tonne kommt Altpapier? {optionen}?', { bild: '📰' }),
  fest(9, 'alltag', 'Wohin kommt Apfelrest?', 'Biotonne', ['blaue Tonne', 'gelbe Tonne'], 'Wohin kommt ein Apfelrest? {optionen}?', { bild: '🍎' }),
  fest(9, 'alltag', 'Wohin kommt Plastik?', 'gelbe Tonne', ['blaue Tonne', 'Biotonne'], 'Wohin kommt eine leere Plastikflasche? {optionen}?', { bild: '🧴' }),
  fest(9, 'alltag', 'Wohin kommt Altglas?', 'Glascontainer', ['Biotonne', 'blaue Tonne'], 'Wohin kommt eine leere Glasflasche? {optionen}?', { bild: '🍾' }),
  fest(9, 'alltag', 'Was ist gesund?', '🍎', ['🍬', '🍟'], 'Was ist gesund? {optionen}?', { namen: { '🍎': 'Apfel', '🍬': 'Bonbon', '🍟': 'Pommes' } }),
  fest(9, 'alltag', 'Was ist gesund?', '🥦', ['🍩', '🍭'], 'Was ist gesund? {optionen}?', { namen: { '🥦': 'Brokkoli', '🍩': 'Donut', '🍭': 'Lutscher' } }),
  fest(9, 'welt', 'Wo geht die Sonne auf?', 'Osten', ['Westen', 'Norden'], 'In welcher Himmelsrichtung geht die Sonne auf? {optionen}?', { bild: '🌅' }),
  fest(9, 'welt', 'Wo geht die Sonne unter?', 'Westen', ['Osten', 'Süden'], 'In welcher Himmelsrichtung geht die Sonne unter? {optionen}?', { bild: '🌇' }),
  fest(9, 'welt', 'Was zeigt ein Kompass?', 'Norden', ['Uhrzeit', 'Wetter'], 'Was zeigt die Nadel eines Kompasses? {optionen}?', { bild: '🧭' }),
  fest(9, 'welt', 'Wie viele Kontinente gibt es?', '7', ['3', '12'], 'Wie viele Kontinente gibt es auf der Erde? {optionen}?', { bild: '🌍' }),
  fest(9, 'welt', 'Was ist mehr auf der Erde?', 'Wasser', ['Land', 'Eis'], 'Wovon gibt es auf der Erde mehr? {optionen}?', { bild: '🌊' }),
  fest(9, 'tiere', 'Welches Tier ist ein Säugetier?', 'Delfin', ['Hai', 'Forelle'], 'Welches Tier ist ein Säugetier, obwohl es im Meer lebt? {optionen}?', { bild: '🐬' }),
  fest(9, 'tiere', 'Welcher Vogel kann nicht fliegen?', 'Pinguin', ['Amsel', 'Taube'], 'Welcher Vogel kann nicht fliegen? {optionen}?', { bild: '🐧' }),
  fest(9, 'tiere', 'Wer trägt sein Haus mit sich?', 'Schnecke', ['Hase', 'Maus'], 'Welches Tier trägt sein Haus immer mit sich herum? {optionen}?', { bild: '🐌' }),
  fest(9, 'tiere', 'Das größte Tier der Welt?', 'Blauwal', ['Elefant', 'Giraffe'], 'Welches ist das größte Tier der Welt? {optionen}?', { bild: '🐋' }),
  fest(9, 'tiere', 'Das schnellste Landtier?', 'Gepard', ['Hase', 'Pferd'], 'Welches Tier läuft an Land am schnellsten? {optionen}?', { bild: '🐆' }),
  fest(9, 'tiere', 'Wer baut Dämme im Fluss?', 'Biber', ['Otter', 'Ente'], 'Welches Tier baut Dämme aus Ästen im Fluss? {optionen}?', { bild: '🦫' }),
  fest(9, 'tiere', 'Welches Tier ist eine Fledermaus?', 'Säugetier', ['Vogel', 'Insekt'], 'Was ist eine Fledermaus? {optionen}?', { bild: '🦇' }),
  fest(9, 'natur', 'Was atmen Pflanzen aus?', 'Sauerstoff', ['Rauch', 'Wasser'], 'Was geben Pflanzen an die Luft ab, das wir zum Atmen brauchen? {optionen}?', { bild: '🌳' }),
  fest(9, 'natur', 'Warum hat der Kaktus Stacheln?', 'Schutz', ['Schmuck', 'Fliegen'], 'Wozu hat ein Kaktus Stacheln? {optionen}?', { bild: '🌵' }),

  /* ---------- Stufe 10: Fünf-Minuten-Uhr, Zusammenhänge, Zahlen der Welt ---------- */
  uhrFamilie('uhr-fuenf', 10, [5, 10, 20, 25, 35, 40, 50, 55], 96),
  fest(10, 'alltag', 'Wie viele Sekunden hat eine Minute?', '60', ['100', '30'], 'Wie viele Sekunden hat eine Minute? {optionen}?', { bild: '⏱️' }),
  fest(10, 'jahr', 'Wie viele Tage hat ein Jahr?', '365', ['100', '500'], 'Wie viele Tage hat ein Jahr? {optionen}?', { bild: '🗓️' }),
  fest(10, 'jahr', 'Wie viele Wochen hat ein Jahr?', '52', ['12', '100'], 'Wie viele Wochen hat ein Jahr? {optionen}?', { bild: '🗓️' }),
  fest(10, 'jahr', 'Wie viele Tage hat der Februar meist?', '28', ['30', '31'], 'Wie viele Tage hat der Februar meistens? {optionen}?', { bild: '🗓️' }),
  fest(10, 'alltag', 'Wie viele Cent sind ein Euro?', '100', ['10', '50'], 'Wie viele Cent sind ein Euro? {optionen}?', { bild: '💶' }),
  fest(10, 'alltag', 'Welche Farbe hat der 20-Euro-Schein?', 'blau', ['rot', 'grün'], 'Welche Farbe hat der Zwanzig-Euro-Schein? {optionen}?', { bild: '💶' }),
  fest(10, 'alltag', 'Welche Farbe hat der 10-Euro-Schein?', 'rot', ['blau', 'gelb'], 'Welche Farbe hat der Zehn-Euro-Schein? {optionen}?', { bild: '💶' }),
  fest(10, 'welt', 'Warum gibt es Tag und Nacht?', 'Erde dreht sich', ['Sonne wandert', 'Mond schiebt'], 'Warum gibt es Tag und Nacht? Weil sich die Erde um sich selbst dreht, weil die Sonne um die Erde wandert oder weil der Mond die Sonne wegschiebt?', { bild: '🌍' }),
  fest(10, 'welt', 'Warum gibt es Jahreszeiten?', 'Erde ist schief', ['Sonne ist müde', 'Mond ist kalt'], 'Warum gibt es Jahreszeiten? Weil die Erdachse schief steht, weil die Sonne müde wird oder weil der Mond kalt ist?', { bild: '🍂' }),
  fest(10, 'welt', 'Wie lange braucht die Erde um die Sonne?', 'ein Jahr', ['ein Tag', 'eine Woche'], 'Wie lange braucht die Erde für eine Runde um die Sonne: ein Jahr, einen Tag oder eine Woche?', { bild: '☀️' }),
  fest(10, 'welt', 'Wie lange dreht sich die Erde einmal?', 'ein Tag', ['eine Stunde', 'ein Monat'], 'Wie lange braucht die Erde, um sich einmal um sich selbst zu drehen: einen Tag, eine Stunde oder einen Monat?', { bild: '🌍' }),
  fest(10, 'natur', 'Warum schwimmt ein Schiff?', 'verdrängt Wasser', ['leicht wie Luft', 'hat Flügel'], 'Warum schwimmt ein schweres Schiff? Weil es viel Wasser verdrängt, weil es leicht wie Luft ist oder weil es Flügel hat?', { bild: '🚢' }),
  fest(10, 'natur', 'Was brauchst du zum Atmen?', 'Sauerstoff', ['Stickstoff', 'Helium'], 'Welchen Teil der Luft brauchst du zum Atmen? {optionen}?', { bild: '🫁' }),
  fest(10, 'natur', 'Was ist schwerer?', 'gleich schwer', ['1 kg Steine', '1 kg Federn'], 'Was ist schwerer: ein Kilo Steine, ein Kilo Federn — oder sind beide gleich schwer?', { bild: '⚖️' }),
  fest(10, 'natur', 'Wie viele Herzen hat ein Oktopus?', '3', ['1', '8'], 'Wie viele Herzen hat ein Oktopus? {optionen}?', { bild: '🐙' }),
  fest(10, 'natur', 'Warum sind Blätter grün?', 'Blattgrün', ['Farbe vom Regen', 'Grüne Erde'], 'Warum sind Blätter grün? Wegen des Blattgrüns, das Licht einfängt, wegen der Farbe vom Regen oder weil die Erde grün ist?', { bild: '🍃' }),
  fest(10, 'natur', 'Woraus besteht Sand?', 'Steinkrümel', ['Wasser', 'Holz'], 'Woraus besteht Sand? {optionen}?', { bild: '🏖️' }),
  fest(10, 'koerper', 'Wie viele Zähne hat ein Erwachsener?', '32', ['20', '50'], 'Wie viele Zähne hat ein Erwachsener? {optionen}?', { bild: '🦷' }),
  fest(10, 'koerper', 'Wie viele Milchzähne bekommt ein Kind?', '20', ['32', '10'], 'Wie viele Milchzähne bekommt ein Kind? {optionen}?', { bild: '🦷' }),
  fest(10, 'koerper', 'Der größte Knochen im Körper?', 'Oberschenkel', ['Finger', 'Rippe'], 'Wo ist der größte Knochen deines Körpers? {optionen}?', { bild: '🦴' }),
  fest(10, 'welt', 'Was ist ein Vulkan?', 'Berg mit Lava', ['Fluss', 'Wolke'], 'Was ist ein Vulkan: ein Berg, aus dem Lava kommt, ein Fluss oder eine Wolke?', { bild: '🌋' }),
  fest(10, 'welt', 'Wo ist es am kältesten?', 'Antarktis', ['Wüste', 'Dschungel'], 'Wo auf der Erde ist es am kältesten? {optionen}?', { bild: '🧊' }),
]

/* ------------------------------------------------------------------ */
/* Ziehen                                                              */
/* ------------------------------------------------------------------ */

/** Alle Fragen, die auf dieser Stufe erlaubt sind (zwei Stufen tiefer bleibt drin). */
export function familienFuerStufe(stufe: number): Familie[] {
  const lvl = Math.min(10, Math.max(1, Math.round(stufe)))
  const unten = Math.max(1, lvl - 2)
  return WISSEN_FAMILIEN.filter((f) => f.stufe >= unten && f.stufe <= lvl)
}

/** Gesamtzahl verschiedener Fragen — für Tests und die Doku. */
export function anzahlFragen(): number {
  return WISSEN_FAMILIEN.reduce((n, f) => n + f.anzahl, 0)
}

/**
 * Wiederholungsschutz: Ein Kind soll eine Frage erst wiedersehen, wenn der
 * ganze Vorrat seiner Stufe durch ist. Das Gedächtnis liegt im Speicher des
 * Browsers, nicht in der Datenbank — verliert man es, verliert man nichts.
 */
export interface FrageGedaechtnis {
  gesehen(id: string): boolean
  merke(id: string): void
  vergiss(): void
}

const GEDAECHTNIS_MAX = 600

export function frageGedaechtnis(childId: string): FrageGedaechtnis {
  const key = `ww-wissen-gesehen:${childId}`
  let liste: string[] = []
  try {
    const roh = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
    if (roh) liste = JSON.parse(roh) as string[]
  } catch {
    liste = []
  }
  const speichern = () => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(liste))
    } catch {
      /* Privatmodus oder voller Speicher: dann eben ohne Gedächtnis. */
    }
  }
  return {
    gesehen: (id) => liste.includes(id),
    merke(id) {
      if (liste.includes(id)) return
      liste = [...liste, id].slice(-GEDAECHTNIS_MAX)
      speichern()
    },
    vergiss() {
      liste = []
      speichern()
    },
  }
}

/**
 * Zieht eine Frage für die Stufe. Mit Gedächtnis werden zuerst ungesehene
 * Fragen bevorzugt; ist alles gesehen, fängt der Vorrat von vorn an.
 * Ohne Gedächtnis ist das Ziehen rein vom Seed abhängig (Tests).
 */
export function zieheWissensFrage(
  stufe: number,
  rng: Rng,
  gedaechtnis?: FrageGedaechtnis,
): WissensFrage {
  const familien = familienFuerStufe(stufe)
  // Jede Familie zählt mit ihrer Fragenzahl — sonst wären 96 Uhrzeiten so
  // selten wie eine einzelne Frage.
  const kandidaten: { familie: Familie; index: number }[] = []
  for (const familie of familien) {
    for (let i = 0; i < familie.anzahl; i++) kandidaten.push({ familie, index: i })
  }
  const schluessel = (k: { familie: Familie; index: number }) =>
    k.familie.anzahl === 1 ? k.familie.id : `${k.familie.id}#${k.index}`

  let pool = kandidaten
  if (gedaechtnis) {
    const frisch = kandidaten.filter((k) => !gedaechtnis.gesehen(schluessel(k)))
    if (frisch.length === 0) {
      gedaechtnis.vergiss()
    } else {
      pool = frisch
    }
  }
  const wahl = pick(rng, pool)
  gedaechtnis?.merke(schluessel(wahl))
  return wahl.familie.erzeuge(rng, wahl.index)
}

/** Vorlesename einer Antwort — Emojis bekommen ihren Namen, Text bleibt Text. */
export function optionName(frage: WissensFrage, option: string): string {
  return frage.namen?.[option] ?? option
}
