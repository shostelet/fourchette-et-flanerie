import { describe, expect, it } from 'vitest'
import { formatVisitDate, linkLabel, pluralize } from '../format'

describe('formatVisitDate', () => {
  it('formats a date the French way', () => {
    expect(formatVisitDate('2026-10-12')).toBe('12 octobre 2026')
    expect(formatVisitDate('2026-01-01')).toBe('1 janvier 2026')
  })

  it('handles an unknown date', () => {
    expect(formatVisitDate(undefined)).toBe('Date inconnue')
  })
})

describe('pluralize', () => {
  it('adds an s from 2', () => {
    expect(pluralize(1, 'visite')).toBe('1 visite')
    expect(pluralize(4, 'visite')).toBe('4 visites')
    expect(pluralize(2, 'lieu', 'lieux')).toBe('2 lieux')
  })
})

describe('linkLabel', () => {
  it('shows an Instagram handle', () => {
    expect(linkLabel({ kind: 'instagram', url: 'https://www.instagram.com/lemusee.lyon/' })).toBe(
      '@lemusee.lyon',
    )
  })

  it('shows the host name of a website', () => {
    expect(linkLabel({ kind: 'website', url: 'https://www.lemusee.fr/carte' })).toBe('lemusee.fr')
  })

  it('falls back to the raw text when it is not a URL', () => {
    expect(linkLabel({ kind: 'other', url: 'pas une url' })).toBe('pas une url')
  })
})
