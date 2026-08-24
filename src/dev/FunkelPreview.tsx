import { Funkel, type FunkelState } from '../world/Funkel'

const STATES: FunkelState[] = ['idle', 'spricht', 'jubelt', 'troestet', 'muede']
const OUTFITS = [null, 'halstuch', 'hut', 'laterne', 'krone', 'brille', 'blatt']

/** Nur für die Entwicklung: alle Zustände und Outfits auf einen Blick. */
export function FunkelPreview() {
  return (
    <main className="ww-page ww-page--wide">
      <h1>Funkel – Zustände</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {STATES.map((s) => (
          <figure key={s} style={{ margin: 0, textAlign: 'center' }}>
            <Funkel state={s} size={160} />
            <figcaption>{s}</figcaption>
          </figure>
        ))}
      </div>
      <h1>Funkel – Outfits</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {OUTFITS.map((o) => (
          <figure key={o ?? 'kein'} style={{ margin: 0, textAlign: 'center' }}>
            <Funkel state="idle" size={140} outfitId={o} />
            <figcaption>{o ?? 'ohne'}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
