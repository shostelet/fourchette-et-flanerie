import { describe, expect, it } from 'vitest'
import { cleanLinks, detectLinkKind, normalizeUrl } from '../links'
import { mergeTagIds } from '../tags'

describe('normalizeUrl', () => {
  it('adds the scheme when missing', () => {
    expect(normalizeUrl('lemusee.fr')).toBe('https://lemusee.fr/')
    expect(normalizeUrl('  www.lemusee.fr/carte ')).toBe('https://www.lemusee.fr/carte')
  })

  it('keeps http and https', () => {
    expect(normalizeUrl('http://example.org/a')).toBe('http://example.org/a')
  })

  it('rejects what is not a web address', () => {
    expect(normalizeUrl('')).toBeUndefined()
    expect(normalizeUrl('bonjour')).toBeUndefined()
    expect(normalizeUrl('ftp://example.org')).toBeUndefined()
    expect(normalizeUrl('pas une url.fr avec espaces')).toBeUndefined()
  })
})

describe('detectLinkKind', () => {
  it('recognizes Instagram', () => {
    expect(detectLinkKind('https://www.instagram.com/lemusee.lyon/')).toBe('instagram')
    expect(detectLinkKind('https://instagram.com/x')).toBe('instagram')
  })

  it('treats anything else as a website', () => {
    expect(detectLinkKind('https://lemusee.fr/')).toBe('website')
  })
})

describe('cleanLinks', () => {
  it('normalizes, classifies, deduplicates and reports invalid inputs', () => {
    expect(
      cleanLinks(['lemusee.fr', '', 'https://lemusee.fr/', 'instagram.com/lemusee', 'oups']),
    ).toEqual({
      links: [
        { kind: 'website', url: 'https://lemusee.fr/' },
        { kind: 'instagram', url: 'https://instagram.com/lemusee' },
      ],
      invalid: ['oups'],
    })
  })
})

describe('mergeTagIds', () => {
  it('replaces the source by the target without duplicates', () => {
    expect(mergeTagIds(['a', 'b'], 'a', 'c')).toEqual(['c', 'b'])
    expect(mergeTagIds(['a', 'c'], 'a', 'c')).toEqual(['c'])
  })

  it('returns undefined when there is nothing to change', () => {
    expect(mergeTagIds(['b'], 'a', 'c')).toBeUndefined()
  })
})
