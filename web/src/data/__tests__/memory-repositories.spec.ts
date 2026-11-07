import { describe, expect, it } from 'vitest'
import { createPlace, softDelete } from '@/domain/entities'
import { createMemoryRepositories } from '../memory/memory-repositories'
import { clearAllData } from '../repositories'

const place = () =>
  createPlace({
    category: 'food',
    name: 'Fufu Ramen',
    address: "36 Rue de l'Arbre Sec, 69001 Lyon",
    location: { lat: 45.7665844, lng: 4.8371586 },
  })

describe('memory repositories', () => {
  it('saves, lists and hides soft-deleted entities', async () => {
    const repos = createMemoryRepositories()
    const a = place()
    const b = place()
    await repos.places.saveMany([a, b])
    await repos.places.save(softDelete(b))

    expect((await repos.places.list()).map((p) => p.id)).toEqual([a.id])
    expect(await repos.places.list({ includeDeleted: true })).toHaveLength(2)
    expect(await repos.places.purgeDeleted()).toBe(1)
    expect(await repos.places.list({ includeDeleted: true })).toHaveLength(1)
  })

  it('returns copies, so callers cannot mutate storage', async () => {
    const repos = createMemoryRepositories()
    const a = place()
    await repos.places.save(a)
    const loaded = await repos.places.get(a.id)
    loaded!.name = 'Changed'
    expect((await repos.places.get(a.id))?.name).toBe('Fufu Ramen')
  })

  it('wipes everything', async () => {
    const repos = createMemoryRepositories()
    await repos.places.save(place())
    await repos.settings.saveHome({ address: 'x', location: { lat: 0, lng: 0 } })
    await clearAllData(repos)
    expect(await repos.places.list()).toEqual([])
    expect(await repos.settings.getHome()).toBeUndefined()
  })
})
