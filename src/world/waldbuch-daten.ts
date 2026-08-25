import { FOREST_OBJECTS } from './forest-objects'

/**
 * Das Waldbuch: zu jedem Wald-Objekt zwei bis drei kindgerechte Sachinfos.
 *
 * Regeln für die Texte: fachlich korrekt, höchstens 12 Wörter pro Satz,
 * keine Verniedlichung, keine Fantasie. Was hier steht, soll ein Kind
 * jemandem weitererzählen können, ohne dass es falsch wird.
 */

export interface WaldbuchSeite {
  objectId: string
  /** Was auf der Seite groß zu sehen ist */
  emoji: string
  name: string
  fakten: string[]
}

const FAKTEN: Record<string, string[]> = {
  blume: [
    'Blumen locken Bienen mit Farben und Duft an.',
    'Aus der Blüte wird später die Frucht mit den Samen.',
    'Viele Blumen schließen sich abends von selbst.',
  ],
  busch: [
    'In einem Busch verstecken sich Vögel vor Katzen.',
    'Ein Busch hat viele Stämme, ein Baum nur einen.',
  ],
  baum: [
    'Ein großer Baum trinkt an einem heißen Tag hunderte Liter Wasser.',
    'Bäume machen aus Sonnenlicht Zucker und geben dabei Sauerstoff ab.',
    'Jeder Jahresring im Stamm ist ein Lebensjahr.',
  ],
  sonnenblume: [
    'Junge Sonnenblumen drehen ihren Kopf mit der Sonne mit.',
    'Eine Sonnenblume kann höher werden als eine erwachsene Person.',
    'In einer Blüte stecken über tausend kleine Kerne.',
  ],
  tanne: [
    'Tannen behalten ihre Nadeln auch im Winter.',
    'Die Zapfen der Tanne stehen aufrecht wie Kerzen.',
  ],
  erdbeerbeet: [
    'Erdbeeren sind gar keine Beeren, sondern Sammelnussfrüchte.',
    'Die kleinen gelben Punkte außen sind die echten Früchte.',
    'Erdbeerpflanzen bilden lange Ausläufer und wandern so übers Beet.',
  ],
  pilzhaus: [
    'Pilze sind weder Pflanze noch Tier, sondern etwas Eigenes.',
    'Der größte Teil eines Pilzes wächst unsichtbar im Boden.',
  ],
  bank: [
    'Von einer Bank aus sieht man Tiere, weil man still sitzt.',
    'Holzbänke im Wald werden oft aus umgefallenen Bäumen gebaut.',
  ],
  vogelhaus: [
    'Im Winter finden Vögel schwer Futter, ein Häuschen hilft ihnen.',
    'Meisen bauen ihr Nest gern in Höhlen mit kleinem Eingang.',
  ],
  schaukel: [
    'Beim Schaukeln übt dein Körper das Gleichgewicht.',
    'Je länger die Seile, desto langsamer schwingt die Schaukel.',
  ],
  lagerfeuer: [
    'Ein Feuer braucht drei Dinge: Holz, Luft und Wärme.',
    'Der Rauch steigt nach oben, weil warme Luft leichter ist.',
  ],
  bienenstock: [
    'Bienen sagen sich mit einem Tanz, wo es Blüten gibt.',
    'Für ein Glas Honig fliegen Bienen einmal um die halbe Erde.',
    'In einem Stock leben im Sommer bis zu 50 000 Bienen.',
  ],
  hase: [
    'Hasen können ihre Ohren einzeln drehen und hören nach hinten.',
    'Ein Feldhase rennt schneller als ein Auto in der Stadt.',
    'Junge Hasen kommen mit offenen Augen und Fell zur Welt.',
  ],
  igel: [
    'Der Igel hat bis zu 8000 Stachel.',
    'Er schläft den ganzen Winter und wacht kaum auf.',
    'Nachts sucht er Käfer, Würmer und Schnecken.',
  ],
  reh: [
    'Rehe sind am liebsten in der Dämmerung unterwegs.',
    'Nur die Böcke tragen ein Geweih, und jedes Jahr ein neues.',
    'Ein Rehkitz hat weiße Flecken und ist dadurch gut getarnt.',
  ],
  seerose: [
    'Seerosen wurzeln im Schlamm und die Blätter schwimmen oben.',
    'Auf den runden Blättern perlt Wasser einfach ab.',
  ],
  teich: [
    'In einem Teich leben Frösche, Libellen und winzige Wasserflöhe.',
    'Kaulquappen bekommen erst Hinterbeine, dann Vorderbeine.',
  ],
  bruecke: [
    'Eine Bogenbrücke trägt schwer, weil sie das Gewicht verteilt.',
    'Über Brücken kommen auch Tiere sicher über das Wasser.',
  ],
  ente: [
    'Enten fetten ihre Federn ein, damit sie nicht nass werden.',
    'Ihre Füße frieren im kalten Wasser nicht, das Blut wärmt sich selbst.',
    'Entenküken folgen dem Ersten, den sie nach dem Schlüpfen sehen.',
  ],
  laterne: [
    'Früher zündete ein Laternenanzünder abends jede Laterne von Hand an.',
    'Nachtfalter fliegen zum Licht, weil sie sich am Mond orientieren.',
  ],
  fuchsbau: [
    'Ein Fuchsbau hat mehrere Ausgänge für den Notfall.',
    'Füchse hören eine Maus unter dem Schnee.',
    'Manche Baue werden über viele Jahre weitergenutzt.',
  ],
  eule: [
    'Eulen fliegen fast lautlos, ihre Federn haben weiche Ränder.',
    'Sie können ihren Kopf sehr weit drehen, weil die Augen starr sind.',
    'Am Tag schlafen Eulen gut versteckt im Baum.',
  ],
  schmetterlinge: [
    'Ein Schmetterling schmeckt mit den Füßen, ob eine Blüte passt.',
    'Vorher war er eine Raupe und hat sich vollständig umgebaut.',
    'Die Flügel sind mit winzigen bunten Schuppen bedeckt.',
  ],
  regenbogen: [
    'Ein Regenbogen entsteht, wenn Sonne durch Regentropfen scheint.',
    'Er steht immer der Sonne genau gegenüber.',
    'Jeder Mensch sieht seinen eigenen Regenbogen.',
  ],
}

export const WALDBUCH: WaldbuchSeite[] = FOREST_OBJECTS.map((o) => ({
  objectId: o.id,
  emoji: o.darstellung[o.darstellung.length - 1],
  name: o.name,
  fakten: FAKTEN[o.id] ?? [],
}))

export function waldbuchSeite(objectId: string): WaldbuchSeite | undefined {
  return WALDBUCH.find((s) => s.objectId === objectId)
}

/** Ein zufälliger Satz für Funkel, wenn ein Tier angetippt wird. */
export function waldbuchFakt(objectId: string, rnd: () => number = Math.random): string | null {
  const seite = waldbuchSeite(objectId)
  if (!seite || seite.fakten.length === 0) return null
  return seite.fakten[Math.floor(rnd() * seite.fakten.length)]
}
