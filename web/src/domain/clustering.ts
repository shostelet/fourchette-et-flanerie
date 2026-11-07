import type { GeoPoint } from './models'

export type Clustered<T> =
  | { kind: 'single'; item: T }
  | { kind: 'cluster'; key: string; location: GeoPoint; items: T[] }

export interface ClusterOptions {
  /** Size of a grid cell on screen, in pixels. */
  cellPx?: number
  /** From this zoom level on, every point is shown on its own. */
  maxZoom?: number
}

/** Web Mercator position in pixels at a zoom level (256 px tiles). */
export function toPixels(point: GeoPoint, zoom: number): { x: number; y: number } {
  const scale = 256 * 2 ** zoom
  const sinLat = Math.sin((point.lat * Math.PI) / 180)
  return {
    x: ((point.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  }
}

/**
 * Groups points that would overlap on screen: points falling in the same
 * grid cell (at this zoom) form a cluster, placed at their average position.
 * Lonely points, and every point from `maxZoom` on, stay single.
 */
export function clusterPoints<T>(
  items: readonly T[],
  location: (item: T) => GeoPoint,
  zoom: number,
  options: ClusterOptions = {},
): Clustered<T>[] {
  const { cellPx = 64, maxZoom = 15 } = options
  if (zoom >= maxZoom) return items.map((item) => ({ kind: 'single', item }))

  const cells = new Map<string, T[]>()
  for (const item of items) {
    const { x, y } = toPixels(location(item), zoom)
    const key = `${zoom}:${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`
    const cell = cells.get(key)
    if (cell) cell.push(item)
    else cells.set(key, [item])
  }

  return [...cells].map(([key, members]): Clustered<T> => {
    if (members.length === 1) return { kind: 'single', item: members[0]! }
    const lat = members.reduce((sum, m) => sum + location(m).lat, 0) / members.length
    const lng = members.reduce((sum, m) => sum + location(m).lng, 0) / members.length
    return { kind: 'cluster', key, location: { lat, lng }, items: members }
  })
}
