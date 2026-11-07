import { cleanText } from './entities'
import { cleanLinks } from './links'
import type { OsmRef, Place, PlaceLink } from './models'
import { isString } from './import-export/validation'

/** Practical details of a place, as found in its OpenStreetMap tags. */
export interface OsmDetails {
  links: PlaceLink[]
  phone?: string
  openingHours?: string
}

/** An Instagram value can be a full URL, "instagram.com/x", "@x" or just "x". */
function instagramUrl(value: string): string {
  const trimmed = value.trim()
  if (/instagram\.com/i.test(trimmed)) return trimmed
  return `https://www.instagram.com/${trimmed.replace(/^@/, '')}/`
}

export function extractOsmDetails(tags: Record<string, unknown>): OsmDetails {
  const str = (key: string) => (isString(tags[key]) ? cleanText(tags[key] as string) : undefined)
  const urls = [str('website'), str('contact:website'), str('url')].filter(isString)
  const instagram = str('contact:instagram') ?? str('instagram')
  if (instagram) urls.push(instagramUrl(instagram))
  return {
    links: cleanLinks(urls).links,
    // OSM may list several numbers: "+33 4… ; +33 6…". Keep the first one.
    phone: (str('phone') ?? str('contact:phone'))?.split(';')[0]?.trim(),
    openingHours: str('opening_hours'),
  }
}

export interface DetailsMerge {
  patch: Partial<Pick<Place, 'links' | 'phone' | 'openingHours' | 'osmRef'>>
  /** What was added, in French, for the confirmation message. */
  added: string[]
}

/**
 * Adds what the place is missing, never overwriting what the user typed:
 * new links are appended, phone and opening hours only fill empty fields.
 */
export function mergeOsmDetails(place: Place, details: OsmDetails, osmRef?: OsmRef): DetailsMerge {
  const patch: DetailsMerge['patch'] = {}
  const added: string[] = []

  const known = new Set(place.links.map((l) => l.url))
  const newLinks = details.links.filter((l) => !known.has(l.url))
  if (newLinks.length) {
    patch.links = [...place.links, ...newLinks]
    added.push(newLinks.length > 1 ? `${newLinks.length} liens` : 'un lien')
  }
  if (!place.phone && details.phone) {
    patch.phone = details.phone
    added.push('le téléphone')
  }
  if (!place.openingHours && details.openingHours) {
    patch.openingHours = details.openingHours
    added.push('les horaires')
  }
  if (!place.osmRef && osmRef) patch.osmRef = osmRef
  return { patch, added }
}

const DAYS: Record<string, string> = {
  Mo: 'lun.',
  Tu: 'mar.',
  We: 'mer.',
  Th: 'jeu.',
  Fr: 'ven.',
  Sa: 'sam.',
  Su: 'dim.',
  PH: 'jours fériés',
}

/**
 * Makes an OSM opening_hours value readable, one rule per line:
 * "Tu-Sa 12:00-14:00,19:00-22:00; Su off" →
 * ["mar.–sam. 12:00–14:00, 19:00–22:00", "dim. fermé"].
 * Unusual syntax is left as is: the raw value stays understandable.
 */
export function formatOpeningHours(value: string): string[] {
  return value
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      if (rule === '24/7') return 'Ouvert 24 h/24, 7 j/7'
      return rule
        .replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH)\b/g, (day) => DAYS[day] ?? day)
        .replace(/(\d{2}:\d{2})-(\d{2}:\d{2})/g, '$1–$2')
        .replace(/(\.|fériés)-(?=[a-z])/g, '$1–')
        .replace(/,(?=\S)/g, ', ')
        .replace(/\boff\b|\bclosed\b/g, 'fermé')
    })
}
