import { describe, expect, it } from 'vitest'
import { createPlace, softDelete, type PlaceDraft } from '../entities'
import {
  countActiveFilters,
  DEFAULT_FILTERS,
  filterPlaces,
  sortPlaces,
  type PlaceFilters,
} from '../filters'
import type { Id, Place } from '../models'
import { summarizeRatings, type PlaceRatings } from '../ratings'

const place = (name: string, overrides: Partial<PlaceDraft> = {}, createdAt?: string) =>
  createPlace(
    { category: 'food', name, address: '', location: { lat: 45.76, lng: 4.84 }, ...overrides },
    createdAt,
  )

const names = (places: Place[]) => places.map((p) => p.name)
const filters = (overrides: Partial<PlaceFilters>): PlaceFilters => ({ ...DEFAULT_FILTERS, ...overrides })

const bouchon = place('Bouchon', { visited: true, tagIds: ['lyonnais'] })
const ramen = place('Ramen', { tagIds: ['japonais'] })
const closed = { ...place('Fermé', { tagIds: ['lyonnais'] }), closedAt: '2026-10-01T00:00:00.000Z' }
const deleted = softDelete(place('Supprimé'))
const shop = place('Boutique', { category: 'stroll' })
const all = [bouchon, ramen, closed, deleted, shop]

describe('filterPlaces', () => {
  it('keeps the category, hides closed and deleted places by default', () => {
    expect(names(filterPlaces(all, 'food', DEFAULT_FILTERS))).toEqual(['Bouchon', 'Ramen'])
  })

  it('shows closed places on request', () => {
    expect(names(filterPlaces(all, 'food', filters({ showClosed: true })))).toEqual([
      'Bouchon',
      'Ramen',
      'Fermé',
    ])
  })

  it('filters by status', () => {
    expect(names(filterPlaces(all, 'food', filters({ status: 'to-test' })))).toEqual(['Ramen'])
    expect(names(filterPlaces(all, 'food', filters({ status: 'visited' })))).toEqual(['Bouchon'])
  })

  it('keeps places having at least one of the selected tags', () => {
    expect(names(filterPlaces(all, 'food', filters({ tagIds: ['japonais', 'lyonnais'] })))).toEqual([
      'Bouchon',
      'Ramen',
    ])
    expect(names(filterPlaces(all, 'food', filters({ tagIds: ['lyonnais'] })))).toEqual(['Bouchon'])
  })

  it('counts active filters', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0)
    expect(countActiveFilters(filters({ status: 'to-test', showClosed: true, tagIds: ['a', 'b'] }))).toBe(4)
  })
})

describe('sortPlaces', () => {
  const near = place('Proche', { location: { lat: 45.7601, lng: 4.8401 } }, '2026-01-01T00:00:00.000Z')
  const far = place('Loin', { location: { lat: 45.8, lng: 4.9 } }, '2026-06-01T00:00:00.000Z')
  const unrated = place('Pas noté', {}, '2026-03-01T00:00:00.000Z')
  const list = [far, unrated, near]

  const ratingsOf: Record<Id, PlaceRatings> = {
    [near.id]: { quality: summarizeRatings([3]), value: summarizeRatings([5]) },
    [far.id]: { quality: summarizeRatings([5, 4]), value: summarizeRatings([2]) },
  }
  const context = {
    origin: { lat: 45.76, lng: 4.84 },
    ratings: (id: Id) => ratingsOf[id] ?? { quality: null, value: null },
  }

  it('sorts by distance from the origin', () => {
    expect(names(sortPlaces(list, 'distance', context))).toEqual(['Pas noté', 'Proche', 'Loin'])
  })

  it('falls back to names without origin', () => {
    expect(names(sortPlaces(list, 'distance', { ...context, origin: undefined }))).toEqual([
      'Loin',
      'Pas noté',
      'Proche',
    ])
  })

  it('sorts by rating, unrated places last', () => {
    expect(names(sortPlaces(list, 'quality', context))).toEqual(['Loin', 'Proche', 'Pas noté'])
    expect(names(sortPlaces(list, 'value', context))).toEqual(['Proche', 'Loin', 'Pas noté'])
  })

  it('sorts by creation date, most recent first', () => {
    expect(names(sortPlaces(list, 'recent', context))).toEqual(['Loin', 'Pas noté', 'Proche'])
  })
})
