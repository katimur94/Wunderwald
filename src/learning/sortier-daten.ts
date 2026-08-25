/**
 * Kategorien für die Sortier-Werkstatt.
 *
 * Zwei Sorten von Körben:
 *  - **Art** (Tiere, Obst, Fahrzeuge …): Was ist das Ding?
 *  - **Merkmal** (kann fliegen, ist rot, ist laut …): Wie ist das Ding?
 *
 * Regeln für jeden Eintrag:
 *  - eindeutiges Emoji, das ein Kind ohne Zweifel erkennt
 *  - deutscher Name, damit Funkel es benennen kann
 *  - ein Ding darf in mehreren Kategorien stehen (die Biene ist ein Tier
 *    UND kann fliegen) — welche gerade gilt, entscheidet der Korb
 */

export type KategorieArt = 'art' | 'merkmal'

export interface Ding {
  emoji: string
  name: string
  /** mit Artikel, für Funkels Sätze: „die Biene", „das Auto" */
  mitArtikel: string
}

export interface Kategorie {
  id: string
  /** Aufschrift des Korbdeckels */
  name: string
  /** Symbol auf dem Deckel */
  deckel: string
  art: KategorieArt
  /** Frage, die Funkel stellt, wenn dieser Korb dran ist */
  frage: string
  dinge: Ding[]
}

const d = (emoji: string, name: string, mitArtikel: string): Ding => ({ emoji, name, mitArtikel })

/* ------------------------------------------------------------------ */
/* Körbe nach Art                                                      */
/* ------------------------------------------------------------------ */

export const ART_KATEGORIEN: Kategorie[] = [
  {
    id: 'tiere', name: 'Tiere', deckel: '🐾', art: 'art',
    frage: 'Was ist ein Tier?',
    dinge: [
      d('🐶', 'Hund', 'der Hund'), d('🐱', 'Katze', 'die Katze'), d('🐰', 'Hase', 'der Hase'),
      d('🐴', 'Pferd', 'das Pferd'), d('🐷', 'Schwein', 'das Schwein'), d('🐮', 'Kuh', 'die Kuh'),
      d('🦊', 'Fuchs', 'der Fuchs'), d('🐻', 'Bär', 'der Bär'), d('🦁', 'Löwe', 'der Löwe'),
      d('🐘', 'Elefant', 'der Elefant'),
    ],
  },
  {
    id: 'obst', name: 'Obst', deckel: '🍎', art: 'art',
    frage: 'Was ist Obst?',
    dinge: [
      d('🍎', 'Apfel', 'der Apfel'), d('🍌', 'Banane', 'die Banane'), d('🍐', 'Birne', 'die Birne'),
      d('🍓', 'Erdbeere', 'die Erdbeere'), d('🍒', 'Kirsche', 'die Kirsche'), d('🍇', 'Traube', 'die Traube'),
      d('🍉', 'Melone', 'die Melone'), d('🍊', 'Orange', 'die Orange'), d('🍑', 'Pfirsich', 'der Pfirsich'),
      d('🍍', 'Ananas', 'die Ananas'),
    ],
  },
  {
    id: 'fahrzeuge', name: 'Fahrzeuge', deckel: '🚗', art: 'art',
    frage: 'Was fährt oder fliegt?',
    dinge: [
      d('🚗', 'Auto', 'das Auto'), d('🚌', 'Bus', 'der Bus'), d('🚂', 'Zug', 'der Zug'),
      d('🚲', 'Fahrrad', 'das Fahrrad'), d('🚜', 'Traktor', 'der Traktor'), d('🚚', 'Lastwagen', 'der Lastwagen'),
      d('✈️', 'Flugzeug', 'das Flugzeug'), d('🚢', 'Schiff', 'das Schiff'), d('🚁', 'Hubschrauber', 'der Hubschrauber'),
      d('🛵', 'Roller', 'der Roller'),
    ],
  },
  {
    id: 'kleidung', name: 'Kleidung', deckel: '👕', art: 'art',
    frage: 'Was zieht man an?',
    dinge: [
      d('👕', 'T-Shirt', 'das T-Shirt'), d('👖', 'Hose', 'die Hose'), d('🧥', 'Jacke', 'die Jacke'),
      d('🧦', 'Socke', 'die Socke'), d('👟', 'Schuh', 'der Schuh'), d('🎩', 'Hut', 'der Hut'),
      d('🧣', 'Schal', 'der Schal'), d('🧤', 'Handschuh', 'der Handschuh'), d('👗', 'Kleid', 'das Kleid'),
      d('🩳', 'Shorts', 'die Shorts'),
    ],
  },
  {
    id: 'werkzeuge', name: 'Werkzeuge', deckel: '🔨', art: 'art',
    frage: 'Womit kann man arbeiten?',
    dinge: [
      d('🔨', 'Hammer', 'der Hammer'), d('🪛', 'Schraubenzieher', 'der Schraubenzieher'), d('🔧', 'Schraubenschlüssel', 'der Schraubenschlüssel'),
      d('✂️', 'Schere', 'die Schere'), d('🪚', 'Säge', 'die Säge'), d('🪣', 'Eimer', 'der Eimer'),
      d('🖌️', 'Pinsel', 'der Pinsel'), d('🪜', 'Leiter', 'die Leiter'), d('🧹', 'Besen', 'der Besen'),
      d('🪓', 'Axt', 'die Axt'),
    ],
  },
  {
    id: 'wetter', name: 'Wetter', deckel: '🌦️', art: 'art',
    frage: 'Was ist Wetter?',
    dinge: [
      d('☀️', 'Sonne', 'die Sonne'), d('☁️', 'Wolke', 'die Wolke'), d('🌧️', 'Regen', 'der Regen'),
      d('❄️', 'Schnee', 'der Schnee'), d('⛈️', 'Gewitter', 'das Gewitter'), d('🌈', 'Regenbogen', 'der Regenbogen'),
      d('🌪️', 'Wirbelwind', 'der Wirbelwind'), d('🌫️', 'Nebel', 'der Nebel'), d('💨', 'Wind', 'der Wind'),
      d('🌩️', 'Blitz', 'der Blitz'),
    ],
  },
  {
    id: 'instrumente', name: 'Instrumente', deckel: '🎵', art: 'art',
    frage: 'Womit macht man Musik?',
    dinge: [
      d('🎸', 'Gitarre', 'die Gitarre'), d('🎻', 'Geige', 'die Geige'), d('🥁', 'Trommel', 'die Trommel'),
      d('🎹', 'Klavier', 'das Klavier'), d('🎺', 'Trompete', 'die Trompete'), d('🪗', 'Ziehharmonika', 'die Ziehharmonika'),
      d('🎷', 'Saxofon', 'das Saxofon'), d('🪘', 'Konga', 'die Konga'), d('🔔', 'Glocke', 'die Glocke'),
      d('🪕', 'Banjo', 'das Banjo'),
    ],
  },
]

/* ------------------------------------------------------------------ */
/* Körbe nach Merkmal                                                  */
/* ------------------------------------------------------------------ */

export const MERKMAL_KATEGORIEN: Kategorie[] = [
  {
    id: 'fliegt', name: 'fliegt', deckel: '🕊️', art: 'merkmal',
    frage: 'Was kann fliegen?',
    dinge: [
      d('🐦', 'Vogel', 'der Vogel'), d('🦋', 'Schmetterling', 'der Schmetterling'), d('🐝', 'Biene', 'die Biene'),
      d('✈️', 'Flugzeug', 'das Flugzeug'), d('🚁', 'Hubschrauber', 'der Hubschrauber'), d('🦅', 'Adler', 'der Adler'),
      d('🎈', 'Luftballon', 'der Luftballon'), d('🦉', 'Eule', 'die Eule'),
    ],
  },
  {
    id: 'schwimmt', name: 'schwimmt', deckel: '🌊', art: 'merkmal',
    frage: 'Was schwimmt im Wasser?',
    dinge: [
      d('🐟', 'Fisch', 'der Fisch'), d('🐳', 'Wal', 'der Wal'), d('🦆', 'Ente', 'die Ente'),
      d('🐬', 'Delfin', 'der Delfin'), d('🐢', 'Schildkröte', 'die Schildkröte'), d('🦈', 'Hai', 'der Hai'),
      d('⛵', 'Boot', 'das Boot'), d('🐙', 'Oktopus', 'der Oktopus'),
    ],
  },
  {
    id: 'faehrt', name: 'fährt', deckel: '🛞', art: 'merkmal',
    frage: 'Was fährt auf der Straße?',
    dinge: [
      d('🚗', 'Auto', 'das Auto'), d('🚌', 'Bus', 'der Bus'), d('🚲', 'Fahrrad', 'das Fahrrad'),
      d('🚜', 'Traktor', 'der Traktor'), d('🚚', 'Lastwagen', 'der Lastwagen'), d('🛵', 'Roller', 'der Roller'),
      d('🚑', 'Krankenwagen', 'der Krankenwagen'), d('🚒', 'Feuerwehrauto', 'das Feuerwehrauto'),
    ],
  },
  {
    id: 'laut', name: 'laut', deckel: '📢', art: 'merkmal',
    frage: 'Was ist laut?',
    dinge: [
      d('🥁', 'Trommel', 'die Trommel'), d('🎺', 'Trompete', 'die Trompete'), d('🚒', 'Feuerwehrauto', 'das Feuerwehrauto'),
      d('⛈️', 'Gewitter', 'das Gewitter'), d('🦁', 'Löwe', 'der Löwe'), d('🚁', 'Hubschrauber', 'der Hubschrauber'),
      d('🔔', 'Glocke', 'die Glocke'), d('🎸', 'Gitarre', 'die Gitarre'),
    ],
  },
  {
    id: 'leise', name: 'leise', deckel: '🤫', art: 'merkmal',
    frage: 'Was ist ganz leise?',
    dinge: [
      d('🦋', 'Schmetterling', 'der Schmetterling'), d('🐌', 'Schnecke', 'die Schnecke'), d('🪶', 'Feder', 'die Feder'),
      d('☁️', 'Wolke', 'die Wolke'), d('🐟', 'Fisch', 'der Fisch'), d('🌷', 'Blume', 'die Blume'),
      d('🕯️', 'Kerze', 'die Kerze'), d('🐛', 'Raupe', 'die Raupe'),
    ],
  },
  {
    id: 'rot', name: 'rot', deckel: '🟥', art: 'merkmal',
    frage: 'Was ist rot?',
    dinge: [
      d('🍎', 'Apfel', 'der Apfel'), d('🍓', 'Erdbeere', 'die Erdbeere'), d('🍅', 'Tomate', 'die Tomate'),
      d('🌹', 'Rose', 'die Rose'), d('❤️', 'Herz', 'das Herz'), d('🚒', 'Feuerwehrauto', 'das Feuerwehrauto'),
      d('🍒', 'Kirsche', 'die Kirsche'), d('🐞', 'Marienkäfer', 'der Marienkäfer'),
    ],
  },
  {
    id: 'gelb', name: 'gelb', deckel: '🟨', art: 'merkmal',
    frage: 'Was ist gelb?',
    dinge: [
      d('🍌', 'Banane', 'die Banane'), d('🍋', 'Zitrone', 'die Zitrone'), d('☀️', 'Sonne', 'die Sonne'),
      d('🌻', 'Sonnenblume', 'die Sonnenblume'), d('🐤', 'Küken', 'das Küken'), d('🧀', 'Käse', 'der Käse'),
      d('🌙', 'Mond', 'der Mond'), d('🚕', 'Taxi', 'das Taxi'),
    ],
  },
  {
    id: 'gross', name: 'groß', deckel: '🐘', art: 'merkmal',
    frage: 'Was ist riesengroß?',
    dinge: [
      d('🐘', 'Elefant', 'der Elefant'), d('🐳', 'Wal', 'der Wal'), d('🦒', 'Giraffe', 'die Giraffe'),
      d('🏔️', 'Berg', 'der Berg'), d('🌳', 'Baum', 'der Baum'), d('🚢', 'Schiff', 'das Schiff'),
      d('🏰', 'Burg', 'die Burg'), d('🦕', 'Dino', 'der Dino'),
    ],
  },
  {
    id: 'klein', name: 'klein', deckel: '🐜', art: 'merkmal',
    frage: 'Was ist winzig klein?',
    dinge: [
      d('🐜', 'Ameise', 'die Ameise'), d('🐝', 'Biene', 'die Biene'), d('🐞', 'Marienkäfer', 'der Marienkäfer'),
      d('🌰', 'Nuss', 'die Nuss'), d('🐌', 'Schnecke', 'die Schnecke'), d('🔑', 'Schlüssel', 'der Schlüssel'),
      d('🪱', 'Wurm', 'der Wurm'), d('🫘', 'Bohne', 'die Bohne'),
    ],
  },
]

export const KATEGORIEN: Kategorie[] = [...ART_KATEGORIEN, ...MERKMAL_KATEGORIEN]

/* ------------------------------------------------------------------ */
/* Abfrage-Helfer                                                      */
/* ------------------------------------------------------------------ */

export function kategorieById(id: string): Kategorie | undefined {
  return KATEGORIEN.find((k) => k.id === id)
}

/** Steckt dieses Ding in dieser Kategorie? Verglichen wird über das Bild. */
export function gehoertZu(ding: Ding, kategorie: Kategorie): boolean {
  return kategorie.dinge.some((x) => x.emoji === ding.emoji)
}

/**
 * Dinge, die NUR in `kategorie` liegen und in keiner der `andere`.
 * Genau das braucht das Spiel: ein Ding, das in zwei offene Körbe passt,
 * hat keine richtige Antwort.
 */
export function eindeutigeDinge(kategorie: Kategorie, andere: Kategorie[]): Ding[] {
  return kategorie.dinge.filter((ding) => !andere.some((k) => k.id !== kategorie.id && gehoertZu(ding, k)))
}

/** Dinge, die in keinen der genannten Körbe passen — für den Fragezeichen-Tisch. */
export function passtNirgendwo(koerbe: Kategorie[], auswahl: Ding[]): Ding[] {
  return auswahl.filter((ding) => !koerbe.some((k) => gehoertZu(ding, k)))
}

/* ------------------------------------------------------------------ */
/* Zwei Merkmale gleichzeitig (Stufe 7-8)                              */
/* ------------------------------------------------------------------ */

/**
 * Runden, in denen jeder Korb zwei Bedingungen zugleich stellt — Art UND
 * Eigenschaft. Die Körbe einer Runde sind bewusst **überschneidungsfrei**
 * zusammengestellt: Ein Ding, das in zwei Körbe passt, hätte keine richtige
 * Antwort, und genau das prüfen die Tests nach.
 */
export interface KombiRunde {
  id: string
  frage: string
  koerbe: Kategorie[]
}

export const KOMBI_RUNDEN: KombiRunde[] = [
  {
    id: 'obst-farben',
    frage: 'Sortier das Obst nach seiner Farbe!',
    koerbe: [
      {
        id: 'obst-rot', name: 'rotes Obst', deckel: '🟥', art: 'merkmal',
        frage: 'Welches Obst ist rot?',
        dinge: [
          d('🍎', 'Apfel', 'der Apfel'), d('🍓', 'Erdbeere', 'die Erdbeere'),
          d('🍒', 'Kirsche', 'die Kirsche'),
        ],
      },
      {
        id: 'obst-gelb', name: 'gelbes Obst', deckel: '🟨', art: 'merkmal',
        frage: 'Welches Obst ist gelb?',
        dinge: [
          d('🍌', 'Banane', 'die Banane'), d('🍋', 'Zitrone', 'die Zitrone'),
          d('🍍', 'Ananas', 'die Ananas'),
        ],
      },
      {
        id: 'obst-gruen', name: 'grünes Obst', deckel: '🟩', art: 'merkmal',
        frage: 'Welches Obst ist grün?',
        dinge: [
          d('🥝', 'Kiwi', 'die Kiwi'), d('🥑', 'Avocado', 'die Avocado'),
          d('🍐', 'Birne', 'die Birne'),
        ],
      },
    ],
  },
  {
    id: 'fahrzeuge-wege',
    frage: 'Wo fährt jedes Fahrzeug?',
    koerbe: [
      {
        id: 'fz-strasse', name: 'auf der Straße', deckel: '🛣️', art: 'merkmal',
        frage: 'Was fährt auf der Straße?',
        dinge: [
          d('🚗', 'Auto', 'das Auto'), d('🚌', 'Bus', 'der Bus'),
          d('🚚', 'Lastwagen', 'der Lastwagen'), d('🛵', 'Roller', 'der Roller'),
        ],
      },
      {
        id: 'fz-wasser', name: 'auf dem Wasser', deckel: '🌊', art: 'merkmal',
        frage: 'Was fährt auf dem Wasser?',
        dinge: [
          d('⛵', 'Boot', 'das Boot'), d('🚢', 'Schiff', 'das Schiff'),
          d('🛶', 'Kanu', 'das Kanu'),
        ],
      },
      {
        id: 'fz-luft', name: 'in der Luft', deckel: '☁️', art: 'merkmal',
        frage: 'Was fliegt in der Luft?',
        dinge: [
          d('✈️', 'Flugzeug', 'das Flugzeug'), d('🚁', 'Hubschrauber', 'der Hubschrauber'),
          d('🎈', 'Luftballon', 'der Luftballon'),
        ],
      },
    ],
  },
  {
    id: 'tiere-huelle',
    frage: 'Was hat jedes Tier?',
    koerbe: [
      {
        id: 'tier-federn', name: 'Tiere mit Federn', deckel: '🪶', art: 'merkmal',
        frage: 'Welches Tier hat Federn?',
        dinge: [
          d('🐦', 'Vogel', 'der Vogel'), d('🦉', 'Eule', 'die Eule'),
          d('🐓', 'Hahn', 'der Hahn'), d('🦜', 'Papagei', 'der Papagei'),
        ],
      },
      {
        id: 'tier-fell', name: 'Tiere mit Fell', deckel: '🧸', art: 'merkmal',
        frage: 'Welches Tier hat Fell?',
        dinge: [
          d('🐰', 'Hase', 'der Hase'), d('🦊', 'Fuchs', 'der Fuchs'),
          d('🐻', 'Bär', 'der Bär'), d('🐱', 'Katze', 'die Katze'),
        ],
      },
      {
        id: 'tier-flossen', name: 'Tiere mit Flossen', deckel: '🌊', art: 'merkmal',
        frage: 'Welches Tier hat Flossen?',
        dinge: [
          d('🐟', 'Fisch', 'der Fisch'), d('🐳', 'Wal', 'der Wal'),
          d('🐬', 'Delfin', 'der Delfin'), d('🦈', 'Hai', 'der Hai'),
        ],
      },
    ],
  },
  {
    id: 'kleidung-koerper',
    frage: 'Wohin gehört jedes Kleidungsstück?',
    koerbe: [
      {
        id: 'kl-fuesse', name: 'für die Füße', deckel: '🦶', art: 'merkmal',
        frage: 'Was zieht man an die Füße?',
        dinge: [
          d('🧦', 'Socke', 'die Socke'), d('👟', 'Schuh', 'der Schuh'),
          d('🥾', 'Stiefel', 'der Stiefel'),
        ],
      },
      {
        id: 'kl-kopf', name: 'für den Kopf', deckel: '👤', art: 'merkmal',
        frage: 'Was setzt man auf den Kopf?',
        dinge: [
          d('🎩', 'Hut', 'der Hut'), d('🧢', 'Mütze', 'die Mütze'),
          d('👑', 'Krone', 'die Krone'),
        ],
      },
      {
        id: 'kl-haende', name: 'für die Hände', deckel: '✋', art: 'merkmal',
        frage: 'Was trägt man an den Händen?',
        dinge: [
          d('🧤', 'Handschuh', 'der Handschuh'), d('💍', 'Ring', 'der Ring'),
          d('⌚', 'Armbanduhr', 'die Armbanduhr'),
        ],
      },
    ],
  },
]

/**
 * Paare von Kategorien, die weit auseinanderliegen (Stufe 1–2) bzw. nah
 * beieinander (ab Stufe 3). „Nah" heißt: Man muss zweimal hinschauen,
 * etwa Obst gegen Wetter ist leicht, Werkzeuge gegen Instrumente nicht.
 */
export const PAARE_LEICHT: [string, string][] = [
  ['tiere', 'obst'], ['tiere', 'fahrzeuge'], ['obst', 'fahrzeuge'],
  ['tiere', 'wetter'], ['obst', 'kleidung'], ['fahrzeuge', 'wetter'],
]

export const PAARE_SCHWER: [string, string][] = [
  ['werkzeuge', 'instrumente'], ['kleidung', 'werkzeuge'], ['tiere', 'instrumente'],
  ['wetter', 'obst'], ['kleidung', 'instrumente'], ['fahrzeuge', 'werkzeuge'],
]

/** Oberbegriff-Runde (Stufe 9–10): Korb ohne Deckel, Deckel zur Auswahl. */
export const OBERBEGRIFFE: string[] = ART_KATEGORIEN.map((k) => k.id)
