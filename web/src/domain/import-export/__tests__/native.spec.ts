import { describe, expect, it } from 'vitest'
import { createPlace, createTag, createVisit, softDelete } from '../../entities'
import { ImportError } from '../errors'
import {
  buildNativeExport,
  detectImportFormat,
  exportFileName,
  parseNativeExport,
  type AppData,
} from '../native'
import sample from './fixtures/mapstr-sample.json'

function sampleData(): AppData {
  const bouchon = createTag({ category: 'food', name: 'Bouchon', color: '#995d2e', icon: 'utensils' })
  const place = createPlace({
    category: 'food',
    name: 'Le Musée',
    address: '2 Rue des Forces, 69002 Lyon',
    location: { lat: 45.7645473, lng: 4.8346759 },
    tagIds: [bouchon.id],
    memo: 'Quenelles',
    links: [{ kind: 'website', url: 'https://example.org' }],
    openingHours: 'Tu-Sa 12:00-14:00',
    osmRef: { type: 'node', id: 123 },
    visited: true,
  })
  const closed = { ...createPlace({
    category: 'stroll',
    name: 'Boutique fermée',
    address: 'Lyon',
    location: { lat: 45.76, lng: 4.83 },
  }), closedAt: '2026-10-01T10:00:00.000Z' }
  const deleted = softDelete(createPlace({
    category: 'food',
    name: 'Erreur de saisie',
    address: 'Lyon',
    location: { lat: 45.76, lng: 4.83 },
  }))
  return {
    places: [place, closed, deleted],
    visits: [
      createVisit({ placeId: place.id, date: '2026-10-12', quality: 5, value: 4, comment: 'Top' }),
      createVisit({ placeId: place.id, quality: 4 }),
    ],
    tags: [bouchon],
    home: { address: '1 Rue de l’Exemple, 69003 Lyon', location: { lat: 45.76, lng: 4.85 } },
  }
}

describe('native export', () => {
  it('produces a valid GeoJSON FeatureCollection', () => {
    const data = sampleData()
    const exported = buildNativeExport(data, '2026-11-01T15:00:00.000Z')
    expect(exported.type).toBe('FeatureCollection')
    expect(exported.features[0]!.geometry).toEqual({
      type: 'Point',
      coordinates: [4.8346759, 45.7645473],
    })
    expect(exported.features[0]!.properties.visits).toHaveLength(2)
  })

  it('leaves soft-deleted entities out but keeps closed places', () => {
    const exported = buildNativeExport(sampleData())
    const names = exported.features.map((f) => f.properties.name)
    expect(names).toEqual(['Le Musée', 'Boutique fermée'])
  })

  it('survives a JSON round trip without losing anything', () => {
    const data = sampleData()
    const json = JSON.parse(JSON.stringify(buildNativeExport(data)))
    const restored = parseNativeExport(json)
    const plain = <T>(v: T): T => JSON.parse(JSON.stringify(v))

    expect(restored.places).toEqual(plain(data.places.slice(0, 2)))
    expect(restored.visits).toEqual(plain(data.visits))
    expect(restored.tags).toEqual(plain(data.tags))
    expect(restored.home).toEqual(data.home)
  })

  it('names the file with the date', () => {
    expect(exportFileName(new Date('2026-11-01T15:00:00Z'))).toBe('fourchette-export-2026-11-01.json')
  })
})

describe('native import errors', () => {
  it('rejects a foreign file', () => {
    expect(() => parseNativeExport(sample)).toThrow(ImportError)
  })

  it('rejects an export from a newer version', () => {
    const json = { ...buildNativeExport(sampleData()), schemaVersion: 99 }
    expect(() => parseNativeExport(json)).toThrow(/plus récente/)
  })

  it('rejects a malformed place', () => {
    const json = buildNativeExport(sampleData())
    const broken = { ...json, features: [{ type: 'Feature', id: 'x', properties: {} }] }
    expect(() => parseNativeExport(broken)).toThrow(ImportError)
  })
})

describe('detectImportFormat', () => {
  it('tells native exports, Mapstr exports and anything else apart', () => {
    expect(detectImportFormat(buildNativeExport(sampleData()))).toBe('native')
    expect(detectImportFormat(sample)).toBe('mapstr')
    expect(detectImportFormat([1, 2])).toBe('unknown')
    expect(detectImportFormat({ type: 'Feature' })).toBe('unknown')
  })
})
