/**
 * PIN-Sicherung für den Elternbereich.
 * Die PIN wird NIE im Klartext gespeichert: PBKDF2-SHA-256, 100 000 Iterationen,
 * 16 Byte Zufalls-Salt. Läuft komplett offline über die Web Crypto API.
 */

const ITERATIONS = 100_000
const KEY_BITS = 256
const SALT_BYTES = 16

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2))
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function randomSaltHex(): string {
  const salt = new Uint8Array(new ArrayBuffer(SALT_BYTES))
  crypto.getRandomValues(salt)
  return toHex(salt.buffer)
}

async function derive(secret: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    KEY_BITS,
  )
  return toHex(bits)
}

/** Vergleich ohne frühen Abbruch – kein Timing-Kanal. */
function equalsConstantTime(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function hashPin(pin: string, saltHex = randomSaltHex()) {
  return { hash: await derive(pin, saltHex), salt: saltHex }
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  return equalsConstantTime(await derive(pin, salt), hash)
}

/** Wiederherstellungssatz normalisieren: Groß/Klein und Leerzeichen egal. */
export function normalizeRecovery(phrase: string): string {
  return phrase
    .toLocaleLowerCase('de-DE')
    .replace(/[^a-zäöüß]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export async function hashRecovery(phrase: string, saltHex = randomSaltHex()) {
  return { hash: await derive(normalizeRecovery(phrase), saltHex), salt: saltHex }
}

export async function verifyRecovery(phrase: string, hash: string, salt: string): Promise<boolean> {
  return equalsConstantTime(await derive(normalizeRecovery(phrase), salt), hash)
}

export const PIN_MAX_FAILS = 5
export const PIN_LOCK_MS = 60_000

export function isPinValid(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}
