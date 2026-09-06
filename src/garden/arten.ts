/**
 * Der Katalog des Gartens: Pflanzenarten, Dekoration und Besucher.
 *
 * Jede Pflanze wächst in Echtzeit — aber nur, solange sie Wasser hat. Die
 * Stunden bis zur Reife sind bewusst so gewählt, dass ein Kind, das jeden
 * Tag gießt, alle zwei bis fünf Tage etwas ernten kann. Wer nicht gießt,
 * dessen Pflanze wartet: Sie lässt die Blätter hängen, aber sie stirbt nie.
 */

export type PflanzenForm =
  | 'tulpe'
  | 'sonnenblume'
  | 'rose'
  | 'lavendel'
  | 'moehre'
  | 'radieschen'
  | 'salat'
  | 'tomate'
  | 'erdbeere'
  | 'kuerbis'
  | 'apfelbaum'
  | 'kirschbaum'
  | 'kaktus'
  | 'mais'
  | 'bohne'

export type PflanzenArt = 'blume' | 'gemuese' | 'obst' | 'baum'

export interface Pflanze {
  id: string
  name: string
  /** mit Artikel, für Funkels Sätze */
  mitArtikel: string
  form: PflanzenForm
  art: PflanzenArt
  /** Preis eines Samens in Sternen */
  kosten: number
  /** Ab wie vielen Sternen insgesamt im Laden (0 = sofort) */
  freiAb: number
  /** Gegossene Stunden bis zur Reife */
  stundenBisReif: number
  /** Wasserverbrauch in Prozent je Stunde */
  wasserProStunde: number
  /** Sterne je Ernte */
  sterne: number
  /** Wächst nach der Ernte weiter (Strauch, Baum) oder ist dann abgeerntet */
  mehrjaehrig: boolean
  /** Symbol für Laden, Buch und Bild-Export */
  emoji: string
  /** Blüten- oder Fruchtfarbe */
  farbe: string
  /** Was in der Ernte landet, z. B. „3 Tomaten" */
  ertrag: string
  fakten: string[]
}

export const PFLANZEN: Pflanze[] = [
  {
    id: 'tulpe', name: 'Tulpe', mitArtikel: 'die Tulpe', form: 'tulpe', art: 'blume',
    kosten: 3, freiAb: 0, stundenBisReif: 20, wasserProStunde: 3.2, sterne: 2, mehrjaehrig: false,
    emoji: '🌷', farbe: '#E4634F', ertrag: 'einen Strauß Tulpen',
    fakten: [
      'Tulpen kommen ursprünglich aus den Bergen der Türkei.',
      'Die Zwiebel im Boden speichert Kraft für das nächste Jahr.',
      'Tulpenblüten öffnen sich am Tag und schließen sich nachts.',
    ],
  },
  {
    id: 'moehre', name: 'Möhre', mitArtikel: 'die Möhre', form: 'moehre', art: 'gemuese',
    kosten: 3, freiAb: 0, stundenBisReif: 26, wasserProStunde: 2.8, sterne: 2, mehrjaehrig: false,
    emoji: '🥕', farbe: '#F08A3C', ertrag: 'ein Bündel Möhren',
    fakten: [
      'Der essbare Teil der Möhre wächst unter der Erde.',
      'Früher waren Möhren weiß oder lila, orange kam erst später.',
      'Das Grün oben verrät, wo unten eine Möhre steckt.',
    ],
  },
  {
    id: 'radieschen', name: 'Radieschen', mitArtikel: 'das Radieschen', form: 'radieschen', art: 'gemuese',
    kosten: 3, freiAb: 0, stundenBisReif: 16, wasserProStunde: 3.4, sterne: 2, mehrjaehrig: false,
    emoji: '🔴', farbe: '#D6455E', ertrag: 'ein Bund Radieschen',
    fakten: [
      'Radieschen sind nach drei bis vier Wochen im Beet fertig.',
      'Ihr scharfer Geschmack kommt vom Senföl.',
      'Die Blätter kann man wie Salat essen.',
    ],
  },
  {
    id: 'sonnenblume', name: 'Sonnenblume', mitArtikel: 'die Sonnenblume', form: 'sonnenblume', art: 'blume',
    kosten: 5, freiAb: 0, stundenBisReif: 40, wasserProStunde: 3.8, sterne: 3, mehrjaehrig: false,
    emoji: '🌻', farbe: '#F6BD41', ertrag: 'eine Handvoll Sonnenblumenkerne',
    fakten: [
      'Junge Sonnenblumen drehen ihren Kopf mit der Sonne mit.',
      'Eine Sonnenblume kann höher werden als eine erwachsene Person.',
      'In einer Blüte stecken über tausend kleine Kerne.',
    ],
  },
  {
    id: 'salat', name: 'Salat', mitArtikel: 'der Salat', form: 'salat', art: 'gemuese',
    kosten: 3, freiAb: 10, stundenBisReif: 22, wasserProStunde: 3.6, sterne: 2, mehrjaehrig: false,
    emoji: '🥬', farbe: '#7FB069', ertrag: 'einen Kopf Salat',
    fakten: [
      'Salat besteht fast nur aus Wasser und braucht viel davon.',
      'Schnecken lieben Salat genauso wie wir.',
      'Ein Salatkopf wächst von innen nach außen.',
    ],
  },
  {
    id: 'erdbeere', name: 'Erdbeere', mitArtikel: 'die Erdbeere', form: 'erdbeere', art: 'obst',
    kosten: 6, freiAb: 10, stundenBisReif: 34, wasserProStunde: 3.0, sterne: 3, mehrjaehrig: true,
    emoji: '🍓', farbe: '#E4634F', ertrag: 'eine Schale Erdbeeren',
    fakten: [
      'Erdbeeren sind gar keine Beeren, sondern Sammelnussfrüchte.',
      'Die kleinen gelben Punkte außen sind die echten Früchte.',
      'Erdbeerpflanzen bilden Ausläufer und wandern so übers Beet.',
    ],
  },
  {
    id: 'lavendel', name: 'Lavendel', mitArtikel: 'der Lavendel', form: 'lavendel', art: 'blume',
    kosten: 6, freiAb: 20, stundenBisReif: 30, wasserProStunde: 1.8, sterne: 3, mehrjaehrig: true,
    emoji: '💜', farbe: '#9A7FC9', ertrag: 'ein Säckchen Lavendel',
    fakten: [
      'Lavendel duftet so stark, dass Motten ihn meiden.',
      'Bienen und Hummeln lieben Lavendelblüten.',
      'Er braucht wenig Wasser und viel Sonne.',
    ],
  },
  {
    id: 'tomate', name: 'Tomate', mitArtikel: 'die Tomate', form: 'tomate', art: 'obst',
    kosten: 7, freiAb: 20, stundenBisReif: 44, wasserProStunde: 3.5, sterne: 4, mehrjaehrig: true,
    emoji: '🍅', farbe: '#E04B3C', ertrag: 'einen Korb Tomaten',
    fakten: [
      'Tomaten sind Früchte, obwohl sie wie Gemüse gegessen werden.',
      'Grüne Tomaten werden erst mit Wärme und Zeit rot.',
      'Die Pflanze kann höher wachsen als ein Kind.',
    ],
  },
  {
    id: 'mais', name: 'Mais', mitArtikel: 'der Mais', form: 'mais', art: 'gemuese',
    kosten: 6, freiAb: 30, stundenBisReif: 48, wasserProStunde: 3.4, sterne: 4, mehrjaehrig: false,
    emoji: '🌽', farbe: '#F6BD41', ertrag: 'drei Maiskolben',
    fakten: [
      'Aus Maiskörnern wird Popcorn, wenn man sie stark erhitzt.',
      'Eine Maispflanze wird oft über zwei Meter hoch.',
      'Jeder Faden am Kolben gehört zu einem Korn.',
    ],
  },
  {
    id: 'bohne', name: 'Bohne', mitArtikel: 'die Bohne', form: 'bohne', art: 'gemuese',
    kosten: 5, freiAb: 30, stundenBisReif: 30, wasserProStunde: 3.2, sterne: 3, mehrjaehrig: false,
    emoji: '🫛', farbe: '#63914F', ertrag: 'eine Handvoll Bohnen',
    fakten: [
      'Bohnen klettern an Stangen hoch, immer gegen den Uhrzeigersinn.',
      'Die Wurzeln der Bohne machen den Boden fruchtbarer.',
      'In jeder Hülse stecken mehrere Samen.',
    ],
  },
  {
    id: 'rose', name: 'Rose', mitArtikel: 'die Rose', form: 'rose', art: 'blume',
    kosten: 8, freiAb: 40, stundenBisReif: 36, wasserProStunde: 2.6, sterne: 4, mehrjaehrig: true,
    emoji: '🌹', farbe: '#D6455E', ertrag: 'einen Strauß Rosen',
    fakten: [
      'Rosen haben Stacheln, keine Dornen.',
      'Aus Rosenblüten wird Duftwasser gemacht.',
      'Manche Rosenstöcke werden über hundert Jahre alt.',
    ],
  },
  {
    id: 'kaktus', name: 'Kaktus', mitArtikel: 'der Kaktus', form: 'kaktus', art: 'blume',
    kosten: 5, freiAb: 40, stundenBisReif: 60, wasserProStunde: 0.7, sterne: 4, mehrjaehrig: true,
    emoji: '🌵', farbe: '#F08AB3', ertrag: 'eine Kaktusblüte',
    fakten: [
      'Ein Kaktus speichert Wasser in seinem dicken Stamm.',
      'Die Stacheln sind umgebaute Blätter.',
      'Manche Kakteen blühen nur eine einzige Nacht.',
    ],
  },
  {
    id: 'kuerbis', name: 'Kürbis', mitArtikel: 'der Kürbis', form: 'kuerbis', art: 'gemuese',
    kosten: 8, freiAb: 50, stundenBisReif: 56, wasserProStunde: 3.8, sterne: 5, mehrjaehrig: false,
    emoji: '🎃', farbe: '#F08A3C', ertrag: 'einen dicken Kürbis',
    fakten: [
      'Der schwerste Kürbis der Welt wog mehr als ein Auto.',
      'Kürbisranken können über zehn Meter lang werden.',
      'Die Kerne kann man rösten und essen.',
    ],
  },
  {
    id: 'apfelbaum', name: 'Apfelbaum', mitArtikel: 'der Apfelbaum', form: 'apfelbaum', art: 'baum',
    kosten: 12, freiAb: 60, stundenBisReif: 90, wasserProStunde: 1.6, sterne: 6, mehrjaehrig: true,
    emoji: '🍎', farbe: '#E4634F', ertrag: 'einen Korb Äpfel',
    fakten: [
      'Ein Apfelbaum trägt erst nach einigen Jahren Früchte.',
      'Aus einem Apfelkern wächst ein Baum mit ganz anderen Äpfeln.',
      'Bienen bestäuben die Blüten, sonst gibt es keine Äpfel.',
    ],
  },
  {
    id: 'kirschbaum', name: 'Kirschbaum', mitArtikel: 'der Kirschbaum', form: 'kirschbaum', art: 'baum',
    kosten: 14, freiAb: 80, stundenBisReif: 100, wasserProStunde: 1.6, sterne: 7, mehrjaehrig: true,
    emoji: '🍒', farbe: '#B4213C', ertrag: 'eine Schale Kirschen',
    fakten: [
      'Kirschbäume blühen im Frühling weiß oder rosa.',
      'Vögel lieben Kirschen und verteilen so die Kerne.',
      'In Japan feiern Menschen die Kirschblüte mit Festen.',
    ],
  },
]

export function pflanzeById(id: string): Pflanze | undefined {
  return PFLANZEN.find((p) => p.id === id)
}

/** Was im Laden steht — Neues erscheint mit wachsendem Sternkonto. */
export function samenLaden(starsTotal: number): Pflanze[] {
  return PFLANZEN.filter((p) => starsTotal >= p.freiAb)
}

/* ------------------------------------------------------------------ */
/* Dekoration: steht am Gartenrand, kostet einmal, bleibt für immer     */
/* ------------------------------------------------------------------ */

export interface Deko {
  id: string
  name: string
  emoji: string
  kosten: number
  freiAb: number
  fakten: string[]
}

export const DEKO: Deko[] = [
  { id: 'vogelhaus', name: 'Vogelhaus', emoji: '🏡', kosten: 10, freiAb: 15, fakten: [
    'Im Winter finden Vögel schwer Futter, ein Häuschen hilft ihnen.',
    'Meisen bauen ihr Nest gern in Höhlen mit kleinem Eingang.',
  ] },
  { id: 'bank', name: 'Bank', emoji: '🪑', kosten: 10, freiAb: 20, fakten: [
    'Von einer Bank aus sieht man Tiere, weil man still sitzt.',
    'Holzbänke im Garten werden oft aus alten Bäumen gebaut.',
  ] },
  { id: 'teich', name: 'Teich', emoji: '💧', kosten: 14, freiAb: 30, fakten: [
    'In einem Teich leben Frösche, Libellen und winzige Wasserflöhe.',
    'Kaulquappen bekommen erst Hinterbeine, dann Vorderbeine.',
  ] },
  { id: 'bienenstock', name: 'Bienenstock', emoji: '🍯', kosten: 16, freiAb: 40, fakten: [
    'Bienen sagen sich mit einem Tanz, wo es Blüten gibt.',
    'Für ein Glas Honig fliegen Bienen einmal um die halbe Erde.',
    'In einem Stock leben im Sommer bis zu 50 000 Bienen.',
  ] },
  { id: 'vogelscheuche', name: 'Vogelscheuche', emoji: '🧑‍🌾', kosten: 12, freiAb: 50, fakten: [
    'Eine Vogelscheuche soll Vögel vom frischen Saatgut fernhalten.',
    'Schlaue Krähen merken schnell, dass sie sich nicht bewegt.',
  ] },
  { id: 'laterne', name: 'Laterne', emoji: '🏮', kosten: 12, freiAb: 60, fakten: [
    'Früher zündete ein Laternenanzünder abends jede Laterne von Hand an.',
    'Nachtfalter fliegen zum Licht, weil sie sich am Mond orientieren.',
  ] },
  { id: 'gartenzwerg', name: 'Gartenzwerg', emoji: '🧙', kosten: 15, freiAb: 70, fakten: [
    'Die ersten Gartenzwerge wurden vor über 150 Jahren aus Ton gemacht.',
    'Sie sollen den Garten beschützen und Glück bringen.',
  ] },
  { id: 'brunnen', name: 'Brunnen', emoji: '⛲', kosten: 20, freiAb: 90, fakten: [
    'Aus einem Brunnen holten Menschen früher ihr Trinkwasser.',
    'Vögel baden gern in flachem Brunnenwasser.',
  ] },
]

export function dekoById(id: string): Deko | undefined {
  return DEKO.find((d) => d.id === id)
}

export function dekoLaden(starsTotal: number): Deko[] {
  return DEKO.filter((d) => starsTotal >= d.freiAb)
}

/* ------------------------------------------------------------------ */
/* Besucher: Tiere kommen von selbst, wenn der Garten ihnen gefällt     */
/* ------------------------------------------------------------------ */

export interface Besucher {
  id: string
  name: string
  emoji: string
  /** Was Funkel sagt, wenn das Tier zum ersten Mal da ist */
  text: string
  fakten: string[]
}

export const BESUCHER: Besucher[] = [
  { id: 'schmetterling', name: 'Schmetterling', emoji: '🦋', text: 'So viele Blumen — ein Schmetterling ist zu Besuch!', fakten: [
    'Ein Schmetterling schmeckt mit den Füßen, ob eine Blüte passt.',
    'Vorher war er eine Raupe und hat sich vollständig umgebaut.',
  ] },
  { id: 'biene', name: 'Biene', emoji: '🐝', text: 'Summ! Die Bienen haben deine Blüten gefunden.', fakten: [
    'Bienen sehen Farben, die wir nicht sehen können.',
    'Eine Biene besucht an einem Tag hunderte Blüten.',
  ] },
  { id: 'vogel', name: 'Rotkehlchen', emoji: '🐦', text: 'Ein Rotkehlchen wohnt jetzt in deinem Garten.', fakten: [
    'Rotkehlchen singen auch im Winter.',
    'Sie folgen Gärtnern, weil beim Graben Würmer auftauchen.',
  ] },
  { id: 'igel', name: 'Igel', emoji: '🦔', text: 'Ein Igel schnuppert durch dein Gemüse — er frisst die Schnecken!', fakten: [
    'Der Igel hat bis zu 8000 Stacheln.',
    'Nachts sucht er Käfer, Würmer und Schnecken.',
  ] },
  { id: 'frosch', name: 'Frosch', emoji: '🐸', text: 'Quak! Im Teich sitzt jetzt ein Frosch.', fakten: [
    'Frösche trinken nicht, sie nehmen Wasser über die Haut auf.',
    'Im Winter schlafen viele Frösche im Schlamm am Teichgrund.',
  ] },
  { id: 'eichhoernchen', name: 'Eichhörnchen', emoji: '🐿️', text: 'Ein Eichhörnchen turnt in deinem Baum herum!', fakten: [
    'Eichhörnchen vergessen, wo sie Nüsse vergraben — daraus wachsen Bäume.',
    'Der buschige Schwanz hilft beim Springen und wärmt im Schlaf.',
  ] },
  { id: 'marienkaefer', name: 'Marienkäfer', emoji: '🐞', text: 'Ein Marienkäfer ist gelandet. Der hilft gegen Blattläuse!', fakten: [
    'Ein Marienkäfer frisst am Tag bis zu 150 Blattläuse.',
    'Die Punkte verraten die Art, nicht das Alter.',
  ] },
  { id: 'hase', name: 'Hase', emoji: '🐰', text: 'Ein Hase hoppelt durch den Garten — er hat es auf die Möhren abgesehen.', fakten: [
    'Hasen können ihre Ohren einzeln drehen und hören nach hinten.',
    'Ein Feldhase rennt schneller als ein Auto in der Stadt.',
  ] },
]

export function besucherById(id: string): Besucher | undefined {
  return BESUCHER.find((b) => b.id === id)
}
