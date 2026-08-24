/**
 * Bittet den Browser, den lokalen Speicher zu schützen.
 * Ohne "persistent storage" kann der Browser IndexedDB bei Platzmangel löschen —
 * und da es keinen Server gibt, wäre der Fortschritt dann weg.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

export async function storageEstimate(): Promise<{ usedMb: number; quotaMb: number } | null> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (!est?.usage || !est?.quota) return null
    return {
      usedMb: Math.round((est.usage / 1_048_576) * 10) / 10,
      quotaMb: Math.round(est.quota / 1_048_576),
    }
  } catch {
    return null
  }
}
