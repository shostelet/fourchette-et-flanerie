import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { setRepositories } from '@/data'
import { createMemoryRepositories } from '@/data/memory/memory-repositories'
import { usePlacesStore } from '../places'
import { useTagsStore } from '../tags'

const draft = {
  category: 'food' as const,
  name: 'CoCotto',
  address: '2 Rue Professeur Weill, 69006 Lyon',
  location: { lat: 45.7683769, lng: 4.8564468 },
}

beforeEach(() => {
  setRepositories(createMemoryRepositories())
  setActivePinia(createPinia())
})

describe('tags store: merge and move', () => {
  it('merges a tag into another one', async () => {
    const places = usePlacesStore()
    const tags = useTagsStore()
    const asiat = await tags.create({ category: 'food', name: 'Asiat', color: '#000000' })
    const asiatique = await tags.create({ category: 'food', name: 'Asiatique', color: '#d2cf6a' })
    const both = await places.create({ ...draft, tagIds: [asiat.id, asiatique.id] })
    const one = await places.create({ ...draft, name: 'MACHETE', tagIds: [asiat.id] })

    await tags.merge(asiat.id, asiatique.id)

    expect(tags.items.map((t) => t.name)).toEqual(['Asiatique'])
    expect(places.get(both.id)?.tagIds).toEqual([asiatique.id])
    expect(places.get(one.id)?.tagIds).toEqual([asiatique.id])
  })

  it('moves tags to another category, reusing or creating them', async () => {
    const tags = useTagsStore()
    const italienFood = await tags.create({ category: 'food', name: 'Italien', color: '#1ac7ea' })
    const italienStroll = await tags.create({ category: 'stroll', name: 'italien', color: '#000000' })
    const sandwich = await tags.create({ category: 'food', name: 'Sandwich', color: '#188517' })

    const moved = await tags.moveToCategory([italienFood.id, sandwich.id], 'stroll')

    expect(moved[0]).toBe(italienStroll.id)
    const newSandwich = tags.byId.get(moved[1]!)
    expect(newSandwich).toMatchObject({ category: 'stroll', name: 'Sandwich', color: '#188517' })
  })
})
