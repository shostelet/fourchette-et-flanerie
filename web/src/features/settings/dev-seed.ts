import { useHomeStore } from '@/stores/home'
import { usePlacesStore } from '@/stores/places'
import { useTagsStore } from '@/stores/tags'
import { useVisitsStore } from '@/stores/visits'

/** Dev action: adds a few fictitious places around Lyon to play with. */
export async function seedSampleData(): Promise<void> {
  const places = usePlacesStore()
  const tags = useTagsStore()
  const visits = useVisitsStore()
  const home = useHomeStore()

  if (!home.home) {
    await home.save({
      address: 'Place Bellecour, 69002 Lyon',
      location: { lat: 45.7578, lng: 4.832 },
    })
  }

  const bouchon = await tags.create({ category: 'food', name: 'Bouchon', color: '#995d2e' })
  const ramen = await tags.create({ category: 'food', name: 'Ramen', color: '#408078' })
  const deco = await tags.create({ category: 'stroll', name: 'Déco', color: '#7a4e6b' })

  const tested = await places.create({
    category: 'food',
    name: 'Exemple – Bouchon testé',
    address: 'Rue Mercière, 69002 Lyon',
    location: { lat: 45.7622, lng: 4.8323 },
    tagIds: [bouchon.id],
  })
  await visits.add({ placeId: tested.id, quality: 4, value: 3, comment: 'Très bonne quenelle.' })

  await places.create({
    category: 'food',
    name: 'Exemple – Ramen à tester',
    address: 'Rue de la République, 69002 Lyon',
    location: { lat: 45.7615, lng: 4.8358 },
    tagIds: [ramen.id],
    memo: 'Conseillé par un collègue',
  })

  await places.create({
    category: 'stroll',
    name: 'Exemple – Boutique déco',
    address: 'Rue Auguste Comte, 69002 Lyon',
    location: { lat: 45.7552, lng: 4.8291 },
    tagIds: [deco.id],
  })
}
