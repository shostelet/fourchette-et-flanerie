import { describe, expect, it } from 'vitest'
import { clusterPoints, toPixels } from '../clustering'
import type { GeoPoint } from '../models'

const at = (lat: number, lng: number): GeoPoint => ({ lat, lng })
const id = (p: GeoPoint) => p

// Three places a few dozen meters apart (Presqu'île), one far away (Villeurbanne).
const close = [at(45.7640, 4.8357), at(45.7642, 4.8360), at(45.7638, 4.8355)]
const far = at(45.7719, 4.8902)

describe('toPixels', () => {
  it('doubles the distances at each zoom level', () => {
    const a = toPixels(close[0]!, 12)
    const b = toPixels(close[0]!, 13)
    expect(b.x).toBeCloseTo(a.x * 2, 6)
    expect(b.y).toBeCloseTo(a.y * 2, 6)
  })
})

describe('clusterPoints', () => {
  it('groups close points when zoomed out, keeps far ones single', () => {
    const result = clusterPoints([...close, far], id, 12)
    const clusters = result.filter((r) => r.kind === 'cluster')
    const singles = result.filter((r) => r.kind === 'single')
    expect(clusters).toHaveLength(1)
    expect(clusters[0]!.kind === 'cluster' && clusters[0]!.items).toHaveLength(3)
    expect(singles).toEqual([{ kind: 'single', item: far }])
  })

  it('places a cluster at the average position', () => {
    const [cluster] = clusterPoints(close, id, 10)
    expect(cluster!.kind).toBe('cluster')
    if (cluster!.kind === 'cluster') {
      expect(cluster!.location.lat).toBeCloseTo(45.764, 4)
      expect(cluster!.location.lng).toBeCloseTo(4.8357, 4)
    }
  })

  it('shows every point on its own from maxZoom on', () => {
    expect(clusterPoints(close, id, 15).every((r) => r.kind === 'single')).toBe(true)
    expect(clusterPoints(close, id, 13, { maxZoom: 13 })).toHaveLength(3)
  })

  it('gives stable keys for the same cell and zoom', () => {
    const [a] = clusterPoints(close, id, 12)
    const [b] = clusterPoints([...close].reverse(), id, 12)
    expect(a!.kind === 'cluster' && b!.kind === 'cluster' && a!.key === b!.key).toBe(true)
  })
})
