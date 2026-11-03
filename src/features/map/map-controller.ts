import type { Map as MapLibreMap } from 'maplibre-gl'
import { shallowRef } from 'vue'
import { DEFAULT_MAP_ZOOM } from '@/config/constants'
import type { Category, GeoPoint } from '@/domain/models'

/** A place highlighted on the map (e.g. the one being reviewed). */
export interface MapFocus {
  location: GeoPoint
  icon: string
  label: string
  category: Category
  /** Home is drawn with its own dark pin. */
  variant?: 'place' | 'home'
}

export interface FlyToOptions {
  /** Pixels hidden by a bottom sheet: the point is centered in the visible part. */
  bottomPadding?: number
}

/**
 * Shared access to the map instance, so that components outside the map
 * (search bar, panels…) can move the camera or highlight a place.
 *
 * Module-level singleton: there is only one map in the app.
 * `shallowRef` because a MapLibre instance must never be made deeply reactive.
 */
const map = shallowRef<MapLibreMap>()
const focus = shallowRef<MapFocus>()

export function useMapController() {
  function attach(instance: MapLibreMap): void {
    map.value = instance
  }

  function detach(): void {
    map.value = undefined
  }

  /** Smoothly moves the camera. Never zooms out if already closer. */
  function flyTo(point: GeoPoint, zoom: number = DEFAULT_MAP_ZOOM, options: FlyToOptions = {}): void {
    const instance = map.value
    if (!instance) return
    instance.flyTo({
      center: [point.lng, point.lat],
      zoom: Math.max(zoom, instance.getZoom()),
      // Always set, so a previous padding never lingers.
      padding: { top: 0, right: 0, left: 0, bottom: options.bottomPadding ?? 0 },
      essential: true,
    })
  }

  /**
   * Makes sure a place is visible above a panel covering the bottom of the
   * map from `coverTop` (a viewport y coordinate) downward. The map only moves
   * when the pin is hidden or off screen: it is then centered in the visible part.
   */
  function ensureVisible(point: GeoPoint, coverTop: number): void {
    const instance = map.value
    if (!instance) return
    const rect = instance.getContainer().getBoundingClientRect()
    const bottomPadding = Math.max(0, Math.min(rect.height, rect.bottom - coverTop))
    const { x, y } = instance.project([point.lng, point.lat])
    const PIN_HEIGHT = 56 // the pin is drawn above its point
    const MARGIN = 16
    const visible =
      x >= MARGIN &&
      x <= rect.width - MARGIN &&
      y - PIN_HEIGHT >= MARGIN &&
      y <= rect.height - bottomPadding - MARGIN
    if (!visible) flyTo(point, DEFAULT_MAP_ZOOM, { bottomPadding })
  }

  /** Geographic point at the center of the visible map. */
  function center(): GeoPoint | undefined {
    const instance = map.value
    if (!instance) return undefined
    const { lat, lng } = instance.getCenter()
    return { lat, lng }
  }

  function setFocus(value: MapFocus | undefined): void {
    focus.value = value
  }

  return { map, focus, attach, detach, flyTo, ensureVisible, center, setFocus }
}
