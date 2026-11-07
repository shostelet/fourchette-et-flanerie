import type { GeoPoint } from '@/domain/models'
import { parseOsrmRoute, roundedKey, type TravelMode, type TravelRoute } from '@/domain/routing'

/**
 * Walking and cycling routes from the FOSSGIS OSRM servers (OpenStreetMap data).
 * Free, no key; their policy asks for at most one request per second and no
 * heavy usage: requests are queued, and results are cached for the session.
 * https://routing.openstreetmap.de/about.html
 */
const PROFILE_URLS: Record<TravelMode, string> = {
  foot: 'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
  bike: 'https://routing.openstreetmap.de/routed-bike/route/v1/driving',
}
const MIN_INTERVAL_MS = 1100

export class RoutingError extends Error {
  constructor() {
    super('Calcul d’itinéraire indisponible pour le moment.')
    this.name = 'RoutingError'
  }
}

const cache = new Map<string, Promise<TravelRoute | undefined>>()
let queue: Promise<unknown> = Promise.resolve()
let lastRequestAt = 0

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Runs requests one after the other, spaced by MIN_INTERVAL_MS. */
function throttled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    await wait(Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now()))
    lastRequestAt = Date.now()
    return task()
  })
  queue = run.catch(() => undefined)
  return run
}

async function request(mode: TravelMode, from: GeoPoint, to: GeoPoint): Promise<TravelRoute | undefined> {
  const coordinates = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const params = new URLSearchParams({ overview: 'full', geometries: 'geojson', steps: 'false' })
  let response: Response
  try {
    response = await fetch(`${PROFILE_URLS[mode]}/${coordinates}?${params}`)
  } catch {
    throw new RoutingError()
  }
  // 400 with code "NoRoute"/"NoSegment": no route between these points.
  if (!response.ok && response.status !== 400) throw new RoutingError()
  return parseOsrmRoute(await response.json(), mode)
}

/**
 * Route between two points (undefined when there is none).
 * Points are rounded to ~100 m for the cache, so a moving GPS position
 * doesn't trigger a new request at every step.
 */
export function fetchRoute(mode: TravelMode, from: GeoPoint, to: GeoPoint): Promise<TravelRoute | undefined> {
  const key = `${mode}|${roundedKey(from)}|${to.lat},${to.lng}`
  let result = cache.get(key)
  if (!result) {
    result = throttled(() => request(mode, from, to))
    // Errors are not cached: a later attempt may work.
    result.catch(() => cache.delete(key))
    cache.set(key, result)
  }
  return result
}
