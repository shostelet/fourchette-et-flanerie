import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  countActiveFilters,
  DEFAULT_FILTERS,
  filterPlaces,
  type PlaceFilters,
  type PlaceSort,
  type StatusFilter,
} from '@/domain/filters'
import type { Id } from '@/domain/models'
import { readJson, writeJson } from '@/utils/local-storage'
import { usePlacesStore } from './places'
import { usePreferencesStore } from './preferences'
import { useTagsStore } from './tags'

const SORTS: readonly PlaceSort[] = ['distance', 'name', 'recent', 'quality', 'value']
const STATUSES: readonly StatusFilter[] = ['all', 'to-test', 'visited']

/**
 * Filters shared by the map and the list (device preference, kept across
 * launches). A badge on the filter button shows when some are active, so
 * places never seem to have disappeared.
 */
export const useFiltersStore = defineStore('filters', () => {
  const places = usePlacesStore()
  const tags = useTagsStore()
  const { activeCategory } = storeToRefs(usePreferencesStore())

  const stored = readJson<Partial<PlaceFilters>>('filters', {})
  const status = ref<StatusFilter>(
    STATUSES.includes(stored.status as StatusFilter) ? (stored.status as StatusFilter) : 'all',
  )
  const showClosed = ref(stored.showClosed === true)
  /** Selected tags, of both categories (only those of the active one apply). */
  const tagIds = ref<Id[]>(Array.isArray(stored.tagIds) ? stored.tagIds.filter((id) => typeof id === 'string') : [])

  /** Filters sheet open over the base view (map or list): follows view switches. */
  const panelOpen = ref(false)

  const storedSort = readJson<string>('listSort', 'distance')
  const sort = ref<PlaceSort>(SORTS.includes(storedSort as PlaceSort) ? (storedSort as PlaceSort) : 'distance')

  watch([status, showClosed, tagIds], () =>
    writeJson('filters', { status: status.value, showClosed: showClosed.value, tagIds: tagIds.value }),
  )
  watch(sort, (value) => writeJson('listSort', value))

  /** Filters for the active category (tags of the other category ignored, deleted tags dropped). */
  const current = computed<PlaceFilters>(() => ({
    status: status.value,
    showClosed: showClosed.value,
    tagIds: tagIds.value.filter((id) => tags.byId.get(id)?.category === activeCategory.value),
  }))

  const activeCount = computed(() => countActiveFilters(current.value))

  /** Places shown on the map and in the list. */
  const visiblePlaces = computed(() => filterPlaces(places.items, activeCategory.value, current.value))

  function toggleTag(id: Id): void {
    tagIds.value = tagIds.value.includes(id) ? tagIds.value.filter((t) => t !== id) : [...tagIds.value, id]
  }

  /** Resets the filters of the active category (tags of the other one are kept). */
  function reset(): void {
    status.value = DEFAULT_FILTERS.status
    showClosed.value = DEFAULT_FILTERS.showClosed
    tagIds.value = tagIds.value.filter((id) => tags.byId.get(id)?.category !== activeCategory.value)
  }

  return {
    status,
    showClosed,
    tagIds,
    sort,
    panelOpen,
    current,
    activeCount,
    visiblePlaces,
    toggleTag,
    reset,
  }
})
