import { describe, expect, it } from 'vitest'
import { createPlace } from '../entities'
import { extractOsmDetails, formatOpeningHours, mergeOsmDetails } from '../osm-details'

describe('extractOsmDetails', () => {
  it('reads website, Instagram, phone and opening hours', () => {
    expect(
      extractOsmDetails({
        amenity: 'restaurant',
        website: 'lemusee.fr',
        'contact:instagram': '@lemusee.lyon',
        phone: '+33 4 78 37 71 54;+33 6 00 00 00 00',
        opening_hours: 'Tu-Sa 12:00-14:00',
      }),
    ).toEqual({
      links: [
        { kind: 'website', url: 'https://lemusee.fr/' },
        { kind: 'instagram', url: 'https://www.instagram.com/lemusee.lyon/' },
      ],
      phone: '+33 4 78 37 71 54',
      openingHours: 'Tu-Sa 12:00-14:00',
    })
  })

  it('keeps full Instagram URLs and tolerates missing tags', () => {
    expect(extractOsmDetails({ 'contact:instagram': 'https://instagram.com/x' }).links).toEqual([
      { kind: 'instagram', url: 'https://instagram.com/x' },
    ])
    expect(extractOsmDetails({})).toEqual({ links: [], phone: undefined, openingHours: undefined })
  })
})

describe('mergeOsmDetails', () => {
  const place = createPlace({
    category: 'food',
    name: 'Le Musée',
    address: '',
    location: { lat: 45.76, lng: 4.83 },
    links: [{ kind: 'website', url: 'https://lemusee.fr/' }],
    phone: '04 00 00 00 00',
  })

  it('only fills what is missing', () => {
    const { patch, added } = mergeOsmDetails(
      place,
      {
        links: [
          { kind: 'website', url: 'https://lemusee.fr/' },
          { kind: 'instagram', url: 'https://instagram.com/lemusee' },
        ],
        phone: '+33 4 78 37 71 54',
        openingHours: 'Tu-Sa 12:00-14:00',
      },
      { type: 'node', id: 42 },
    )
    expect(patch).toEqual({
      links: [
        { kind: 'website', url: 'https://lemusee.fr/' },
        { kind: 'instagram', url: 'https://instagram.com/lemusee' },
      ],
      openingHours: 'Tu-Sa 12:00-14:00',
      osmRef: { type: 'node', id: 42 },
    })
    expect(added).toEqual(['un lien', 'les horaires'])
  })

  it('reports nothing new', () => {
    expect(mergeOsmDetails(place, { links: [] }).added).toEqual([])
  })
})

describe('formatOpeningHours', () => {
  it('translates days, ranges and closed days', () => {
    expect(formatOpeningHours('Tu-Sa 12:00-14:00,19:00-22:00; Su off')).toEqual([
      'mar.–sam. 12:00–14:00, 19:00–22:00',
      'dim. fermé',
    ])
  })

  it('handles lists of days, public holidays and 24/7', () => {
    expect(formatOpeningHours('Mo,We 09:00-12:00; PH closed')).toEqual([
      'lun., mer. 09:00–12:00',
      'jours fériés fermé',
    ])
    expect(formatOpeningHours('24/7')).toEqual(['Ouvert 24 h/24, 7 j/7'])
  })
})
