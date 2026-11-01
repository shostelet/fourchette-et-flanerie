/**
 * Small JSON helpers around localStorage, for device-only preferences
 * (never for user data, which lives in IndexedDB).
 *
 * localStorage can be unavailable or throw (private mode, quota, blocked
 * storage): reads then fall back to the default and writes are skipped.
 */
const PREFIX = 'ff:'

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    if (value === undefined) globalThis.localStorage?.removeItem(PREFIX + key)
    else globalThis.localStorage?.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage unavailable: preferences simply won't persist.
  }
}

export function removeAllPreferences(): void {
  try {
    const storage = globalThis.localStorage
    if (!storage) return
    Object.keys(storage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => storage.removeItem(key))
  } catch {
    // Nothing to do.
  }
}
