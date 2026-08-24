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
}

export const WORDS: WordEntry[] = [
  { wort: 'Affe', emoji: '🐒', silben: ['Af', 'fe'] },
  { wort: 'Ameise', emoji: '🐜', silben: ['A', 'mei', 'se'] },
  { wort: 'Ananas', emoji: '🍍', silben: ['A', 'na', 'nas'] },
  { wort: 'Apfel', emoji: '🍎', silben: ['Ap', 'fel'] },
  { wort: 'Auto', emoji: '🚗', silben: ['Au', 'to'] },
  { wort: 'Ball', emoji: '⚽', silben: ['Ball'] },
  { wort: 'Banane', emoji: '🍌', silben: ['Ba', 'na', 'ne'] },
  { wort: 'Baum', emoji: '🌳', silben: ['Baum'] },
  { wort: 'Biene', emoji: '🐝', silben: ['Bie', 'ne'] },
  { wort: 'Birne', emoji: '🍐', silben: ['Bir', 'ne'] },
  { wort: 'Blume', emoji: '🌷', silben: ['Blu', 'me'] },
  { wort: 'Boot', emoji: '⛵', silben: ['Boot'] },
  { wort: 'Brot', emoji: '🍞', silben: ['Brot'] },
  { wort: 'Buch', emoji: '📕', silben: ['Buch'] },
  { wort: 'Burg', emoji: '🏰', silben: ['Burg'] },
  { wort: 'Clown', emoji: '🤡', silben: ['Clown'] },
  { wort: 'Computer', emoji: '💻', silben: ['Com', 'pu', 'ter'] },
  { wort: 'Dach', emoji: '🏠', silben: ['Dach'] },
  { wort: 'Delfin', emoji: '🐬', silben: ['Del', 'fin'] },
  { wort: 'Dino', emoji: '🦕', silben: ['Di', 'no'] },
  { wort: 'Drache', emoji: '🐉', silben: ['Dra', 'che'] },
  { wort: 'Ei', emoji: '🥚', silben: ['Ei'] },
  { wort: 'Eis', emoji: '🍦', silben: ['Eis'] },
  { wort: 'Elefant', emoji: '🐘', silben: ['E', 'le', 'fant'] },
  { wort: 'Ente', emoji: '🦆', silben: ['En', 'te'] },
  { wort: 'Erdbeere', emoji: '🍓', silben: ['Erd', 'bee', 're'] },
  { wort: 'Eule', emoji: '🦉', silben: ['Eu', 'le'] },
  { wort: 'Fahrrad', emoji: '🚲', silben: ['Fahr', 'rad'] },
  { wort: 'Feuer', emoji: '🔥', silben: ['Feu', 'er'] },
  { wort: 'Fisch', emoji: '🐟', silben: ['Fisch'] },
  { wort: 'Frosch', emoji: '🐸', silben: ['Frosch'] },
  { wort: 'Fuchs', emoji: '🦊', silben: ['Fuchs'] },
  { wort: 'Gabel', emoji: '🍴', silben: ['Ga', 'bel'] },
  { wort: 'Geige', emoji: '🎻', silben: ['Gei', 'ge'] },
  { wort: 'Geschenk', emoji: '🎁', silben: ['Ge', 'schenk'] },
  { wort: 'Gitarre', emoji: '🎸', silben: ['Gi', 'tar', 're'] },
  { wort: 'Giraffe', emoji: '🦒', silben: ['Gi', 'raf', 'fe'] },
  { wort: 'Hand', emoji: '✋', silben: ['Hand'] },
  { wort: 'Hase', emoji: '🐰', silben: ['Ha', 'se'] },
  { wort: 'Haus', emoji: '🏡', silben: ['Haus'] },
  { wort: 'Herz', emoji: '❤️', silben: ['Herz'] },
  { wort: 'Hund', emoji: '🐶', silben: ['Hund'] },
  { wort: 'Hut', emoji: '🎩', silben: ['Hut'] },
  { wort: 'Igel', emoji: '🦔', silben: ['I', 'gel'] },
  { wort: 'Insel', emoji: '🏝️', silben: ['In', 'sel'] },
  { wort: 'Jacke', emoji: '🧥', silben: ['Ja', 'cke'] },
  { wort: 'Kaktus', emoji: '🌵', silben: ['Kak', 'tus'] },
  { wort: 'Kamel', emoji: '🐫', silben: ['Ka', 'mel'] },
  { wort: 'Katze', emoji: '🐱', silben: ['Kat', 'ze'] },
  { wort: 'Kerze', emoji: '🕯️', silben: ['Ker', 'ze'] },
  { wort: 'Kirsche', emoji: '🍒', silben: ['Kir', 'sche'] },
  { wort: 'Koala', emoji: '🐨', silben: ['Ko', 'a', 'la'] },
  { wort: 'Krone', emoji: '👑', silben: ['Kro', 'ne'] },
  { wort: 'Kuh', emoji: '🐮', silben: ['Kuh'] },
  { wort: 'Lampe', emoji: '💡', silben: ['Lam', 'pe'] },
  { wort: 'Leiter', emoji: '🪜', silben: ['Lei', 'ter'] },
  { wort: 'Löwe', emoji: '🦁', silben: ['Lö', 'we'] },
  { wort: 'Luftballon', emoji: '🎈', silben: ['Luft', 'bal', 'lon'] },
  { wort: 'Maus', emoji: '🐭', silben: ['Maus'] },
  { wort: 'Melone', emoji: '🍉', silben: ['Me', 'lo', 'ne'] },
  { wort: 'Mond', emoji: '🌙', silben: ['Mond'] },
  { wort: 'Muschel', emoji: '🐚', silben: ['Mu', 'schel'] },
  { wort: 'Nase', emoji: '👃', silben: ['Na', 'se'] },
  { wort: 'Nest', emoji: '🪹', silben: ['Nest'] },
  { wort: 'Note', emoji: '🎵', silben: ['No', 'te'] },
  { wort: 'Nuss', emoji: '🌰', silben: ['Nuss'] },
  { wort: 'Ohr', emoji: '👂', silben: ['Ohr'] },
  { wort: 'Oktopus', emoji: '🐙', silben: ['Ok', 'to', 'pus'] },
  { wort: 'Orange', emoji: '🍊', silben: ['O', 'ran', 'ge'] },
  { wort: 'Palme', emoji: '🌴', silben: ['Pal', 'me'] },
  { wort: 'Panda', emoji: '🐼', silben: ['Pan', 'da'] },
  { wort: 'Pilz', emoji: '🍄', silben: ['Pilz'] },
  { wort: 'Pinguin', emoji: '🐧', silben: ['Pin', 'gu', 'in'] },
  { wort: 'Pizza', emoji: '🍕', silben: ['Piz', 'za'] },
  { wort: 'Pinsel', emoji: '🖌️', silben: ['Pin', 'sel'] },
  { wort: 'Quadrat', emoji: '⬜', silben: ['Qua', 'drat'] },
  { wort: 'Rakete', emoji: '🚀', silben: ['Ra', 'ke', 'te'] },
  { wort: 'Regen', emoji: '🌧️', silben: ['Re', 'gen'] },
  { wort: 'Ring', emoji: '💍', silben: ['Ring'] },
  { wort: 'Roboter', emoji: '🤖', silben: ['Ro', 'bo', 'ter'] },
  { wort: 'Rose', emoji: '🌹', silben: ['Ro', 'se'] },
  { wort: 'Schaf', emoji: '🐑', silben: ['Schaf'] },
  { wort: 'Schere', emoji: '✂️', silben: ['Sche', 're'] },
  { wort: 'Schiff', emoji: '🚢', silben: ['Schiff'] },
  { wort: 'Schlange', emoji: '🐍', silben: ['Schlan', 'ge'] },
  { wort: 'Schnecke', emoji: '🐌', silben: ['Schne', 'cke'] },
  { wort: 'Socke', emoji: '🧦', silben: ['So', 'cke'] },
  { wort: 'Sofa', emoji: '🛋️', silben: ['So', 'fa'] },
  { wort: 'Sonne', emoji: '☀️', silben: ['Son', 'ne'] },
  { wort: 'Stern', emoji: '⭐', silben: ['Stern'] },
  { wort: 'Tanne', emoji: '🌲', silben: ['Tan', 'ne'] },
  { wort: 'Tasse', emoji: '☕', silben: ['Tas', 'se'] },
  { wort: 'Tiger', emoji: '🐯', silben: ['Ti', 'ger'] },
  { wort: 'Tomate', emoji: '🍅', silben: ['To', 'ma', 'te'] },
  { wort: 'Torte', emoji: '🎂', silben: ['Tor', 'te'] },
  { wort: 'Traktor', emoji: '🚜', silben: ['Trak', 'tor'] },
  { wort: 'Trommel', emoji: '🥁', silben: ['Trom', 'mel'] },
  { wort: 'Uhr', emoji: '⏰', silben: ['Uhr'] },
  { wort: 'Vogel', emoji: '🐦', silben: ['Vo', 'gel'] },
  { wort: 'Vulkan', emoji: '🌋', silben: ['Vul', 'kan'] },
  { wort: 'Wal', emoji: '🐳', silben: ['Wal'] },
  { wort: 'Wolke', emoji: '☁️', silben: ['Wol', 'ke'] },
  { wort: 'Wurm', emoji: '🪱', silben: ['Wurm'] },
  { wort: 'Zebra', emoji: '🦓', silben: ['Ze', 'bra'] },
  { wort: 'Zitrone', emoji: '🍋', silben: ['Zi', 'tro', 'ne'] },
  { wort: 'Zug', emoji: '🚂', silben: ['Zug'] },
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
