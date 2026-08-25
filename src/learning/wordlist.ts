/**
 * Deutscher Bildwortschatz für den Buchstabenwald.
 *
 * Regeln für jeden Eintrag:
 *  - eindeutiges, kindgerechtes Wort
 *  - klarer Anlaut (so gesprochen, wie er geschrieben wird)
 *  - ein Emoji, das das Wort ohne Zweifel zeigt
 *  - Silbentrennung, wie man sie beim Klatschen hört
 *
 * Wörter mit unklarem Emoji gehören hier NICHT hinein.
 */

export interface WordEntry {
  wort: string
  emoji: string
  silben: string[]
  /**
   * Reimgruppe (Reim-Boot). Wörter mit gleicher Gruppe reimen sich, Wörter
   * mit verschiedener Gruppe nie — daraus zieht das Spiel seine Ablenker.
   * Die Kennung ist der gehörte Reim, nicht die Schreibweise: „Bus" gehört
   * zu `uss`, weil es sich auf Nuss und Kuss reimt.
   */
  reimGruppe?: string
}

export const WORDS: WordEntry[] = [
  { wort: 'Affe',       emoji: '🐒', silben: ['Af', 'fe'] },
  { wort: 'Ameise',     emoji: '🐜', silben: ['A', 'mei', 'se'] },
  { wort: 'Ananas',     emoji: '🍍', silben: ['A', 'na', 'nas'] },
  { wort: 'Apfel',      emoji: '🍎', silben: ['Ap', 'fel'] },
  { wort: 'Auto',       emoji: '🚗', silben: ['Au', 'to'] },
  { wort: 'Bahn',       emoji: '🚆', silben: ['Bahn'], reimGruppe: 'ahn' },
  { wort: 'Ball',       emoji: '⚽', silben: ['Ball'] },
  { wort: 'Banane',     emoji: '🍌', silben: ['Ba', 'na', 'ne'] },
  { wort: 'Bär',        emoji: '🐻', silben: ['Bär'] },
  { wort: 'Baum',       emoji: '🌳', silben: ['Baum'], reimGruppe: 'aum' },
  { wort: 'Bein',       emoji: '🦵', silben: ['Bein'], reimGruppe: 'ein' },
  { wort: 'Biene',      emoji: '🐝', silben: ['Bie', 'ne'] },
  { wort: 'Birne',      emoji: '🍐', silben: ['Bir', 'ne'] },
  { wort: 'Blume',      emoji: '🌷', silben: ['Blu', 'me'] },
  { wort: 'Bogen',      emoji: '🏹', silben: ['Bo', 'gen'] },
  { wort: 'Bohne',      emoji: '🫘', silben: ['Boh', 'ne'], reimGruppe: 'one' },
  { wort: 'Boot',       emoji: '⛵', silben: ['Boot'], reimGruppe: 'ot' },
  { wort: 'Brei',       emoji: '🥣', silben: ['Brei'], reimGruppe: 'ei' },
  { wort: 'Brille',     emoji: '👓', silben: ['Bril', 'le'] },
  { wort: 'Brot',       emoji: '🍞', silben: ['Brot'], reimGruppe: 'ot' },
  { wort: 'Buch',       emoji: '📕', silben: ['Buch'] },
  { wort: 'Burg',       emoji: '🏰', silben: ['Burg'] },
  { wort: 'Bus',        emoji: '🚌', silben: ['Bus'], reimGruppe: 'uss' },
  { wort: 'Clown',      emoji: '🤡', silben: ['Clown'] },
  { wort: 'Computer',   emoji: '💻', silben: ['Com', 'pu', 'ter'] },
  { wort: 'Dach',       emoji: '🏠', silben: ['Dach'] },
  { wort: 'Delfin',     emoji: '🐬', silben: ['Del', 'fin'] },
  { wort: 'Dino',       emoji: '🦕', silben: ['Di', 'no'] },
  { wort: 'Dose',       emoji: '🥫', silben: ['Do', 'se'], reimGruppe: 'ose' },
  { wort: 'Drache',     emoji: '🐉', silben: ['Dra', 'che'] },
  { wort: 'Ei',         emoji: '🥚', silben: ['Ei'], reimGruppe: 'ei' },
  { wort: 'Eis',        emoji: '🍦', silben: ['Eis'], reimGruppe: 'eis' },
  { wort: 'Elefant',    emoji: '🐘', silben: ['E', 'le', 'fant'] },
  { wort: 'Ente',       emoji: '🦆', silben: ['En', 'te'] },
  { wort: 'Erdbeere',   emoji: '🍓', silben: ['Erd', 'bee', 're'] },
  { wort: 'Eule',       emoji: '🦉', silben: ['Eu', 'le'] },
  { wort: 'Fahrrad',    emoji: '🚲', silben: ['Fahr', 'rad'] },
  { wort: 'Fest',       emoji: '🎉', silben: ['Fest'], reimGruppe: 'est' },
  { wort: 'Feuer',      emoji: '🔥', silben: ['Feu', 'er'] },
  { wort: 'Fisch',      emoji: '🐟', silben: ['Fisch'], reimGruppe: 'isch' },
  { wort: 'Fliege',     emoji: '🪰', silben: ['Flie', 'ge'], reimGruppe: 'iege' },
  { wort: 'Frosch',     emoji: '🐸', silben: ['Frosch'] },
  { wort: 'Fuchs',      emoji: '🦊', silben: ['Fuchs'] },
  { wort: 'Gabel',      emoji: '🍴', silben: ['Ga', 'bel'] },
  { wort: 'Geige',      emoji: '🎻', silben: ['Gei', 'ge'] },
  { wort: 'Geschenk',   emoji: '🎁', silben: ['Ge', 'schenk'] },
  { wort: 'Giraffe',    emoji: '🦒', silben: ['Gi', 'raf', 'fe'] },
  { wort: 'Gitarre',    emoji: '🎸', silben: ['Gi', 'tar', 're'] },
  { wort: 'Glocke',     emoji: '🔔', silben: ['Glo', 'cke'], reimGruppe: 'ocke' },
  { wort: 'Hahn',       emoji: '🐓', silben: ['Hahn'], reimGruppe: 'ahn' },
  { wort: 'Hand',       emoji: '✋', silben: ['Hand'], reimGruppe: 'and' },
  { wort: 'Hase',       emoji: '🐰', silben: ['Ha', 'se'], reimGruppe: 'ase' },
  { wort: 'Haus',       emoji: '🏡', silben: ['Haus'], reimGruppe: 'aus' },
  { wort: 'Herz',       emoji: '❤️', silben: ['Herz'] },
  { wort: 'Hose',       emoji: '👖', silben: ['Ho', 'se'], reimGruppe: 'ose' },
  { wort: 'Hund',       emoji: '🐶', silben: ['Hund'], reimGruppe: 'und' },
  { wort: 'Hut',        emoji: '🎩', silben: ['Hut'] },
  { wort: 'Igel',       emoji: '🦔', silben: ['I', 'gel'], reimGruppe: 'igel' },
  { wort: 'Insel',      emoji: '🏝️', silben: ['In', 'sel'] },
  { wort: 'Jacke',      emoji: '🧥', silben: ['Ja', 'cke'] },
  { wort: 'Kaktus',     emoji: '🌵', silben: ['Kak', 'tus'] },
  { wort: 'Kamel',      emoji: '🐫', silben: ['Ka', 'mel'] },
  { wort: 'Kanne',      emoji: '🫖', silben: ['Kan', 'ne'], reimGruppe: 'anne' },
  { wort: 'Katze',      emoji: '🐱', silben: ['Kat', 'ze'], reimGruppe: 'atze' },
  { wort: 'Kerze',      emoji: '🕯️', silben: ['Ker', 'ze'] },
  { wort: 'Kirsche',    emoji: '🍒', silben: ['Kir', 'sche'] },
  { wort: 'Koala',      emoji: '🐨', silben: ['Ko', 'a', 'la'] },
  { wort: 'Korb',       emoji: '🧺', silben: ['Korb'] },
  { wort: 'Krone',      emoji: '👑', silben: ['Kro', 'ne'], reimGruppe: 'one' },
  { wort: 'Kuh',        emoji: '🐮', silben: ['Kuh'], reimGruppe: 'uh' },
  { wort: 'Kuss',       emoji: '💋', silben: ['Kuss'], reimGruppe: 'uss' },
  { wort: 'Lampe',      emoji: '💡', silben: ['Lam', 'pe'] },
  { wort: 'Leiter',     emoji: '🪜', silben: ['Lei', 'ter'] },
  { wort: 'Löwe',       emoji: '🦁', silben: ['Lö', 'we'] },
  { wort: 'Luftballon', emoji: '🎈', silben: ['Luft', 'bal', 'lon'] },
  { wort: 'Mann',       emoji: '👨', silben: ['Mann'] },
  { wort: 'Maus',       emoji: '🐭', silben: ['Maus'], reimGruppe: 'aus' },
  { wort: 'Melone',     emoji: '🍉', silben: ['Me', 'lo', 'ne'] },
  { wort: 'Mond',       emoji: '🌙', silben: ['Mond'] },
  { wort: 'Mund',       emoji: '👄', silben: ['Mund'], reimGruppe: 'und' },
  { wort: 'Muschel',    emoji: '🐚', silben: ['Mu', 'schel'] },
  { wort: 'Nase',       emoji: '👃', silben: ['Na', 'se'], reimGruppe: 'ase' },
  { wort: 'Nest',       emoji: '🪹', silben: ['Nest'], reimGruppe: 'est' },
  { wort: 'Note',       emoji: '🎵', silben: ['No', 'te'] },
  { wort: 'Nuss',       emoji: '🌰', silben: ['Nuss'], reimGruppe: 'uss' },
  { wort: 'Ohr',        emoji: '👂', silben: ['Ohr'], reimGruppe: 'or' },
  { wort: 'Oktopus',    emoji: '🐙', silben: ['Ok', 'to', 'pus'] },
  { wort: 'Orange',     emoji: '🍊', silben: ['O', 'ran', 'ge'] },
  { wort: 'Palme',      emoji: '🌴', silben: ['Pal', 'me'] },
  { wort: 'Panda',      emoji: '🐼', silben: ['Pan', 'da'] },
  { wort: 'Papier',     emoji: '📄', silben: ['Pa', 'pier'] },
  { wort: 'Pilz',       emoji: '🍄', silben: ['Pilz'] },
  { wort: 'Pinguin',    emoji: '🐧', silben: ['Pin', 'gu', 'in'] },
  { wort: 'Pinsel',     emoji: '🖌️', silben: ['Pin', 'sel'] },
  { wort: 'Pizza',      emoji: '🍕', silben: ['Piz', 'za'] },
  { wort: 'Quadrat',    emoji: '⬜', silben: ['Qua', 'drat'] },
  { wort: 'Rakete',     emoji: '🚀', silben: ['Ra', 'ke', 'te'] },
  { wort: 'Regen',      emoji: '🌧️', silben: ['Re', 'gen'] },
  { wort: 'Reis',       emoji: '🍚', silben: ['Reis'], reimGruppe: 'eis' },
  { wort: 'Ring',       emoji: '💍', silben: ['Ring'] },
  { wort: 'Roboter',    emoji: '🤖', silben: ['Ro', 'bo', 'ter'] },
  { wort: 'Rose',       emoji: '🌹', silben: ['Ro', 'se'], reimGruppe: 'ose' },
  { wort: 'Schaf',      emoji: '🐑', silben: ['Schaf'] },
  { wort: 'Schal',      emoji: '🧣', silben: ['Schal'], reimGruppe: 'al' },
  { wort: 'Schaum',     emoji: '🫧', silben: ['Schaum'], reimGruppe: 'aum' },
  { wort: 'Schere',     emoji: '✂️', silben: ['Sche', 're'] },
  { wort: 'Schiff',     emoji: '🚢', silben: ['Schiff'] },
  { wort: 'Schirm',     emoji: '☂️', silben: ['Schirm'] },
  { wort: 'Schlange',   emoji: '🐍', silben: ['Schlan', 'ge'] },
  { wort: 'Schnecke',   emoji: '🐌', silben: ['Schne', 'cke'] },
  { wort: 'Schnee',     emoji: '❄️', silben: ['Schnee'] },
  { wort: 'Schnur',     emoji: '🧵', silben: ['Schnur'], reimGruppe: 'ur' },
  { wort: 'Schuh',      emoji: '👟', silben: ['Schuh'], reimGruppe: 'uh' },
  { wort: 'Schwein',    emoji: '🐷', silben: ['Schwein'], reimGruppe: 'ein' },
  { wort: 'Socke',      emoji: '🧦', silben: ['So', 'cke'], reimGruppe: 'ocke' },
  { wort: 'Sofa',       emoji: '🛋️', silben: ['So', 'fa'] },
  { wort: 'Sonne',      emoji: '☀️', silben: ['Son', 'ne'], reimGruppe: 'onne' },
  { wort: 'Spiegel',    emoji: '🪞', silben: ['Spie', 'gel'], reimGruppe: 'igel' },
  { wort: 'Stein',      emoji: '🪨', silben: ['Stein'], reimGruppe: 'ein' },
  { wort: 'Stern',      emoji: '⭐', silben: ['Stern'] },
  { wort: 'Tanne',      emoji: '🌲', silben: ['Tan', 'ne'], reimGruppe: 'anne' },
  { wort: 'Tasse',      emoji: '☕', silben: ['Tas', 'se'] },
  { wort: 'Tatze',      emoji: '🐾', silben: ['Tat', 'ze'], reimGruppe: 'atze' },
  { wort: 'Tennis',     emoji: '🎾', silben: ['Ten', 'nis'] },
  { wort: 'Tiger',      emoji: '🐯', silben: ['Ti', 'ger'] },
  { wort: 'Tisch',      emoji: '🪑', silben: ['Tisch'], reimGruppe: 'isch' },
  { wort: 'Tomate',     emoji: '🍅', silben: ['To', 'ma', 'te'] },
  { wort: 'Tonne',      emoji: '🗑️', silben: ['Ton', 'ne'], reimGruppe: 'onne' },
  { wort: 'Topf',       emoji: '🍲', silben: ['Topf'] },
  { wort: 'Tor',        emoji: '🥅', silben: ['Tor'], reimGruppe: 'or' },
  { wort: 'Torte',      emoji: '🎂', silben: ['Tor', 'te'] },
  { wort: 'Traktor',    emoji: '🚜', silben: ['Trak', 'tor'] },
  { wort: 'Trommel',    emoji: '🥁', silben: ['Trom', 'mel'] },
  { wort: 'Turm',       emoji: '🗼', silben: ['Turm'], reimGruppe: 'urm' },
  { wort: 'Uhr',        emoji: '⏰', silben: ['Uhr'], reimGruppe: 'ur' },
  { wort: 'Vase',       emoji: '🏺', silben: ['Va', 'se'], reimGruppe: 'ase' },
  { wort: 'Vogel',      emoji: '🐦', silben: ['Vo', 'gel'] },
  { wort: 'Vulkan',     emoji: '🌋', silben: ['Vul', 'kan'] },
  { wort: 'Wal',        emoji: '🐳', silben: ['Wal'], reimGruppe: 'al' },
  { wort: 'Wand',       emoji: '🧱', silben: ['Wand'], reimGruppe: 'and' },
  { wort: 'Wanne',      emoji: '🛁', silben: ['Wan', 'ne'], reimGruppe: 'anne' },
  { wort: 'Wasser',     emoji: '💧', silben: ['Was', 'ser'] },
  { wort: 'Wiese',      emoji: '🌾', silben: ['Wie', 'se'] },
  { wort: 'Wolke',      emoji: '☁️', silben: ['Wol', 'ke'] },
  { wort: 'Wurm',       emoji: '🪱', silben: ['Wurm'], reimGruppe: 'urm' },
  { wort: 'Zahn',       emoji: '🦷', silben: ['Zahn'], reimGruppe: 'ahn' },
  { wort: 'Zebra',      emoji: '🦓', silben: ['Ze', 'bra'] },
  { wort: 'Ziege',      emoji: '🐐', silben: ['Zie', 'ge'], reimGruppe: 'iege' },
  { wort: 'Zitrone',    emoji: '🍋', silben: ['Zi', 'tro', 'ne'] },
  { wort: 'Zug',        emoji: '🚂', silben: ['Zug'] },
]

/* ------------------------------------------------------------------ */
/* Abfrage-Helfer                                                      */
/* ------------------------------------------------------------------ */

export function anlaut(entry: WordEntry): string {
  return entry.wort[0].toUpperCase()
}

export function endlaut(entry: WordEntry): string {
  return entry.wort[entry.wort.length - 1].toUpperCase()
}

/** Alle Buchstaben, die in dieser Liste tatsächlich als Anlaut vorkommen. */
export const ANLAUTE: string[] = [...new Set(WORDS.map(anlaut))].sort()

/** Wörter mit genau diesem Anlaut. */
export function withAnlaut(letter: string): WordEntry[] {
  return WORDS.filter((w) => anlaut(w) === letter.toUpperCase())
}

/** Wörter mit genau diesem Endlaut. */
export function withEndlaut(letter: string): WordEntry[] {
  return WORDS.filter((w) => endlaut(w) === letter.toUpperCase())
}

export function wordsWithSyllables(count: number): WordEntry[] {
  return WORDS.filter((w) => w.silben.length === count)
}

/** Wörter mit genau n Buchstaben — für den Wort-Baukasten. */
export function wordsWithLetters(min: number, max: number): WordEntry[] {
  return WORDS.filter((w) => w.wort.length >= min && w.wort.length <= max)
}

const VOKALE = 'AEIOUÄÖÜ'

/**
 * Hat das Wort einen "klaren" Anlaut, den ein Vorschulkind einzeln hört?
 *
 * Ja, wenn das Wort mit einem Vokal beginnt (Affe, Igel) oder wenn direkt
 * nach dem ersten Buchstaben ein Vokal folgt (Ba-um, So-nne).
 * Nein bei Mehrlautern und Konsonantenhäufungen: Sch-af, Bl-ume, St-ern, Qu-alle.
 */
export function hatKlarenAnlaut(entry: WordEntry): boolean {
  const w = entry.wort.toUpperCase()
  if (w[0] === 'Q') return false // "Qu" ist immer ein Mehrlauter
  if (VOKALE.includes(w[0])) return true
  return VOKALE.includes(w[1] ?? '')
}

/** Wörter für die Anfängerstufen: nur klare Anlaute. */
export const KLARE_WORTE: WordEntry[] = WORDS.filter(hatKlarenAnlaut)

export function withAnlautKlar(letter: string): WordEntry[] {
  return KLARE_WORTE.filter((w) => anlaut(w) === letter.toUpperCase())
}

/**
 * Leicht verwechselbare Laute. Ab Stufe 4 werden Distraktoren gezielt
 * hieraus gezogen (B/P, D/T, G/K …).
 */
export const AEHNLICHE_LAUTE: Record<string, string[]> = {
  B: ['P', 'D'],
  P: ['B', 'T'],
  D: ['T', 'B'],
  T: ['D', 'P'],
  G: ['K', 'C'],
  K: ['G', 'C'],
  C: ['K', 'G'],
  M: ['N', 'W'],
  N: ['M', 'H'],
  F: ['V', 'W'],
  V: ['F', 'W'],
  W: ['V', 'M'],
  S: ['Z', 'C'],
  Z: ['S', 'T'],
  I: ['E', 'A'],
  E: ['I', 'A'],
  A: ['E', 'O'],
  O: ['U', 'A'],
  U: ['O', 'A'],
  L: ['R', 'N'],
  R: ['L', 'N'],
  H: ['N', 'K'],
  J: ['I', 'G'],
  Q: ['K', 'G'],
}

/** Die frühesten, klarsten Anlaute — Stufe 1. */
export const ANLAUTE_EINFACH = ['A', 'M', 'O', 'S', 'E']
/** Häufige Anlaute für die mittleren Stufen. */
export const ANLAUTE_HAEUFIG = ['A', 'B', 'E', 'F', 'H', 'I', 'K', 'L', 'M', 'N', 'O', 'R', 'S', 'T', 'U', 'W']

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/* ------------------------------------------------------------------ */
/* Reime — für das Reim-Boot                                           */
/* ------------------------------------------------------------------ */

/** Alle Reimgruppen mit ihren Wörtern, aus den Einträgen abgeleitet. */
export const REIM_GRUPPEN: Record<string, WordEntry[]> = WORDS.reduce((acc, w) => {
  if (!w.reimGruppe) return acc
  ;(acc[w.reimGruppe] ??= []).push(w)
  return acc
}, {} as Record<string, WordEntry[]>)

/** Nur Gruppen, aus denen sich überhaupt ein Reimpaar bilden lässt. */
export const REIM_IDS: string[] = Object.keys(REIM_GRUPPEN)
  .filter((id) => REIM_GRUPPEN[id].length >= 2)
  .sort()

/** Alle Wörter, die zu irgendeiner Reimgruppe gehören. */
export const REIM_WORTE: WordEntry[] = WORDS.filter((w) => Boolean(w.reimGruppe))

export function reimPartner(entry: WordEntry): WordEntry[] {
  if (!entry.reimGruppe) return []
  return REIM_GRUPPEN[entry.reimGruppe].filter((w) => w.wort !== entry.wort)
}

/** Reimt sich das? Zwei Wörter reimen genau dann, wenn ihre Gruppe gleich ist. */
export function reimtSich(a: WordEntry, b: WordEntry): boolean {
  return Boolean(a.reimGruppe) && a.reimGruppe === b.reimGruppe
}

/* ------------------------------------------------------------------ */
/* Zusammengesetzte Wörter — für das Reim-Boot ab Stufe 8              */
/* ------------------------------------------------------------------ */

export interface Kompositum {
  /** Vorderteil, muss als Wort in WORDS stehen */
  links: string
  /** Hinterteil, muss als Wort in WORDS stehen */
  rechts: string
  /** Das zusammengesetzte Wort, so wie man es schreibt */
  wort: string
  /** Eigenes Bild — verschieden von beiden Teilen */
  emoji: string
}

/**
 * Bewusst nur Wörter, bei denen ein Kind beide Teile im Bild wiederfindet
 * und das Ergebnis ein eigenes Bild hat. „Wassermelone" fehlt zum Beispiel,
 * weil Melone und Wassermelone dasselbe Bild tragen.
 */
export const KOMPOSITA: Kompositum[] = [
  { links: 'Sonne',    rechts: 'Blume',  wort: 'Sonnenblume',  emoji: '🌻' },
  { links: 'Hand',     rechts: 'Schuh',  wort: 'Handschuh',    emoji: '🧤' },
  { links: 'Schnee',   rechts: 'Mann',   wort: 'Schneemann',   emoji: '⛄' },
  { links: 'Regen',    rechts: 'Bogen',  wort: 'Regenbogen',   emoji: '🌈' },
  { links: 'Blume',    rechts: 'Topf',   wort: 'Blumentopf',   emoji: '🪴' },
  { links: 'Baum',     rechts: 'Haus',   wort: 'Baumhaus',     emoji: '🛖' },
  { links: 'Papier',   rechts: 'Korb',   wort: 'Papierkorb',   emoji: '🗑️' },
  { links: 'Eis',      rechts: 'Bär',    wort: 'Eisbär',       emoji: '🐻‍❄️' },
  { links: 'Tisch',    rechts: 'Tennis', wort: 'Tischtennis',  emoji: '🏓' },
  { links: 'Sonne',    rechts: 'Brille', wort: 'Sonnenbrille', emoji: '🕶️' },
  { links: 'Vogel',    rechts: 'Nest',   wort: 'Vogelnest',    emoji: '🪺' },
  { links: 'Erdbeere', rechts: 'Eis',    wort: 'Erdbeereis',   emoji: '🍨' },
  { links: 'Wasser',   rechts: 'Hahn',   wort: 'Wasserhahn',   emoji: '🚰' },
  { links: 'Sonne',    rechts: 'Schirm', wort: 'Sonnenschirm', emoji: '🏖️' },
  { links: 'Blume',    rechts: 'Wiese',  wort: 'Blumenwiese',  emoji: '🌼' },
]

export function wortByName(name: string): WordEntry | undefined {
  return WORDS.find((w) => w.wort === name)
}
