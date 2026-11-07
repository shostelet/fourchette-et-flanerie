import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import { excludeKnown, rankResults, type GeoResult } from '@/domain/geocoding'
import type { GeoPoint, Place } from '@/domain/models'
import { distanceMeters, matchesQuery } from '@/domain/places'
import { normalizeText } from '@/domain/text'
import { useMapController } from '@/features/map/map-controller'
import { searchPlaces } from '@/services/photon'
import { usePlacesStore } from './places'
import { usePreferencesStore } from './preferences'
import { useTagsStore } from './tags'

const MAX_KNOWN_RESULTS = 30

/**
 * Search bar state: saved places (instant, local) and new addresses
 * (Photon, around the map center), without duplicates between the two.
 */
export const useSearchStore = defineStore('search', () => {
  const places = usePlacesStore()
  const tags = useTagsStore()
  const { activeCategory } = storeToRefs(usePreferencesStore())
  const { center } = useMapController()

  const query = ref('')
  /** Map center when the search ran: results are around it, distances from it. */
  const origin = shallowRef<GeoPoint>()

  /** A new address picked in the results, waiting for the "add a place" form. */
  const pendingResult = shallowRef<GeoResult>()
  /** A name typed in the search with no matching result: a place created by hand. */
  const pendingName = ref<string>()

  const known = computed<Place[]>(() => {
    if (!normalizeText(query.value)) return []
    const from = origin.value ?? center()
    return places
      .activeIn(activeCategory.value)
      .filter((p) => matchesQuery(p, query.value, tags.byId))
      .sort((a, b) => (from ? distanceMeters(from, a.location) - distanceMeters(from, b.location) : 0))
      .slice(0, MAX_KNOWN_RESULTS)
  })

  const remote = useDebouncedSearch(query, (value, signal) => {
    origin.value = center()
    return searchPlaces(value, { near: origin.value, signal })
  })

  const newResults = computed(() =>
    rankResults(excludeKnown(remote.results.value, places.items), activeCategory.value),
  )

  function distanceTo(point: GeoPoint): number | undefined {
    const from = origin.value ?? center()
    return from ? distanceMeters(from, point) : undefined
  }

  function clear(): void {
    query.value = ''
    remote.cancel()
  }

  /** Hands a result over to the form, which takes it once. */
  function takePendingResult(): GeoResult | undefined {
    const result = pendingResult.value
    pendingResult.value = undefined
    return result
  }

  /** Hands the typed name over to the form, which takes it once. */
  function takePendingName(): string | undefined {
    const name = pendingName.value
    pendingName.value = undefined
    return name
  }

  return {
    query,
    known,
    newResults,
    status: remote.status,
    error: remote.error,
    retry: remote.retry,
    pendingResult,
    pendingName,
    distanceTo,
    clear,
    takePendingResult,
    takePendingName,
  }
})
