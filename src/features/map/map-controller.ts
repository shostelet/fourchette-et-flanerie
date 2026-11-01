import type { Map as MapLibreMap } from 'maplibre-gl'
import { shallowRef } from 'vue'
import { DEFAULT_MAP_ZOOM } from '@/config/constants'
import type { GeoPoint } from '@/domain/models'

/**
 * Shared access to the map instance, so that components outside the map
 * (search bar, place panel…) can move the camera.
 *
 * Module-level singleton: there is only one map in the app.
 * `shallowRef` because a MapLibre instance must never be made deeply reactive.
 */
const map = shallowRef<MapLibreMap>()

export function useMapController() {
  function attach(instance: MapLibreMap): void {
    map.value = instance
  }

  function detach(): void {
    map.value = undefined
  }

  /** Smoothly moves the camera. Never zooms out if already closer. */
  function flyTo(point: GeoPoint, zoom: number = DEFAULT_MAP_ZOOM): void {
    const instance = map.value
    if (!instance) return
    instance.flyTo({
      center: [point.lng, point.lat],
      zoom: Math.max(zoom, instance.getZoom()),
      essential: true,
    })
  }

  return { map, attach, detach, flyTo }
}
