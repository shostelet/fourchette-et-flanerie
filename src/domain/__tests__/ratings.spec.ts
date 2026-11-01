import { describe, expect, it } from 'vitest'
import { createVisit } from '../entities'
import {
  formatAverage,
  nearestRating,
  ratingGaugePosition,
  summarizeRatings,
  summarizeVisits,
} from '../ratings'

describe('nearestRating', () => {
  it('rounds to the closest face, half up', () => {
    expect(nearestRating(3.7)).toBe(4)
    expect(nearestRating(3.2)).toBe(3)
    expect(nearestRating(2.5)).toBe(3)
  })

  it('stays within 1..5', () => {
    expect(nearestRating(0.2)).toBe(1)
    expect(nearestRating(9)).toBe(5)
  })
})

describe('summarizeRatings', () => {
  it('returns null when nothing is rated', () => {
    expect(summarizeRatings([])).toBeNull()
    expect(summarizeRatings([undefined, null])).toBeNull()
  })

  it('averages only the available ratings', () => {
    expect(summarizeRatings([4, undefined, 3, 4])).toEqual({
      average: 11 / 3,
      count: 3,
      nearest: 4,
    })
  })
})

describe('summarizeVisits', () => {
  it('summarizes each criterion independently', () => {
    const visits = [
      createVisit({ placeId: 'p', quality: 5, value: 1 }),
      createVisit({ placeId: 'p', quality: 4 }),
    ]
    const ratings = summarizeVisits(visits)
    expect(ratings.quality).toEqual({ average: 4.5, count: 2, nearest: 5 })
    expect(ratings.value).toEqual({ average: 1, count: 1, nearest: 1 })
  })

  it('ignores deleted visits', () => {
    const deleted = { ...createVisit({ placeId: 'p', quality: 1 }), deletedAt: '2026-01-01T00:00:00Z' }
    expect(summarizeVisits([deleted]).quality).toBeNull()
  })
})

describe('display helpers', () => {
  it('places the average on the gauge', () => {
    expect(ratingGaugePosition(1)).toBe(0)
    expect(ratingGaugePosition(3)).toBe(0.5)
    expect(ratingGaugePosition(5)).toBe(1)
  })

  it('formats the average the French way', () => {
    expect(formatAverage(11 / 3)).toBe('3,7')
    expect(formatAverage(4)).toBe('4,0')
  })
})
