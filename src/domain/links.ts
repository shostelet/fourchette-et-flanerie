import type { PlaceLink, PlaceLinkKind } from './models'

/**
 * Turns user input into a clean URL: trims, adds "https://" when missing.
 * Returns undefined when it can't be a web address.
 * "lemusee.fr" → "https://lemusee.fr/"
 */
export function normalizeUrl(input: string): string | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    // A host without a dot ("localhost", "foo") is almost certainly a typo.
    if (!url.hostname.includes('.')) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

/** Instagram links get their own icon and "@handle" label. */
export function detectLinkKind(url: string): PlaceLinkKind {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return host === 'instagram.com' || host.endsWith('.instagram.com') ? 'instagram' : 'website'
  } catch {
    return 'other'
  }
}

/** Cleans the links typed in the form: drops empty or invalid ones and duplicates. */
export function cleanLinks(inputs: readonly string[]): { links: PlaceLink[]; invalid: string[] } {
  const links: PlaceLink[] = []
  const invalid: string[] = []
  for (const input of inputs) {
    if (!input.trim()) continue
    const url = normalizeUrl(input)
    if (!url) invalid.push(input.trim())
    else if (!links.some((l) => l.url === url)) links.push({ kind: detectLinkKind(url), url })
  }
  return { links, invalid }
}
