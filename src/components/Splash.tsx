import './Splash.css'

/** Kurzer Ladezustand, während Dexie öffnet. Kein Spinner-Gefühl, ein Wald. */
export function Splash() {
  return (
    <div className="ww-splash">
      <span className="ww-splash__tree ww-float" aria-hidden="true">🌲</span>
      <p className="ww-splash__text">Wunderwald wacht auf …</p>
    </div>
  )
}
