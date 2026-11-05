import { ref } from 'vue'
import { useToast } from '@/composables/useToast'
import type { Place } from '@/domain/models'
import { extractOsmDetails, mergeOsmDetails } from '@/domain/osm-details'
import { namesLookAlike } from '@/domain/places'
import { fetchOsmTags } from '@/services/osm-api'
import { nearbyPlaces } from '@/services/photon'
import { usePlacesStore } from '@/stores/places'

/**
 * "Compléter depuis OSM": adds the website, Instagram, phone and opening
 * hours found in OpenStreetMap, without overwriting anything.
 * Places imported from Mapstr have no OSM reference yet: the establishment
 * with a similar name at the same spot is looked up first.
 */
export function useOsmCompletion() {
  const places = usePlacesStore()
  const toast = useToast()
  const busy = ref(false)

  async function complete(place: Place): Promise<void> {
    busy.value = true
    try {
      let osmRef = place.osmRef
      if (!osmRef) {
        const candidates = await nearbyPlaces(place.location, { radiusMeters: 80 })
        osmRef = candidates.find((c) => namesLookAlike(c.name, place.name))?.osmRef
      }
      if (!osmRef) {
        toast.show('Ce lieu n’a pas été trouvé dans OpenStreetMap.', 4000)
        return
      }

      const tags = await fetchOsmTags(osmRef)
      if (!tags) {
        toast.show('Ce lieu n’existe plus dans OpenStreetMap.', 4000)
        return
      }

      const { patch, added } = mergeOsmDetails(place, extractOsmDetails(tags), osmRef)
      if (Object.keys(patch).length) await places.update(place.id, patch)
      toast.show(
        added.length ? `Ajouté depuis OSM : ${added.join(', ')}` : 'Rien de nouveau dans OpenStreetMap.',
        4000,
      )
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Erreur inattendue.', 4000)
    } finally {
      busy.value = false
    }
  }

  return { busy, complete }
}
