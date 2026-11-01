import { Marker, type PositionAnchor } from 'maplibre-gl'
import { onBeforeUnmount, render, watch, type VNode } from 'vue'
import type { GeoPoint } from '@/domain/models'
import { useMapController } from './map-controller'

export interface MapMarkersOptions<T> {
  /** Stable identifier of an item. */
  key: (item: T) => string
  /** Changes whenever the marker must be redrawn (e.g. `updatedAt`). */
  version: (item: T) => string
  position: (item: T) => GeoPoint
  /** Vue content of the marker. */
  render: (item: T) => VNode
  onClick?: (item: T) => void
  anchor?: PositionAnchor
}

interface MarkerRecord<T> {
  marker: Marker
  element: HTMLElement
  version: string
  item: T
}

/**
 * Keeps MapLibre markers in sync with a reactive list of items.
 *
 * Only what changed is touched: new items get a marker, removed ones lose
 * it, and a marker is redrawn only when its `version` changes. Each marker
 * is a small DOM element whose content is rendered with Vue.
 */
export function useMapMarkers<T>(
  items: () => readonly T[],
  options: MapMarkersOptions<T>,
): void {
  const { map } = useMapController()
  const records = new Map<string, MarkerRecord<T>>()

  function removeRecord(key: string, record: MarkerRecord<T>): void {
    render(null, record.element)
    record.marker.remove()
    records.delete(key)
  }

  function sync(): void {
    const instance = map.value
    if (!instance) return

    const seen = new Set<string>()
    for (const item of items()) {
      const key = options.key(item)
      const version = options.version(item)
      const { lng, lat } = options.position(item)
      seen.add(key)

      const existing = records.get(key)
      if (existing) {
        existing.item = item
        if (existing.version !== version) {
          existing.version = version
          existing.marker.setLngLat([lng, lat])
          render(options.render(item), existing.element)
        }
        continue
      }

      const element = document.createElement('div')
      render(options.render(item), element)
      const record: MarkerRecord<T> = {
        element,
        version,
        item,
        marker: new Marker({ element, anchor: options.anchor ?? 'bottom' })
          .setLngLat([lng, lat])
          .addTo(instance),
      }
      if (options.onClick) {
        element.addEventListener('click', (event) => {
          event.stopPropagation()
          options.onClick?.(record.item)
        })
      }
      records.set(key, record)
    }

    for (const [key, record] of records) {
      if (!seen.has(key)) removeRecord(key, record)
    }
  }

  watch([map, items], sync, { immediate: true })

  onBeforeUnmount(() => {
    for (const [key, record] of records) removeRecord(key, record)
  })
}
