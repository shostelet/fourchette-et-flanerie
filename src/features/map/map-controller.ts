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

  function setFocus(value: MapFocus | undefined): void {
    focus.value = value
  }

  return { map, focus, attach, detach, flyTo, setFocus }
}
