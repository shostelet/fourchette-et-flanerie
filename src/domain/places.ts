import { DUPLICATE_RADIUS_METERS } from '@/config/constants'
import { isDeleted } from './entities'
import type { GeoPoint, Id, OsmRef, Place, Tag } from './models'
import { normalizeText, tokenize } from './text'

// --- Status ----------------------------------------------------------------

export function isClosed(place: Place): boolean {
  return place.closedAt !== undefined
}

/** "To test" = never been there. Drives the "?" badge on the map. */
export function isToTest(place: Place): boolean {
  return !place.visited
}

/** Shown on the map and in the list by default (not deleted, not closed). */
export function isActive(place: Place): boolean {
  return !isDeleted(place) && !isClosed(place)
}

// --- Geography -------------------------------------------------------------

const EARTH_RADIUS_METERS = 6_371_000

/** Great-circle distance between two points, in meters. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

// --- Duplicates ------------------------------------------------------------

/** True when one normalized name contains the other ("Gojo" ~ "Gojo Restaurant Éthiopien"). */
export function namesLookAlike(a: string, b: string): boolean {
  const x = normalizeText(a)
  const y = normalizeText(b)
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

function sameOsmRef(a: OsmRef | undefined, b: OsmRef | undefined): boolean {
  return a !== undefined && b !== undefined && a.type === b.type && a.id === b.id
}

export interface DuplicateCandidate {
  name: string
  location: GeoPoint
  osmRef?: OsmRef
}

/**
 * Finds an existing place that looks like the candidate: same OSM object,
 * or a similar name within a short distance. Closed and deleted places are
 * ignored, so a new place replacing a closed one is never flagged.
 */
export function findDuplicate(
  candidate: DuplicateCandidate,
  places: readonly Place[],
  radiusMeters: number = DUPLICATE_RADIUS_METERS,
): Place | undefined {
  const pool = places.filter(isActive)
  return (
    pool.find((p) => sameOsmRef(p.osmRef, candidate.osmRef)) ??
    pool.find(
      (p) =>
        distanceMeters(p.location, candidate.location) <= radiusMeters &&
        namesLookAlike(p.name, candidate.name),
    )
  )
}

// --- Search ----------------------------------------------------------------

/**
 * Every token of the query must appear in the name, address, memo or one of
 * the place's tag names. Accents and case are ignored.
 */
export function matchesQuery(
  place: Place,
  query: string,
  tagsById: ReadonlyMap<Id, Tag> = new Map(),
): boolean {
  const tokens = tokenize(query)
  if (tokens.length === 0) return true
  const tagNames = place.tagIds.map((id) => tagsById.get(id)?.name ?? '')
  const haystack = normalizeText(
    [place.name, place.address, place.memo ?? '', ...tagNames].join(' '),
  )
  return tokens.every((token) => haystack.includes(token))
}
