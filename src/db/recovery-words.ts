/**
 * Wortliste für den Wiederherstellungssatz (3 Wörter).
 * Bewusst kurz, konkret und leicht zu notieren — kein Server, keine E-Mail,
 * kein anderer Weg zurück in den Elternbereich.
 */
export const RECOVERY_WORDS = [
  'Ahorn', 'Amsel', 'Anker', 'Apfel', 'Bach', 'Baum', 'Beere', 'Berg',
  'Biber', 'Biene', 'Blatt', 'Blume', 'Boot', 'Brot', 'Bruecke', 'Busch',
  'Dach', 'Dachs', 'Distel', 'Eiche', 'Eule', 'Farn', 'Feder', 'Fels',
  'Fisch', 'Flug', 'Fluss', 'Frosch', 'Fuchs', 'Garten', 'Gras', 'Hafen',
  'Hase', 'Haus', 'Heide', 'Himmel', 'Hirsch', 'Honig', 'Huegel', 'Hummel',
  'Igel', 'Insel', 'Kaefer', 'Kanu', 'Kiesel', 'Kirsche', 'Klee', 'Knospe',
  'Koenig', 'Korb', 'Krone', 'Lampe', 'Laterne', 'Laub', 'Licht', 'Linde',
  'Luchs', 'Mond', 'Moos', 'Muschel', 'Nebel', 'Nest', 'Nuss', 'Otter',
  'Pfad', 'Pilz', 'Quelle', 'Rabe', 'Regen', 'Reh', 'Ring', 'Rinde',
  'Schnee', 'See', 'Segel', 'Sonne', 'Specht', 'Stein', 'Stern', 'Storch',
  'Strauch', 'Tanne', 'Tau', 'Teich', 'Ufer', 'Uhu', 'Vogel', 'Wald',
  'Welle', 'Wiese', 'Wind', 'Wolke', 'Wurzel', 'Zapfen', 'Zaun', 'Zweig',
]

/** Drei zufällige, verschiedene Wörter — z. B. "Fuchs Laterne Moos". */
export function makeRecoveryPhrase(): string {
  const picked: string[] = []
  const pool = [...RECOVERY_WORDS]
  const rnd = new Uint32Array(3)
  crypto.getRandomValues(rnd)
  for (let i = 0; i < 3; i++) {
    const idx = rnd[i] % pool.length
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked.join(' ')
}
