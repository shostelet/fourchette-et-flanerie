import type { GeoPoint } from './models'
import { isFiniteNumber, isRecord } from './import-export/validation'

export const TRAVEL_MODES = ['foot', 'bike'] as const
export type TravelMode = (typeof TRAVEL_MODES)[number]

/** [longitude, latitude], as in GeoJSON. */
export type LngLat = [number, number]

export interface TravelRoute {
  mode: TravelMode
  /** Meters. */
  distance: number
  /** Seconds. */
  duration: number
  geometry: LngLat[]
}

/** Reads the first route of an OSRM response (geometries=geojson). */
export function parseOsrmRoute(json: unknown, mode: TravelMode): TravelRoute | undefined {
  if (!isRecord(json) || json.code !== 'Ok' || !Array.isArray(json.routes)) return undefined
  const route = json.routes[0]
  if (!isRecord(route) || !isFiniteNumber(route.distance) || !isFiniteNumber(route.duration)) {
    return undefined
  }
  const coordinates = isRecord(route.geometry) ? route.geometry.coordinates : undefined
  const geometry = Array.isArray(coordinates)
    ? coordinates.filter(
        (c): c is LngLat => Array.isArray(c) && isFiniteNumber(c[0]) && isFiniteNumber(c[1]),
      )
    : []
  return { mode, distance: route.distance, duration: route.duration, geometry }
}

/** "< 1 min", "12 min", "1 h", "1 h 05" */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`
}

/** South-west and north-east corners of a line. */
export function lineBounds(geometry: readonly LngLat[]): [LngLat, LngLat] | undefined {
  if (!geometry.length) return undefined
  let [minLng, minLat] = geometry[0]!
  let [maxLng, maxLat] = geometry[0]!
  for (const [lng, lat] of geometry) {
    minLng = Math.min(minLng, lng)
    minLat = Math.min(minLat, lat)
    maxLng = Math.max(maxLng, lng)
    maxLat = Math.max(maxLat, lat)
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ]
}

/**
 * Rounds a point to about 100 m: a moving GPS position only triggers a new
 * route request once it has really moved.
 */
export function roundedKey(point: GeoPoint): string {
  return `${point.lat.toFixed(3)},${point.lng.toFixed(3)}`
}
