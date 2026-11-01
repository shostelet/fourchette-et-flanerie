import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { setRepositories } from '@/data'
import { createMemoryRepositories } from '@/data/memory/memory-repositories'
import type { Repositories } from '@/data/repositories'
import { usePlacesStore } from '../places'
import { useTagsStore } from '../tags'
import { useVisitsStore } from '../visits'

const draft = {
  category: 'food' as const,
  name: 'Monsieur P',
  address: '8 Place des Célestins, 69002 Lyon',
  location: { lat: 45.7595294, lng: 4.8316954 },
}

let repos: Repositories

beforeEach(() => {
  repos = createMemoryRepositories()
  setRepositories(repos)
  setActivePinia(createPinia())
})

describe('places store', () => {
  it('creates, persists and reloads a place', async () => {
    const places = usePlacesStore()
    const created = await places.create(draft)
    expect(places.active).toHaveLength(1)

    setActivePinia(createPinia())
    const reloaded = usePlacesStore()
    await reloaded.load()
    expect(reloaded.get(created.id)?.name).toBe('Monsieur P')
  })

  it('hides closed places from active ones but keeps them', async () => {
    const places = usePlacesStore()
    const created = await places.create(draft)
    await places.markClosed(created.id)
    expect(places.active).toHaveLength(0)
    expect(places.items).toHaveLength(1)
    await places.reopen(created.id)
    expect(places.active).toHaveLength(1)
  })
})

describe('visits store', () => {
  it('marks the place as visited when a visit is added', async () => {
    const places = usePlacesStore()
    const visits = useVisitsStore()
    const created = await places.create(draft)

    await visits.add({ placeId: created.id, quality: 5, value: 3 })
    expect(places.get(created.id)?.visited).toBe(true)
    expect(visits.ratingsFor(created.id).quality?.average).toBe(5)
  })
})

describe('tags store', () => {
  it('reuses an existing tag with the same name', async () => {
    const tags = useTagsStore()
    const a = await tags.create({ category: 'food', name: 'Bouchon', color: '#995d2e' })
    const b = await tags.create({ category: 'food', name: 'bouchon ', color: '#000000' })
    expect(b.id).toBe(a.id)
  })

  it('detaches a deleted tag from places', async () => {
    const places = usePlacesStore()
    const tags = useTagsStore()
    const tag = await tags.create({ category: 'food', name: 'BIB', color: '#dc1818' })
    const created = await places.create({ ...draft, tagIds: [tag.id] })

    await tags.remove(tag.id)
    expect(tags.items).toHaveLength(0)
    expect(places.get(created.id)?.tagIds).toEqual([])
    expect((await repos.places.get(created.id))?.tagIds).toEqual([])
  })
})
