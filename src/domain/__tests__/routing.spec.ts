import { describe, expect, it } from 'vitest'
import { formatDuration, lineBounds, parseOsrmRoute, roundedKey } from '../routing'

describe('parseOsrmRoute', () => {
  const response = {
    code: 'Ok',
    routes: [
      {
        distance: 912.4,
        duration: 655.1,
        geometry: {
          type: 'LineString',
          coordinates: [
            [4.832, 45.7578],
            [4.833, 45.76],
            [4.8346, 45.7645],
          ],
        },
      },
    ],
  }

  it('reads distance, duration and geometry', () => {
    expect(parseOsrmRoute(response, 'foot')).toEqual({
      mode: 'foot',
      distance: 912.4,
      duration: 655.1,
      geometry: [
        [4.832, 45.7578],
        [4.833, 45.76],
        [4.8346, 45.7645],
      ],
    })
  })

  it('returns undefined when there is no route', () => {
    expect(parseOsrmRoute({ code: 'NoRoute', routes: [] }, 'bike')).toBeUndefined()
    expect(parseOsrmRoute('oops', 'bike')).toBeUndefined()
  })
})

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(20)).toBe('< 1 min')
    expect(formatDuration(655)).toBe('11 min')
    expect(formatDuration(3600)).toBe('1 h')
    expect(formatDuration(3900)).toBe('1 h 05')
  })
})

describe('lineBounds', () => {
  it('finds the corners of a line', () => {
    expect(
      lineBounds([
        [4.84, 45.76],
        [4.83, 45.77],
        [4.85, 45.75],
      ]),
    ).toEqual([
      [4.83, 45.75],
      [4.85, 45.77],
    ])
    expect(lineBounds([])).toBeUndefined()
  })
})

describe('roundedKey', () => {
  it('ignores small moves', () => {
    expect(roundedKey({ lat: 45.76012, lng: 4.84021 })).toBe(roundedKey({ lat: 45.76038, lng: 4.83988 }))
    expect(roundedKey({ lat: 45.76012, lng: 4.84021 })).not.toBe(roundedKey({ lat: 45.7621, lng: 4.84021 }))
  })
})
