import { SEARCH_RADIUS_METERS } from '@/config/constants'
import { bboxAround, parsePhotonResponse, type GeoResult } from '@/domain/geocoding'
import type { GeoPoint } from '@/domain/models'

/**
 * Photon, the OpenStreetMap geocoder by Komoot. Free public instance, no key,
 * for "reasonable" usage: we debounce typing and never batch requests.
 * https://photon.komoot.io
 */
const BASE_URL = 'https://photon.komoot.io'

export class GeocodingError extends Error {
  constructor() {
    super('La recherche d’adresses est indisponible pour le moment.')
    this.name = 'GeocodingError'
  }
}

async function get(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<GeoResult[]> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}?${params}`, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new GeocodingError()
  }
  if (!response.ok) throw new GeocodingError()
  return parsePhotonResponse(await response.json())
}

export interface SearchOptions {
  /** Results are biased toward this point, and kept within SEARCH_RADIUS_METERS of it. */
  near?: GeoPoint
  limit?: number
  signal?: AbortSignal
}

/** Free-text search: places and addresses. */
export function searchPlaces(query: string, options: SearchOptions = {}): Promise<GeoResult[]> {
  const params = new URLSearchParams({ q: query, lang: 'fr', limit: String(options.limit ?? 15) })
  if (options.near) {
    params.set('lat', String(options.near.lat))
    params.set('lon', String(options.near.lng))
    params.set('bbox', bboxAround(options.near, SEARCH_RADIUS_METERS))
  }
  return get('/api', params, options.signal)
}

/** Address search only (streets and house numbers), e.g. for the home address. */
export function searchAddresses(query: string, options: SearchOptions = {}): Promise<GeoResult[]> {
  const params = new URLSearchParams({ q: query, lang: 'fr', limit: String(options.limit ?? 8) })
  params.append('layer', 'house')
  params.append('layer', 'street')
  if (options.near) {
    params.set('lat', String(options.near.lat))
    params.set('lon', String(options.near.lng))
  }
  return get('/api', params, options.signal)
}

/**
 * Points of interest (restaurants, shops…) around a point, nearest first:
 * to pick the establishment under a pin placed by hand.
 */
export async function nearbyPlaces(
  point: GeoPoint,
  options: { radiusMeters?: number; signal?: AbortSignal } = {},
): Promise<GeoResult[]> {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lng),
    lang: 'fr',
    limit: '20',
    radius: String((options.radiusMeters ?? 60) / 1000),
  })
  const results = await get('/reverse', params, options.signal)
  return results.filter((r) => r.kind === 'place')
}

/** The address at a point (reverse geocoding), when there is one nearby. */
export async function reverseGeocode(point: GeoPoint, signal?: AbortSignal): Promise<GeoResult | undefined> {
  const params = new URLSearchParams({
    lat: String(point.lat),
    lon: String(point.lng),
    lang: 'fr',
    limit: '1',
    radius: '0.1',
  })
  params.append('layer', 'house')
  params.append('layer', 'street')
  const [result] = await get('/reverse', params, signal)
  return result
}
