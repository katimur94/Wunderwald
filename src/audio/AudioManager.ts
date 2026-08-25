/**
 * Alle Klänge werden synthetisiert — es gibt bewusst KEINE Audio-Dateien.
 * Das hält die App klein, offlinefähig und frei von externen Requests.
 *
 * iOS-Regel: Ein AudioContext darf erst nach der ersten echten
 * Nutzer-Interaktion erzeugt bzw. fortgesetzt werden.
 */

export type SoundId =
  | 'click' | 'success' | 'failSoft' | 'fanfare' | 'plant' | 'star' | 'pop'
  /* Tierstimmen im Wald */
  | 'bird' | 'hop' | 'rustle'
  /* Silben klatschen */
  | 'drum'

class AudioManager {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true
  private unlocked = false

  /** Aus den Eltern-Einstellungen. */
  setEnabled(on: boolean) {
    this.enabled = on
  }

  isEnabled() {
    return this.enabled
  }

  /** Nach der ersten Nutzer-Geste aufrufen (Pointerdown / Klick). */
  unlock() {
    if (this.unlocked) {
      void this.ctx?.resume()
      return
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.32
      this.master.connect(this.ctx.destination)
      void this.ctx.resume()
      this.unlocked = true
    } catch {
      /* Ohne Audio läuft die App weiter — Sound ist nie Voraussetzung. */
    }
  }

  private get t() {
    return this.ctx?.currentTime ?? 0
  }

  /** Ein Ton mit weicher Hüllkurve. */
  private tone(
    freq: number,
    startAt: number,
    durSec: number,
    type: OscillatorType = 'sine',
    peak = 1,
    sweepTo?: number,
  ) {
    if (!this.ctx || !this.master) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, startAt)
    if (sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), startAt + durSec)
    }
    // Attack kurz, Decay weich – nie klicken, nie schnarren.
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(peak, startAt + Math.min(0.02, durSec * 0.25))
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durSec)
    osc.connect(gain).connect(this.master)
    osc.start(startAt)
    osc.stop(startAt + durSec + 0.02)
  }

  /** Kurzes gefiltertes Rauschen — Blätterrascheln. */
  private noise(startAt: number, durSec: number, peak = 0.25, cutoff = 2200) {
    if (!this.ctx || !this.master) return
    const frames = Math.max(1, Math.floor(this.ctx.sampleRate * durSec))
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) {
      // zum Ende hin ausblenden
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = cutoff
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(peak, startAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durSec)
    src.connect(filter).connect(gain).connect(this.master)
    src.start(startAt)
    src.stop(startAt + durSec)
  }

  play(id: SoundId) {
    if (!this.enabled) return
    if (!this.ctx) this.unlock()
    if (!this.ctx || this.ctx.state === 'suspended') void this.ctx?.resume()
    if (!this.ctx) return

    const t = this.t
    switch (id) {
      // Holz-Tock: kurz, trocken, unaufdringlich
      case 'click':
        this.tone(220, t, 0.04, 'sine', 0.6)
        this.noise(t, 0.03, 0.06, 1400)
        break

      // Dur-Dreiklang aufwärts C–E–G
      case 'success':
        this.tone(523.25, t, 0.12, 'triangle', 0.7)
        this.tone(659.25, t + 0.09, 0.12, 'triangle', 0.7)
        this.tone(783.99, t + 0.18, 0.16, 'triangle', 0.8)
        break

      // Bewusst unspektakulär: ein tiefer, weicher Ton. Kein Buzzer, kein Drama.
      case 'failSoft':
        this.tone(160, t, 0.12, 'sine', 0.28)
        break

      // 5-Ton-Jingle für Meilensteine und Rundenende
      case 'fanfare': {
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
        notes.forEach((f, i) => this.tone(f, t + i * 0.11, i === 4 ? 0.42 : 0.16, 'triangle', 0.75))
        this.tone(261.63, t, 0.7, 'sine', 0.22)
        break
      }

      // Plopp + Rascheln beim Pflanzen
      case 'plant':
        this.tone(300, t, 0.1, 'sine', 0.7, 600)
        this.noise(t + 0.05, 0.22, 0.2, 2600)
        break

      // Ein Stern fliegt in den Zähler
      case 'star':
        this.tone(880, t, 0.09, 'triangle', 0.5, 1320)
        break

      case 'pop':
        this.tone(440, t, 0.07, 'sine', 0.5, 880)
        break

      // Vogel: schnelles Dreiton-Arpeggio nach oben
      case 'bird':
        this.tone(1320, t, 0.06, 'sine', 0.4, 1600)
        this.tone(1600, t + 0.05, 0.06, 'sine', 0.4, 1980)
        this.tone(1980, t + 0.1, 0.09, 'sine', 0.45, 2200)
        break

      // Hüpfen: zwei kurze Plopps
      case 'hop':
        this.tone(320, t, 0.07, 'sine', 0.5, 620)
        this.tone(380, t + 0.12, 0.07, 'sine', 0.45, 720)
        break

      // Rascheln im Laub
      case 'rustle':
        this.noise(t, 0.26, 0.22, 3200)
        break

      // Trommel fürs Silbenklatschen
      case 'drum':
        this.tone(120, t, 0.12, 'sine', 0.7, 70)
        this.noise(t, 0.06, 0.18, 900)
        break
    }
  }
}

export const audio = new AudioManager()

/** Bequemer Kurzaufruf. */
export function sfx(id: SoundId) {
  audio.play(id)
}
