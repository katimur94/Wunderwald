import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Die Tests laufen in Node, also gibt es weder `window` noch `document`.
 * Beides wird hier gestellt, damit sich beide Zweige prüfen lassen:
 * mit funktionierender Sprachausgabe und ganz ohne.
 */

interface FakeSynth {
  speak: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  resume: ReturnType<typeof vi.fn>
  getVoices: () => unknown[]
  onvoiceschanged: null | (() => void)
}

type Listener = () => void

function installDom(synth: FakeSynth | undefined | Record<string, unknown>) {
  const listeners = new Map<string, Listener[]>()
  const doc = {
    visibilityState: 'visible' as 'visible' | 'hidden',
    addEventListener(typ: string, fn: Listener) {
      if (!listeners.has(typ)) listeners.set(typ, [])
      listeners.get(typ)!.push(fn)
    },
    removeEventListener: vi.fn(),
  }
  Object.defineProperty(globalThis, 'window', {
    value: { speechSynthesis: synth },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'document', { value: doc, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
    value: class {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      voice: unknown = null
      onend: (() => void) | null = null
      constructor(text: string) {
        this.text = text
      }
    },
    configurable: true,
    writable: true,
  })
  return {
    doc,
    fire(typ: string) {
      ;(listeners.get(typ) ?? []).forEach((fn) => fn())
    },
    count(typ: string) {
      return (listeners.get(typ) ?? []).length
    },
  }
}

function makeSynth(overrides: Partial<FakeSynth> = {}): FakeSynth {
  return {
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: () => [],
    onvoiceschanged: null,
    ...overrides,
  }
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window')
  Reflect.deleteProperty(globalThis, 'document')
  Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance')
  vi.resetModules()
})

beforeEach(() => {
  vi.resetModules()
})

describe('Sprachausgabe mit funktionierendem speechSynthesis', () => {
  it('weckt die Ausgabe, wenn die Seite wieder sichtbar wird', async () => {
    const synth = makeSynth()
    const dom = installDom(synth)
    await import('./tts')

    expect(dom.count('visibilitychange'), 'kein Listener registriert').toBe(1)
    expect(synth.resume).not.toHaveBeenCalled()

    dom.doc.visibilityState = 'visible'
    dom.fire('visibilitychange')
    expect(synth.resume).toHaveBeenCalledTimes(1)
  })

  it('weckt sie NICHT, wenn die Seite in den Hintergrund geht', async () => {
    const synth = makeSynth()
    const dom = installDom(synth)
    await import('./tts')

    dom.doc.visibilityState = 'hidden'
    dom.fire('visibilitychange')
    expect(synth.resume).not.toHaveBeenCalled()
  })

  it('setzt vor jedem speak() ein resume() ab', async () => {
    const synth = makeSynth()
    installDom(synth)
    const { sprich } = await import('./tts')

    sprich('Hallo Funkel')
    expect(synth.resume).toHaveBeenCalledTimes(1)
    expect(synth.speak).toHaveBeenCalledTimes(1)

    sprich('Noch einmal')
    expect(synth.resume).toHaveBeenCalledTimes(2)
  })

  it('cancelt vor dem Sprechen, damit sich nichts stapelt', async () => {
    const synth = makeSynth()
    installDom(synth)
    const { sprich } = await import('./tts')

    sprich('Erste Ansage')
    expect(synth.cancel).toHaveBeenCalledTimes(1)
  })

  it('spricht nicht, wenn Vorlesen abgeschaltet ist', async () => {
    const synth = makeSynth()
    installDom(synth)
    const { sprich, setTtsEnabled } = await import('./tts')

    setTtsEnabled(false)
    const onEnd = vi.fn()
    sprich('Bitte still', { onEnd })
    expect(synth.speak).not.toHaveBeenCalled()
    expect(onEnd, 'onEnd muss trotzdem laufen').toHaveBeenCalledTimes(1)
  })

  it('überlebt ein resume(), das wirft', async () => {
    const synth = makeSynth({
      resume: vi.fn(() => {
        throw new Error('nope')
      }),
    })
    const dom = installDom(synth)
    const { sprich, resumeSpeaking } = await import('./tts')

    expect(() => resumeSpeaking()).not.toThrow()
    expect(() => dom.fire('visibilitychange')).not.toThrow()
    expect(() => sprich('Trotzdem')).not.toThrow()
    expect(synth.speak, 'speak läuft trotz kaputtem resume').toHaveBeenCalledTimes(1)
  })
})

describe('Verhalten ohne nutzbare Sprachausgabe bleibt unverändert', () => {
  for (const [name, synth] of [
    ['speechSynthesis fehlt ganz', undefined],
    ['speechSynthesis ohne speak()', { resume: vi.fn(), cancel: vi.fn() }],
  ] as const) {
    it(`${name}: kein Listener, kein Fehler`, async () => {
      const dom = installDom(synth as never)
      const tts = await import('./tts')

      expect(tts.ttsSupported()).toBe(false)
      expect(dom.count('visibilitychange'), 'es darf kein Listener hängen').toBe(0)
      expect(() => tts.resumeSpeaking()).not.toThrow()
      expect(() => tts.stopSpeaking()).not.toThrow()

      const onEnd = vi.fn()
      expect(() => tts.sprich('Text', { onEnd })).not.toThrow()
      expect(onEnd, 'onEnd muss auch ohne Stimme laufen').toHaveBeenCalledTimes(1)
      expect(tts.hasGermanVoice()).toBe(false)
      // Der Text bleibt für die Sprechblase erhalten
      expect(tts.letzteAnsage()).toBe('Text')
    })
  }

  it('ruft resume() nicht auf, wenn speak() fehlt', async () => {
    const halb = { resume: vi.fn(), cancel: vi.fn() }
    installDom(halb as never)
    const tts = await import('./tts')
    tts.resumeSpeaking()
    tts.sprich('Text')
    expect(halb.resume).not.toHaveBeenCalled()
  })
})
