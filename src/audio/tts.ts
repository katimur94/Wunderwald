/**
 * Sprachausgabe über die Web Speech API. Systemstimmen funktionieren offline
 * und kosten kein einziges Byte Download.
 *
 * Wichtig: Der gesprochene Text steht IMMER auch in Funkels Sprechblase —
 * für Barrierefreiheit und für Geräte ohne deutsche Stimme.
 */

let enabled = true
let lastSpoken = ''
let voices: SpeechSynthesisVoice[] = []
let voicesLoaded = false

export function setTtsEnabled(on: boolean) {
  enabled = on
  if (!on) stopSpeaking()
}

export function isTtsEnabled() {
  return enabled
}

/**
 * Es reicht NICHT, `'speechSynthesis' in window` zu prüfen: Manche Browser und
 * Datenschutz-Erweiterungen legen die Eigenschaft an, liefern aber `undefined`
 * oder ein Objekt ohne `speak`. Deshalb wird auf die Methode selbst geprüft —
 * sonst stirbt die App schon beim Laden dieses Moduls.
 */
export function ttsSupported(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.speechSynthesis?.speak === 'function'
  } catch {
    return false
  }
}

function loadVoices() {
  if (!ttsSupported()) return
  try {
    voices = window.speechSynthesis.getVoices() ?? []
    voicesLoaded = voices.length > 0
  } catch {
    voices = []
    voicesLoaded = false
  }
}

if (ttsSupported()) {
  loadVoices()
  try {
    window.speechSynthesis.onvoiceschanged = loadVoices
  } catch {
    /* Manche Browser erlauben das Setzen nicht – Stimmen werden dann lazy geladen. */
  }
}

/** Deutsche Stimme bevorzugen, dabei lokale Stimmen zuerst. */
function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (!voicesLoaded) loadVoices()
  const german = voices.filter((v) => v.lang?.toLowerCase().startsWith('de'))
  if (german.length === 0) return null
  const exact = german.filter((v) => v.lang.toLowerCase() === 'de-de')
  const pool = exact.length ? exact : german
  return pool.find((v) => v.localService) ?? pool[0]
}

export function hasGermanVoice(): boolean {
  return pickGermanVoice() !== null
}

export function stopSpeaking() {
  if (!ttsSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* egal */
  }
}

/**
 * Weckt eine hängende Sprachausgabe.
 *
 * Safari auf iOS pausiert `speechSynthesis`, sobald die Seite in den
 * Hintergrund geht (Tab-Wechsel, Bildschirmsperre, App-Umschalter) — und setzt
 * sie beim Zurückkommen oft nicht von selbst fort. Danach bleibt die Ausgabe
 * stumm, bis irgendwer `resume()` ruft. Auf allen anderen Browsern ist der
 * Aufruf ein harmloser No-op, wenn nichts pausiert ist.
 */
export function resumeSpeaking() {
  if (!ttsSupported()) return
  try {
    window.speechSynthesis.resume()
  } catch {
    /* Wenn der Browser das nicht mag, läuft die App ohne Ton weiter. */
  }
}

// Beim Zurückkehren auf die Seite die Ausgabe wieder anwerfen.
if (ttsSupported() && typeof document !== 'undefined') {
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') resumeSpeaking()
    })
  } catch {
    /* Ohne Listener bleibt der resume()-Aufruf vor jedem speak() als Netz. */
  }
}

/**
 * Spricht einen Text. Vorher wird IMMER gecancelt, damit sich nichts stapelt —
 * Kinder tippen schnell, und eine Warteschlange wäre nur verwirrend.
 */
export function sprich(text: string, opts: { rate?: number; onEnd?: () => void } = {}) {
  lastSpoken = text
  if (!enabled || !ttsSupported() || !text.trim()) {
    opts.onEnd?.()
    return
  }
  try {
    stopSpeaking()
    // Zweites Netz gegen den iOS-Hänger: War die Ausgabe pausiert, bliebe der
    // folgende speak()-Aufruf sonst wirkungslos.
    resumeSpeaking()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'de-DE'
    utter.rate = opts.rate ?? 0.9
    utter.pitch = 1.05
    const voice = pickGermanVoice()
    if (voice) utter.voice = voice
    if (opts.onEnd) utter.onend = () => opts.onEnd?.()
    window.speechSynthesis.speak(utter)
  } catch {
    opts.onEnd?.()
  }
}

/** Der Hilfe-Button wiederholt die letzte Ansage. */
export function wiederhole() {
  if (lastSpoken) sprich(lastSpoken)
}

export function letzteAnsage() {
  return lastSpoken
}

/**
 * Buchstaben werden sonst als Wort gelesen ("A" → "a", aber "S" → "es").
 * Für Anlaut-Aufgaben klingt der reine Laut besser.
 */
export function lautVon(buchstabe: string): string {
  return `${buchstabe.toUpperCase()}`
}
