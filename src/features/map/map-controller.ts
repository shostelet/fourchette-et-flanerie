import type { Map as MapLibreMap } from 'maplibre-gl'
import { shallowRef } from 'vue'
import { DEFAULT_MAP_ZOOM } from '@/config/constants'
import type { Category, GeoPoint } from '@/domain/models'
import { lineBounds, type LngLat } from '@/domain/routing'

/** A place highlighted on the map (e.g. the one being reviewed). */
export interface MapFocus {
  location: GeoPoint
  icon: string
  label: string
  category: Category
  /** Home is drawn with its own dark pin. */
  variant?: 'place' | 'home'
}

/** A route drawn on the map. */
export interface MapRoute {
  geometry: LngLat[]
  /** Hex color of the line. */
  color: string
}

export interface FlyToOptions {
  /** Pixels hidden by a bottom sheet: the point is centered in the visible part. */
  bottomPadding?: number
}

/**
 * Shared access to the map instance, so that components outside the map
 * (search bar, panels…) can move the camera, highlight a place or draw a route.
 *
 * Module-level singleton: there is only one map in the app.
 * `shallowRef` because a MapLibre instance must never be made deeply reactive.
 */
const map = shallowRef<MapLibreMap>()
const focus = shallowRef<MapFocus>()
const route = shallowRef<MapRoute>()
/** "Route mode": other pins are hidden to focus on the route. */
const zen = shallowRef(false)

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

  /** Centers the map on a point, keeping the zoom chosen by the user. */
  function panTo(point: GeoPoint): void {
    map.value?.easeTo({
      center: [point.lng, point.lat],
      padding: { top: 0, right: 0, left: 0, bottom: 0 },
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
    const bottomPadding = coveredHeight(instance, coverTop)
    const rect = instance.getContainer().getBoundingClientRect()
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

  /**
   * Frames the route above a panel starting at `coverTop` (viewport y), only
   * when it isn't already entirely visible: no needless zooming out.
   */
  function fitRoute(coverTop: number): void {
    const instance = map.value
    const bounds = route.value && lineBounds(route.value.geometry)
    if (!instance || !bounds) return
    const bottomPadding = coveredHeight(instance, coverTop)
    const rect = instance.getContainer().getBoundingClientRect()
    const padding = { top: 64, right: 32, left: 32, bottom: bottomPadding + 24 }
    // Not enough room left to frame anything: leave the map alone.
    if (rect.height - padding.top - padding.bottom < 80) return

    const inside = route.value!.geometry.every(([lng, lat]) => {
      const { x, y } = instance.project([lng, lat])
      return (
        x >= padding.left &&
        x <= rect.width - padding.right &&
        y >= padding.top &&
        y <= rect.height - padding.bottom
      )
    })
    if (!inside) instance.fitBounds(bounds, { padding, maxZoom: 17, essential: true })
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

  function setRoute(value: MapRoute | undefined): void {
    route.value = value
  }

  function setZen(value: boolean): void {
    zen.value = value
  }

  return {
    map,
    focus,
    route,
    zen,
    attach,
    detach,
    flyTo,
    panTo,
    ensureVisible,
    fitRoute,
    center,
    setFocus,
    setRoute,
    setZen,
  }
}

/** Height of the map hidden by a panel whose top is at `coverTop` (viewport y). */
function coveredHeight(instance: MapLibreMap, coverTop: number): number {
  const rect = instance.getContainer().getBoundingClientRect()
  return Math.max(0, Math.min(rect.height, rect.bottom - coverTop))
}
