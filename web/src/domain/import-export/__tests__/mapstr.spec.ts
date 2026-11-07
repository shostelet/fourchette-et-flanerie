import { describe, expect, it } from 'vitest'
import { createPlace, createTag } from '../../entities'
import type { Place } from '../../models'
import { ImportError } from '../errors'
import { planMapstrImport, resolveMapstrPlan, type DuplicateDecision } from '../mapstr'
import sample from './fixtures/mapstr-sample.json'

const empty = { places: [], tags: [] }
const byName = (places: Place[], name: string) => places.find((p) => p.name === name)!

describe('planMapstrImport on the sample export', () => {
  const plan = planMapstrImport(sample, empty)
  const places = plan.candidates.map((c) => c.place)

  it('turns the home icon into the home address, not a place', () => {
    expect(plan.home).toEqual({
      address: "1 Rue de l'Exemple, 69003 Lyon, France",
      location: { lat: 45.76, lng: 4.85 },
    })
    expect(places).toHaveLength(16)
    expect(places.some((p) => p.name === 'Maison')).toBe(false)
  })

  it('maps Mapstr icons to categories and icons', () => {
    expect(byName(places, 'Le Musée')).toMatchObject({ category: 'food', icon: 'utensils' })
    expect(byName(places, "L'Artchimiste")).toMatchObject({ category: 'food', icon: 'beer' })
    expect(byName(places, 'TechNoir')).toMatchObject({ category: 'food', icon: 'beer' })
    // Fine grocery: Fourchette, but flagged since the icon is ambiguous.
    expect(byName(places, 'Lupo')).toMatchObject({
      category: 'food',
      icon: 'shopping-basket',
      needsReview: true,
    })
  })

  it('reads "À essayer" as a confirmed "to test" status', () => {
    const agastache = byName(places, 'Agastache Restaurant')
    expect(agastache.visited).toBe(false)
    expect(agastache.needsReview).toBe(false)
  })

  it('flags places without "À essayer" for review (unknown status)', () => {
    expect(byName(places, 'Cochon Iodé')).toMatchObject({ visited: false, needsReview: true })
  })

  it('drops the "Restaurant" and "À essayer" tags and deduplicates the rest', () => {
    const tagNames = plan.newTags.map((t) => t.name)
    expect(tagNames).not.toContain('Restaurant')
    expect(tagNames).not.toContain('À essayer')
    expect(tagNames).not.toContain('Maison')
    expect(tagNames.filter((n) => n === 'Bar')).toHaveLength(1)

    const agastache = byName(places, 'Agastache Restaurant')
    const bib = plan.newTags.find((t) => t.name === 'BIB')!
    expect(agastache.tagIds).toEqual([bib.id])
    expect(bib).toMatchObject({ category: 'food', color: '#dc1818' })
  })

  it('shares one tag between places', () => {
    const tapas = plan.newTags.find((t) => t.name === 'Tapas')!
    expect(byName(places, 'Cochon Iodé').tagIds).toContain(tapas.id)
    expect(byName(places, 'Béguin - Bar à manger').tagIds).toContain(tapas.id)
  })

  it('keeps the user comment as memo and marks the source', () => {
    expect(byName(places, 'Made In Berliner')).toMatchObject({ memo: 'kebab', source: 'mapstr' })
  })
})

describe('planMapstrImport with existing data', () => {
  it('reuses an existing tag with the same name, whatever the case', () => {
    const existing = createTag({ category: 'food', name: 'bouchon', color: '#000000' })
    const plan = planMapstrImport(sample, { places: [], tags: [existing] })
    expect(plan.newTags.some((t) => t.name === 'Bouchon')).toBe(false)
    expect(byName(plan.candidates.map((c) => c.place), 'Le Musée').tagIds).toContain(existing.id)
  })

  it('spots a place already known nearby', () => {
    const known = createPlace({
      category: 'food',
      name: 'Gojo',
      address: '327 Rue André Philip',
      location: { lat: 45.7522, lng: 4.8515 },
    })
    const plan = planMapstrImport(sample, { places: [known], tags: [] })
    const gojo = plan.candidates.find((c) => c.place.name.startsWith('Gojo'))!
    expect(gojo.duplicateOf?.id).toBe(known.id)
  })
})

describe('icon rules', () => {
  const feature = (icon: string, tags: string[] = []) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [4.83, 45.76] },
    properties: { name: `Lieu ${icon}`, icon, tags: tags.map((name) => ({ name })) },
  })
  const placeFor = (icon: string, tags?: string[]) =>
    planMapstrImport({ type: 'FeatureCollection', features: [feature(icon, tags)] }, empty)
      .candidates[0]!.place

  it('maps fast food to a burger', () => {
    expect(placeFor('fastfood')).toMatchObject({ category: 'food', icon: 'hamburger' })
  })

  it('keeps ambiguous icons in Fourchette, flagged for review', () => {
    expect(placeFor('nightclub', ['À essayer'])).toMatchObject({
      category: 'food',
      icon: 'disc-3',
      needsReview: true,
    })
    expect(placeFor('generic', ['À essayer'])).toMatchObject({
      category: 'food',
      icon: 'utensils',
      needsReview: true,
    })
  })

  it('sends shops to Flânerie, flagged for review', () => {
    expect(placeFor('shopping')).toMatchObject({
      category: 'stroll',
      icon: 'shopping-bag',
      needsReview: true,
    })
  })

  it('trusts the "Restaurant" tag over the icon', () => {
    expect(placeFor('shopping', ['Restaurant', 'À essayer'])).toMatchObject({
      category: 'food',
      icon: 'utensils',
      needsReview: false,
    })
  })
})

describe('planMapstrImport errors', () => {
  it('rejects a file that is not a FeatureCollection', () => {
    expect(() => planMapstrImport({ hello: 'world' }, empty)).toThrow(ImportError)
  })

  it('skips unreadable features with a warning', () => {
    const plan = planMapstrImport(
      { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'X' } }] },
      empty,
    )
    expect(plan.candidates).toHaveLength(0)
    expect(plan.warnings).toHaveLength(1)
  })
})

describe('resolveMapstrPlan', () => {
  const known = createPlace({
    category: 'food',
    name: 'Gojo',
    address: '327 Rue André Philip',
    location: { lat: 45.7522, lng: 4.8515 },
    memo: 'Conseillé par Julie',
  })
  const plan = planMapstrImport(sample, { places: [known], tags: [] })
  const gojo = plan.candidates.find((c) => c.place.name.startsWith('Gojo'))!.place
  const decide = (d: DuplicateDecision) => new Map([[gojo.id, d]])

  it('skips duplicates by default, and drops tags only they used', () => {
    const result = resolveMapstrPlan(plan)
    expect(result.places).toHaveLength(15)
    expect(result.tags.some((t) => t.name === 'Africain')).toBe(false)
  })

  it('keeps both on request', () => {
    expect(resolveMapstrPlan(plan, decide('keep-both')).places).toHaveLength(16)
  })

  it('merges tags into the existing place', () => {
    const result = resolveMapstrPlan(plan, decide('merge'))
    const merged = result.places.find((p) => p.id === known.id)!
    const africain = result.tags.find((t) => t.name === 'Africain')!
    expect(merged.tagIds).toContain(africain.id)
    expect(merged.memo).toBe('Conseillé par Julie')
    expect(merged.name).toBe('Gojo')
  })
})
