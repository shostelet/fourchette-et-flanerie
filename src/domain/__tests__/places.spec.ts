import { describe, expect, it } from 'vitest'
import { createPlace, createTag, softDelete, type PlaceDraft } from '../entities'
import {
  distanceMeters,
  findDuplicate,
  isActive,
  isToTest,
  matchesQuery,
  namesLookAlike,
} from '../places'
import { normalizeText } from '../text'

const draft = (overrides: Partial<PlaceDraft> = {}): PlaceDraft => ({
  category: 'food',
  name: 'Le Musée',
  address: '2 Rue des Forces, 69002 Lyon',
  location: { lat: 45.7645473, lng: 4.8346759 },
  ...overrides,
})

describe('createPlace', () => {
  it('applies sensible defaults', () => {
    const place = createPlace(draft({ name: '  Le Musée ', tagIds: ['a', 'a', 'b'] }))
    expect(place.name).toBe('Le Musée')
    expect(place.icon).toBe('utensils')
    expect(place.tagIds).toEqual(['a', 'b'])
    expect(place.visited).toBe(false)
    expect(place.needsReview).toBe(false)
    expect(place.source).toBe('manual')
    expect(place.createdAt).toBe(place.updatedAt)
  })

  it('uses the stroll default icon', () => {
    expect(createPlace(draft({ category: 'stroll' })).icon).toBe('shopping-bag')
  })
})

describe('status', () => {
  it('is to test until visited', () => {
    expect(isToTest(createPlace(draft()))).toBe(true)
    expect(isToTest(createPlace(draft({ visited: true })))).toBe(false)
  })

  it('hides closed and deleted places', () => {
    const place = createPlace(draft())
    expect(isActive(place)).toBe(true)
    expect(isActive({ ...place, closedAt: '2026-10-01T00:00:00Z' })).toBe(false)
    expect(isActive(softDelete(place))).toBe(false)
  })
})

describe('normalizeText', () => {
  it('drops accents, case and punctuation', () => {
    expect(normalizeText('Béguin - Bar à manger')).toBe('beguin bar a manger')
    expect(normalizeText("L'Artchimiste")).toBe('l artchimiste')
  })
})

describe('distanceMeters', () => {
  it('computes realistic distances', () => {
    // Le Musée → Lupo, about 230 m apart
    const d = distanceMeters(
      { lat: 45.7645473, lng: 4.8346759 },
      { lat: 45.7627773, lng: 4.8319962 },
    )
    expect(d).toBeGreaterThan(200)
    expect(d).toBeLessThan(300)
  })
})

describe('findDuplicate', () => {
  const existing = createPlace(
    draft({ name: 'Gojo Restaurant Éthiopien (Gojo)', location: { lat: 45.75221, lng: 4.85153 } }),
  )

  it('matches a similar name nearby', () => {
    expect(namesLookAlike('Gojo', existing.name)).toBe(true)
    const found = findDuplicate(
      { name: 'Gojo', location: { lat: 45.7522, lng: 4.8516 } },
      [existing],
    )
    expect(found?.id).toBe(existing.id)
  })

  it('ignores a similar name far away', () => {
    expect(
      findDuplicate({ name: 'Gojo', location: { lat: 45.77, lng: 4.83 } }, [existing]),
    ).toBeUndefined()
  })

  it('matches the same OSM object whatever the name', () => {
    const osm = createPlace(draft({ osmRef: { type: 'node', id: 42 } }))
    expect(
      findDuplicate(
        { name: 'Autre nom', location: { lat: 0, lng: 0 }, osmRef: { type: 'node', id: 42 } },
        [osm],
      )?.id,
    ).toBe(osm.id)
  })

  it('never flags a closed place, so its replacement can be added', () => {
    const closed = { ...existing, closedAt: '2026-10-01T00:00:00Z' }
    expect(
      findDuplicate({ name: 'Gojo', location: existing.location }, [closed]),
    ).toBeUndefined()
  })
})

describe('matchesQuery', () => {
  const bouchon = createTag({ category: 'food', name: 'Bouchon', color: '#995d2e' })
  const place = createPlace(draft({ tagIds: [bouchon.id], memo: 'Conseillé par Julie' }))
  const tags = new Map([[bouchon.id, bouchon]])

  it('searches name, address, memo and tags, ignoring accents', () => {
    expect(matchesQuery(place, 'musee')).toBe(true)
    expect(matchesQuery(place, 'forces')).toBe(true)
    expect(matchesQuery(place, 'julie')).toBe(true)
    expect(matchesQuery(place, 'bouchon', tags)).toBe(true)
  })

  it('requires every word to match', () => {
    expect(matchesQuery(place, 'musee bouchon', tags)).toBe(true)
    expect(matchesQuery(place, 'musee ramen', tags)).toBe(false)
  })

  it('matches everything on an empty query', () => {
    expect(matchesQuery(place, '  ')).toBe(true)
  })
})
