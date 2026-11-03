import { describe, expect, it } from 'vitest'
import { createPlace } from '../entities'
import {
  bboxAround,
  excludeKnown,
  formatAddress,
  formatDistance,
  parsePhotonResponse,
  rankResults,
} from '../geocoding'

const feature = (properties: Record<string, unknown>, coordinates = [4.8316954, 45.7595294]) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates },
  properties,
})

const monsieurP = feature({
  osm_type: 'N',
  osm_id: 123,
  osm_key: 'amenity',
  osm_value: 'restaurant',
  name: 'Monsieur P',
  housenumber: '8',
  street: 'Place des Célestins',
  postcode: '69002',
  city: 'Lyon',
  extra: { website: 'monsieurp.fr', opening_hours: 'Tu-Sa 12:00-14:00', phone: '+33 4 00 00 00 00' },
})

describe('parsePhotonResponse', () => {
  it('reads a point of interest with its category, icon and extra tags', () => {
    const [result] = parsePhotonResponse({ type: 'FeatureCollection', features: [monsieurP] })
    expect(result).toEqual({
      key: 'node/123',
      name: 'Monsieur P',
      address: '8 Place des Célestins, 69002 Lyon',
      location: { lat: 45.7595294, lng: 4.8316954 },
      kind: 'place',
      osmRef: { type: 'node', id: 123 },
      category: 'food',
      icon: 'utensils',
      links: [{ kind: 'website', url: 'https://monsieurp.fr/' }],
      phone: '+33 4 00 00 00 00',
      openingHours: 'Tu-Sa 12:00-14:00',
    })
  })

  it('maps shops to Flânerie', () => {
    const [result] = parsePhotonResponse({
      features: [feature({ osm_type: 'W', osm_id: 9, osm_key: 'shop', osm_value: 'florist', name: 'Fleurs' })],
    })
    expect(result).toMatchObject({ category: 'stroll', icon: 'flower', osmRef: { type: 'way', id: 9 } })
  })

  it('turns a bare address into an address result', () => {
    const [result] = parsePhotonResponse({
      features: [
        feature({
          osm_type: 'N',
          osm_id: 5,
          osm_key: 'place',
          osm_value: 'house',
          housenumber: '1',
          street: 'Rue de l’Exemple',
          postcode: '69003',
          city: 'Lyon',
          country: 'France',
        }),
      ],
    })
    expect(result).toMatchObject({
      kind: 'address',
      name: '1 Rue de l’Exemple, 69003 Lyon',
      address: 'Lyon, France',
      category: undefined,
    })
  })

  it('skips malformed features and tolerates junk', () => {
    expect(parsePhotonResponse({ features: [{ type: 'Feature' }, 42] })).toEqual([])
    expect(parsePhotonResponse('nope')).toEqual([])
  })
})

describe('formatAddress', () => {
  it('falls back on locality when there is no city', () => {
    expect(formatAddress({ street: 'Grande Rue', postcode: '69540', locality: 'Irigny' })).toBe(
      'Grande Rue, 69540 Irigny',
    )
  })
})

describe('excludeKnown', () => {
  const [result] = parsePhotonResponse({ features: [monsieurP] })

  it('drops results already saved, by OSM object or by name nearby', () => {
    const sameOsm = createPlace({
      category: 'food',
      name: 'Autre nom',
      address: '',
      location: { lat: 0, lng: 0 },
      osmRef: { type: 'node', id: 123 },
    })
    const sameName = createPlace({
      category: 'food',
      name: 'Monsieur P',
      address: '',
      location: { lat: 45.7596, lng: 4.8317 },
    })
    expect(excludeKnown([result!], [sameOsm])).toEqual([])
    expect(excludeKnown([result!], [sameName])).toEqual([])
    expect(excludeKnown([result!], [])).toHaveLength(1)
  })
})

describe('rankResults', () => {
  it('puts places of the active category first, addresses last', () => {
    const results = parsePhotonResponse({
      features: [
        feature({ osm_key: 'place', osm_value: 'house', street: 'Rue A', city: 'Lyon' }),
        feature({ osm_key: 'shop', osm_value: 'gift', name: 'Cadeaux' }),
        feature({ osm_key: 'amenity', osm_value: 'cafe', name: 'Café' }),
      ],
    })
    expect(rankResults(results, 'food').map((r) => r.name)).toEqual(['Café', 'Cadeaux', 'Rue A, Lyon'])
    expect(rankResults(results, 'stroll').map((r) => r.name)).toEqual(['Cadeaux', 'Café', 'Rue A, Lyon'])
  })
})

describe('helpers', () => {
  it('builds a bounding box around a point', () => {
    const [minLon, minLat, maxLon, maxLat] = bboxAround({ lat: 45.76, lng: 4.84 }, 10_000)
      .split(',')
      .map(Number)
    expect(maxLat! - minLat!).toBeCloseTo(0.18, 2)
    expect(maxLon! - minLon!).toBeCloseTo(0.258, 2)
  })

  it('formats distances', () => {
    expect(formatDistance(3)).toBe('10 m')
    expect(formatDistance(347)).toBe('350 m')
    expect(formatDistance(1234)).toBe('1,2 km')
    expect(formatDistance(12_600)).toBe('13 km')
  })
})
