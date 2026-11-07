import { describe, expect, it } from 'vitest'
import { createPlace, type PlaceDraft } from '../entities'
import {
  correctionsFor,
  reviewPatch,
  reviewQueue,
  toggleTag,
  withCategory,
} from '../review'

const place = (overrides: Partial<PlaceDraft> = {}, createdAt = '2026-11-01T10:00:00.000Z') =>
  createPlace(
    {
      category: 'food',
      name: 'Lieu',
      address: 'Lyon',
      location: { lat: 45.76, lng: 4.83 },
      needsReview: true,
      ...overrides,
    },
    createdAt,
  )

describe('reviewPatch', () => {
  const corrections = { category: 'food' as const, icon: 'beer', tagIds: ['a', 'a', 'b'] }

  it('marks a visited place and clears the flag', () => {
    expect(reviewPatch('visited', corrections)).toEqual({
      category: 'food',
      icon: 'beer',
      tagIds: ['a', 'b'],
      visited: true,
      needsReview: false,
    })
  })

  it('confirms a place to test', () => {
    expect(reviewPatch('to-test', corrections)).toMatchObject({ visited: false, needsReview: false })
  })

  it('closes a place', () => {
    expect(reviewPatch('closed', corrections, '2026-11-01T18:00:00.000Z')).toMatchObject({
      closedAt: '2026-11-01T18:00:00.000Z',
      needsReview: false,
    })
  })

  it('saves corrections on skip but keeps the place in the queue', () => {
    const patch = reviewPatch('skip', corrections)
    expect(patch).toEqual({ category: 'food', icon: 'beer', tagIds: ['a', 'b'] })
    expect(patch).not.toHaveProperty('needsReview')
  })
})

describe('corrections', () => {
  const lupo = place({ name: 'Lupo', icon: 'shopping-basket', tagIds: ['italien'] })

  it('starts from the place', () => {
    expect(correctionsFor(lupo)).toEqual({ category: 'food', icon: 'shopping-basket', tagIds: ['italien'] })
  })

  it('resets the icon when the category changes, keeps the tags', () => {
    expect(withCategory(correctionsFor(lupo), 'stroll')).toEqual({
      category: 'stroll',
      icon: 'shopping-bag',
      tagIds: ['italien'],
    })
  })

  it('leaves everything as is for the same category', () => {
    const c = correctionsFor(lupo)
    expect(withCategory(c, 'food')).toBe(c)
  })

  it('toggles tags', () => {
    const c = correctionsFor(lupo)
    expect(toggleTag(c, 'sandwich').tagIds).toEqual(['italien', 'sandwich'])
    expect(toggleTag(c, 'italien').tagIds).toEqual([])
  })
})

describe('reviewQueue', () => {
  const first = place({ name: 'Premier' }, '2026-11-01T10:00:00.000Z')
  const second = place({ name: 'Second' }, '2026-11-01T11:00:00.000Z')
  const confirmed = place({ name: 'Confirmé', needsReview: false })
  const closed = { ...place({ name: 'Fermé' }), closedAt: '2026-10-01T00:00:00.000Z' }

  it('keeps flagged, active places in import order', () => {
    expect(reviewQueue([second, confirmed, closed, first], new Set()).map((p) => p.name)).toEqual([
      'Premier',
      'Second',
    ])
  })

  it('moves skipped places to the end', () => {
    expect(reviewQueue([first, second], new Set([first.id])).map((p) => p.name)).toEqual([
      'Second',
      'Premier',
    ])
  })
})
