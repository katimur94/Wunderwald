import { describe, expect, it } from 'vitest'
import {
  hashPin,
  hashRecovery,
  isPinValid,
  normalizeRecovery,
  randomSaltHex,
  verifyPin,
  verifyRecovery,
} from './pin'
import { makeRecoveryPhrase, RECOVERY_WORDS } from './recovery-words'

describe('PIN-Hashing', () => {
  it('speichert die PIN nie im Klartext', async () => {
    const { hash, salt } = await hashPin('1234')
    expect(hash).not.toContain('1234')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
  })

  it('erkennt die richtige PIN', async () => {
    const { hash, salt } = await hashPin('4711')
    expect(await verifyPin('4711', hash, salt)).toBe(true)
  })

  it('weist falsche PINs ab', async () => {
    const { hash, salt } = await hashPin('4711')
    expect(await verifyPin('4712', hash, salt)).toBe(false)
    expect(await verifyPin('', hash, salt)).toBe(false)
  })

  it('erzeugt für gleiche PINs unterschiedliche Hashes (Salt)', async () => {
    const a = await hashPin('0000')
    const b = await hashPin('0000')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
  })

  it('akzeptiert nur vierstellige Zahlen-PINs', () => {
    expect(isPinValid('1234')).toBe(true)
    expect(isPinValid('123')).toBe(false)
    expect(isPinValid('12345')).toBe(false)
    expect(isPinValid('12a4')).toBe(false)
  })

  it('liefert jedes Mal ein neues Salt', () => {
    expect(randomSaltHex()).not.toBe(randomSaltHex())
  })
})

describe('Wiederherstellungssatz', () => {
  it('zieht drei verschiedene Wörter aus der Liste', () => {
    for (let i = 0; i < 50; i++) {
      const words = makeRecoveryPhrase().split(' ')
      expect(words).toHaveLength(3)
      expect(new Set(words).size).toBe(3)
      words.forEach((w) => expect(RECOVERY_WORDS).toContain(w))
    }
  })

  it('ist bei Groß-/Kleinschreibung und Leerzeichen nachsichtig', async () => {
    const phrase = 'Fuchs Laterne Moos'
    const { hash, salt } = await hashRecovery(phrase)
    expect(await verifyRecovery('  fuchs   laterne moos ', hash, salt)).toBe(true)
    expect(await verifyRecovery('FUCHS LATERNE MOOS', hash, salt)).toBe(true)
    expect(await verifyRecovery('Fuchs Laterne Baum', hash, salt)).toBe(false)
  })

  it('normalisiert Umlaute korrekt', () => {
    expect(normalizeRecovery('  Käfer,  Hügel;  Zaun ')).toBe('käfer hügel zaun')
  })
})
