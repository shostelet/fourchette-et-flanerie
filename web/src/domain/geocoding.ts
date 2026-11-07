import { mapOsmTag } from '@/config/osm-categories'
import { cleanLinks } from './links'
import type { Category, GeoPoint, OsmRef, Place, PlaceLink } from './models'
import { findDuplicate } from './places'
import { isFiniteNumber, isRecord, isString, readPointCoordinates } from './import-export/validation'

/** A place or an address found by the geocoder (Photon / OpenStreetMap). */
export interface GeoResult {
  /** Stable key for lists. */
  key: string
  /** Name of the place; for a bare address, the street line. */
  name: string
  address: string
  location: GeoPoint
  /** `place`: a named point of interest; `address`: a street, a house number… */
  kind: 'place' | 'address'
  osmRef?: OsmRef
  /** Guessed from the OSM tags, when the place is a restaurant, a shop… */
  category?: Category
  icon?: string
  links: PlaceLink[]
  phone?: string
  openingHours?: string
}

const OSM_TYPES: Record<string, OsmRef['type']> = { N: 'node', W: 'way', R: 'relation' }

/** "8 Place des Célestins, 69002 Lyon" from Photon's address fields. */
export function formatAddress(p: Record<string, unknown>): string {
  const str = (key: string) => (isString(p[key]) ? (p[key] as string).trim() : '')
  const street = [str('housenumber'), str('street')].filter(Boolean).join(' ')
  const city = [str('postcode'), str('city') || str('locality') || str('district')]
    .filter(Boolean)
    .join(' ')
  return [street, city].filter(Boolean).join(', ')
}

function readExtra(extra: unknown): Pick<GeoResult, 'links' | 'phone' | 'openingHours'> {
  if (!isRecord(extra)) return { links: [] }
  const urls = ['website', 'contact:website', 'url', 'contact:instagram']
    .map((key) => extra[key])
    .filter(isString)
  return {
    links: cleanLinks(urls).links,
    phone: [extra.phone, extra['contact:phone']].find(isString),
    openingHours: isString(extra.opening_hours) ? extra.opening_hours : undefined,
  }
}

/** Reads a Photon GeoJSON response; malformed features are skipped. */
export function parsePhotonResponse(json: unknown): GeoResult[] {
  if (!isRecord(json) || !Array.isArray(json.features)) return []
  const results: GeoResult[] = []
  for (const feature of json.features) {
    const p = isRecord(feature) ? feature.properties : undefined
    const location = isRecord(feature) ? readPointCoordinates(feature.geometry) : undefined
    if (!isRecord(p) || !location) continue

    const osmType = isString(p.osm_type) ? OSM_TYPES[p.osm_type] : undefined
    const osmRef = osmType && isFiniteNumber(p.osm_id) ? { type: osmType, id: p.osm_id } : undefined
    const mapping =
      isString(p.osm_key) && isString(p.osm_value) ? mapOsmTag(p.osm_key, p.osm_value) : undefined
    const address = formatAddress(p)
    const isHouse = p.osm_key === 'place' && p.osm_value === 'house'
    const name = isString(p.name) && p.name.trim() && !isHouse ? p.name.trim() : address
    if (!name) continue

    results.push({
      key: osmRef ? `${osmRef.type}/${osmRef.id}` : `${location.lat},${location.lng}`,
      name,
      // A bare address is already in the name.
      address: name === address ? [p.city, p.country].filter(isString).join(', ') : address,
      location,
      kind: mapping || (isString(p.name) && !isHouse && p.osm_key !== 'highway') ? 'place' : 'address',
      osmRef,
      category: mapping?.category,
      icon: mapping?.icon,
      ...readExtra(p.extra),
    })
  }
  return results
}

/** Results that are not already saved places (same OSM object, or similar name nearby). */
export function excludeKnown(results: readonly GeoResult[], places: readonly Place[]): GeoResult[] {
  return results.filter((r) => !findDuplicate(r, places))
}

/**
 * Ranks results: places of the wanted category first, then other places,
 * then bare addresses (stable within each group).
 */
export function rankResults(results: readonly GeoResult[], category: Category): GeoResult[] {
  const rank = (r: GeoResult) => (r.kind === 'address' ? 2 : r.category === category ? 0 : 1)
  return [...results].sort((a, b) => rank(a) - rank(b))
}

/** Bounding box "minLon,minLat,maxLon,maxLat" around a point. */
export function bboxAround(center: GeoPoint, radiusMeters: number): string {
  const dLat = radiusMeters / 111_320
  const dLng = radiusMeters / (111_320 * Math.cos((center.lat * Math.PI) / 180))
  const round = (n: number) => Number(n.toFixed(5))
  return [center.lng - dLng, center.lat - dLat, center.lng + dLng, center.lat + dLat]
    .map(round)
    .join(',')
}

const kmFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

/** "350 m", "1,2 km", "12 km" */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`
  return `${kmFormatter.format(meters < 10_000 ? meters / 1000 : Math.round(meters / 1000))} km`
}
