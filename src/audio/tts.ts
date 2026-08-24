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

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function loadVoices() {
  if (!ttsSupported()) return
  voices = window.speechSynthesis.getVoices()
  voicesLoaded = voices.length > 0
}

if (ttsSupported()) {
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
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
