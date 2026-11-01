import { MAP_VIEW_MEMORY_MS } from '@/config/constants'
import type { GeoPoint } from './models'

export interface MapView {
  center: GeoPoint
  zoom: number
  /** Epoch milliseconds. */
  savedAt: number
}

/** The last map view is restored only if it is recent enough (48 h). */
export function isMapViewFresh(
  view: MapView | undefined,
  now: number = Date.now(),
  maxAgeMs: number = MAP_VIEW_MEMORY_MS,
): view is MapView {
  return view !== undefined && now - view.savedAt <= maxAgeMs
}
