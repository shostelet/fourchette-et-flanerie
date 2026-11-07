import { describe, expect, it } from 'vitest'
import { createVisit, todayIsoDate } from '../entities'
import { createId } from '../ids'
import { isMapViewFresh } from '../map-view'
import { sortVisits } from '../visits'

describe('sortVisits', () => {
  it('puts recent visits first and undated ones last', () => {
    const old = createVisit({ placeId: 'p', date: '2025-03-01' })
    const recent = createVisit({ placeId: 'p', date: '2026-10-12' })
    const undated = createVisit({ placeId: 'p' })
    expect(sortVisits([undated, old, recent]).map((v) => v.id)).toEqual([
      recent.id,
      old.id,
      undated.id,
    ])
  })
})

describe('createVisit', () => {
  it('drops an empty comment', () => {
    expect(createVisit({ placeId: 'p', comment: '   ' }).comment).toBeUndefined()
  })
})

describe('todayIsoDate', () => {
  it('formats a local date', () => {
    expect(todayIsoDate(new Date(2026, 10, 1))).toBe('2026-11-01')
  })
})

describe('createId', () => {
  it('produces distinct v4 UUIDs', () => {
    const a = createId()
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(createId()).not.toBe(a)
  })
})

describe('isMapViewFresh', () => {
  const view = { center: { lat: 45.75, lng: 4.85 }, zoom: 15, savedAt: 0 }
  const hour = 60 * 60 * 1000

  it('keeps a view for 48 hours', () => {
    expect(isMapViewFresh(view, 47 * hour)).toBe(true)
    expect(isMapViewFresh(view, 49 * hour)).toBe(false)
    expect(isMapViewFresh(undefined, 0)).toBe(false)
  })
})
