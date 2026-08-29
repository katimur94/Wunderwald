/**
 * Hinweise-Engine für den Elternbereich — rein lokal und regelbasiert.
 *
 * Absichtlich KEINE Diagnose-Sprache: Es geht um konkrete, freundliche
 * Alltagstipps, nicht um Bewertung. Es verlässt nichts das Gerät und es
 * wird nichts "erkannt" — es werden Zahlen aus `attempts` gelesen.
 */

import type { Attempt, Progress, WorldId } from '../db/types'

export interface Insight {
  id: string
  /** höher = weiter oben */
  gewicht: number
  ton: 'lob' | 'tipp' | 'hinweis'
  titel: string
  text: string
}

export interface InsightInput {
  attempts: Attempt[]
  progress: Record<WorldId, Progress>
  /** Spielminuten je Tag der letzten 7 Tage */
  minutenProTag: { day: string; minutes: number }[]
  nickname: string
}

const GAME_LABELS: Record<string, string> = {
  'zahlen-ernte': 'Zahlen-Ernte',
  'rechen-bruecke': 'Rechen-Brücke',
  'buchstaben-fang': 'Buchstaben-Fang',
  'wort-baukasten': 'Wort-Baukasten',
  'muster-weber': 'Muster-Weber',
  'paar-finder': 'Paar-Finder',
  'zahlen-waage': 'Zahlen-Waage',
  'zahlen-sprung': 'Zahlen-Sprung',
  'reim-boot': 'Reim-Boot',
  'sortier-werkstatt': 'Sortier-Werkstatt',
}

const WORLD_LABELS: Record<WorldId, string> = {
  zahlen: 'Zahlenland',
  buchstaben: 'Buchstabenwald',
  logik: 'Logik-Labor',
}

/** Konkrete Alltagstipps je Spiel, wenn es dort gerade hakt. */
const GAME_TIPS: Record<string, string> = {
  'zahlen-ernte':
    'Zählen klappt am besten mit den Händen: Treppenstufen zählen, Gabeln beim Tischdecken, Autos auf dem Parkplatz.',
  'rechen-bruecke':
    'Rechnen mit Dingen zum Anfassen fällt leichter. Legen Sie Bausteine oder Nudeln hin und rechnen Sie gemeinsam nach.',
  'buchstaben-fang':
    'Übt gerade Anlaute — beim Einkaufen „Ich sehe was, das mit M anfängt“ spielen hilft mehr als jedes Arbeitsblatt.',
  'wort-baukasten':
    'Übt gerade Silben — beim Vorlesen abends mitklatschen hilft: Ba-na-ne, So-fa, Ka-rot-te.',
  'muster-weber':
    'Muster stecken überall: Fliesen im Bad, Perlenketten auffädeln, Bauklötze abwechselnd stapeln.',
  'paar-finder':
    'Merkspiele gehen auch ohne Bildschirm: „Ich packe meinen Koffer“ oder ein echtes Memory auf dem Teppich.',
  'zahlen-waage':
    'Zerlegen wird greifbar, wenn man es anfassen kann: sieben Bausteine hinlegen und fragen, wie man sie auf zwei Hände verteilen kann.',
  'zahlen-sprung':
    'Schnelles Kopfrechnen braucht sichere Rechenwege. Kleine Blitzaufgaben im Alltag helfen: an der Ampel, beim Treppensteigen, beim Tischdecken.',
  'reim-boot':
    'Reime hört man am besten beim Vorlesen. Reimwörter am Zeilenende betonen und das zweite Wort das Kind sagen lassen.',
  'sortier-werkstatt':
    'Sortieren übt sich beim Aufräumen: erst nach Art (Autos, Tiere), dann nach Merkmal (alles Rote, alles Weiche).',
}

const TAG_MS = 86_400_000

function anteilRichtig(list: Attempt[]): number {
  if (list.length === 0) return 1
  return list.filter((a) => a.correct).length / list.length
}

/**
 * Erzeugt die Hinweise. `now` ist injizierbar, damit die Regeln testbar sind.
 */
export function buildInsights(input: InsightInput, now = Date.now()): Insight[] {
  const { attempts, progress, minutenProTag, nickname } = input
  const letzte7 = attempts.filter((a) => a.ts >= now - 7 * TAG_MS)
  const out: Insight[] = []

  /* --- 1. Noch keine Daten --- */
  if (letzte7.length < 5) {
    out.push({
      id: 'wenig-daten',
      gewicht: 100,
      ton: 'hinweis',
      titel: 'Noch wenig gespielt',
      text: `${nickname} hat diese Woche erst ${letzte7.length} ${
        letzte7.length === 1 ? 'Aufgabe' : 'Aufgaben'
      } gelöst. Ab etwa 20 Aufgaben können wir hier etwas Sinnvolles zeigen.`,
    })
    return out
  }

  /* --- 2. Ein Spiel mit hoher Fehlerquote --- */
  const proSpiel = new Map<string, Attempt[]>()
  for (const a of letzte7) {
    if (!proSpiel.has(a.gameId)) proSpiel.set(a.gameId, [])
    proSpiel.get(a.gameId)!.push(a)
  }
  for (const [gameId, list] of proSpiel) {
    if (list.length < 6) continue
    const quote = anteilRichtig(list)
    if (quote < 0.5) {
      out.push({
        id: `schwer-${gameId}`,
        gewicht: 90,
        ton: 'tipp',
        titel: `${GAME_LABELS[gameId] ?? gameId} fällt gerade schwer`,
        text:
          `${Math.round((1 - quote) * 100)} % der Aufgaben gingen daneben. ` +
          (GAME_TIPS[gameId] ?? 'Gemeinsam üben hilft mehr als allein weitermachen.'),
      })
    } else if (quote >= 0.9 && list.length >= 12) {
      out.push({
        id: `stark-${gameId}`,
        gewicht: 40,
        ton: 'lob',
        titel: `${GAME_LABELS[gameId] ?? gameId} sitzt`,
        text: `${Math.round(quote * 100)} % richtig — die Aufgaben werden von selbst schwieriger, das passt schon.`,
      })
    }
  }

  /* --- 3. Häufig Hilfe genutzt --- */
  const mitHilfe = letzte7.filter((a) => a.usedHint).length
  if (letzte7.length >= 12 && mitHilfe / letzte7.length > 0.3) {
    out.push({
      id: 'viel-hilfe',
      gewicht: 70,
      ton: 'tipp',
      titel: 'Funkel hilft oft mit',
      text: `Bei ${Math.round((mitHilfe / letzte7.length) * 100)} % der Aufgaben hat ${nickname} sich die Lösung zeigen lassen. Das ist völlig in Ordnung — zusammen an einer Aufgabe sitzen bringt hier am meisten.`,
    })
  }

  /* --- 4. Sehr schnelles Raten --- */
  const schnellFalsch = letzte7.filter((a) => !a.correct && a.timeMs < 1500).length
  if (letzte7.length >= 12 && schnellFalsch / letzte7.length > 0.25) {
    out.push({
      id: 'raten',
      gewicht: 75,
      ton: 'tipp',
      titel: 'Viele sehr schnelle Antworten',
      text: 'Ein Teil der Antworten kam in unter anderthalb Sekunden und war falsch — das sieht nach Raten aus. Ein gemeinsames „Erst schauen, dann tippen“ hilft oft schon.',
    })
  }

  /* --- 5. Eine Welt wird gemieden --- */
  const proWelt = new Map<WorldId, number>()
  for (const a of letzte7) proWelt.set(a.worldId as WorldId, (proWelt.get(a.worldId as WorldId) ?? 0) + 1)
  for (const w of Object.keys(WORLD_LABELS) as WorldId[]) {
    if ((proWelt.get(w) ?? 0) === 0 && letzte7.length >= 15) {
      out.push({
        id: `gemieden-${w}`,
        gewicht: 60,
        ton: 'hinweis',
        titel: `${WORLD_LABELS[w]} kam diese Woche nicht dran`,
        text: `${nickname} spielt gerade lieber anderswo. Einmal gemeinsam hingehen reicht oft, um die Hemmung zu nehmen.`,
      })
    }
  }

  /* --- 6. Gleichmäßiges Dranbleiben --- */
  const tageGespielt = minutenProTag.filter((d) => d.minutes > 0).length
  if (tageGespielt >= 5) {
    out.push({
      id: 'dranbleiben',
      gewicht: 45,
      ton: 'lob',
      titel: 'Schön regelmäßig',
      text: `An ${tageGespielt} von 7 Tagen gespielt. Kurz und regelmäßig bringt mehr als einmal lang — genau so läuft es gerade.`,
    })
  } else if (tageGespielt <= 1 && letzte7.length >= 10) {
    out.push({
      id: 'alles-an-einem-tag',
      gewicht: 50,
      ton: 'tipp',
      titel: 'Alles an einem Tag',
      text: 'Die Aufgaben dieser Woche kamen fast alle am selben Tag. Zehn Minuten an mehreren Tagen bleiben besser hängen als eine lange Sitzung.',
    })
  }

  /* --- 7. Lange Sitzungen --- */
  const langeTage = minutenProTag.filter((d) => d.minutes >= 45).length
  if (langeTage >= 2) {
    out.push({
      id: 'lange-sitzungen',
      gewicht: 65,
      ton: 'hinweis',
      titel: 'Recht lange Sitzungen',
      text: `An ${langeTage} Tagen waren es 45 Minuten oder mehr. Im Bereich „Einstellungen“ lässt sich ein Tageslimit setzen — Funkel verabschiedet sich dann von selbst.`,
    })
  }

  /* --- 8. Deutlicher Fortschritt in einer Welt --- */
  for (const w of Object.keys(WORLD_LABELS) as WorldId[]) {
    const p = progress[w]
    if (p && p.level >= 6) {
      out.push({
        id: `stufe-${w}`,
        gewicht: 35,
        ton: 'lob',
        titel: `Gut unterwegs im ${WORLD_LABELS[w]}`,
        text: `${nickname} ist dort inzwischen auf Stufe ${p.level} von 10 angekommen.`,
      })
    }
  }

  /* --- 9. Abends spät gespielt --- */
  const spaet = letzte7.filter((a) => {
    const h = new Date(a.ts).getHours()
    return h >= 20 || h < 6
  }).length
  if (spaet / letzte7.length > 0.4 && letzte7.length >= 12) {
    out.push({
      id: 'spaet',
      gewicht: 55,
      ton: 'hinweis',
      titel: 'Oft spät am Abend',
      text: 'Ein guter Teil der Aufgaben entstand nach 20 Uhr. Bildschirme kurz vor dem Schlafen machen das Einschlafen erfahrungsgemäß schwerer.',
    })
  }

  /* --- 10. Reime sitzen noch nicht --- */
  const reime = letzte7.filter((a) => a.gameId === 'reim-boot' && a.difficulty <= 5)
  if (reime.length >= 6 && anteilRichtig(reime) < 0.5) {
    out.push({
      id: 'reime',
      gewicht: 80,
      ton: 'tipp',
      titel: 'Reime sind noch schwer',
      text:
        `Nur ${Math.round(anteilRichtig(reime) * 100)} % der Reim-Aufgaben stimmten. ` +
        'Reime hört man, man sieht sie nicht: Beim Vorlesen das Reimwort am Zeilenende betonen und ' +
        `${nickname} das zweite selbst sagen lassen. Abzählreime und Quatschverse helfen genauso.`,
    })
  }

  /* --- 11. Zerlegen macht Mühe --- */
  const zerlegen = letzte7.filter(
    (a) => a.gameId === 'zahlen-waage' && (a.difficulty === 4 || a.difficulty === 9),
  )
  if (zerlegen.length >= 6 && anteilRichtig(zerlegen) < 0.5) {
    out.push({
      id: 'zerlegen',
      gewicht: 80,
      ton: 'tipp',
      titel: 'Zahlen zerlegen ist noch neu',
      text:
        'Das Aufteilen einer Zahl in zwei oder drei Summanden geht noch daneben. Mit Bausteinen wird es ' +
        `sichtbar: sieben Klötze hinlegen und ${nickname} auf zwei Hände verteilen lassen — ` +
        'drei und vier, fünf und zwei, jedes Mal wieder sieben.',
    })
  }

  /* --- 12. Merkmale statt Art --- */
  const merkmale = letzte7.filter((a) => a.gameId === 'sortier-werkstatt' && a.difficulty >= 5)
  if (merkmale.length >= 6 && anteilRichtig(merkmale) < 0.5) {
    out.push({
      id: 'kategorien',
      gewicht: 78,
      ton: 'tipp',
      titel: 'Sortieren nach Merkmal ist kniffliger',
      text:
        'Nach Art zu sortieren klappt, nach Eigenschaft noch nicht — „was fliegt" ist eben etwas anderes ' +
        'als „was ist ein Tier". Beim Aufräumen üben: erst nach Art, dann noch einmal alles Rote oder ' +
        'alles Weiche in eine Kiste.',
    })
  }

  /* --- 13. Alles ruhig --- */
  if (out.length === 0) {
    out.push({
      id: 'alles-gut',
      gewicht: 10,
      ton: 'lob',
      titel: 'Läuft rund',
      text: `${nickname} kommt gut zurecht — nichts, worum man sich kümmern müsste. Die Aufgaben passen sich weiter von selbst an.`,
    })
  }

  return out.sort((a, b) => b.gewicht - a.gewicht).slice(0, 5)
}
