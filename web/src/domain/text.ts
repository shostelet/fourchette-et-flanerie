/**
 * Normalizes a text for comparisons and search:
 * lowercase, no accents, punctuation replaced by single spaces.
 *
 * "Béguin - Bar à manger" → "beguin bar a manger"
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Splits a search query into normalized tokens. */
export function tokenize(value: string): string[] {
  const normalized = normalizeText(value)
  return normalized ? normalized.split(' ') : []
}

/** French-aware alphabetical comparison (accents, case). */
export function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'fr', { sensitivity: 'base' })
}
