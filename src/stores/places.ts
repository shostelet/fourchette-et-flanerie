import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getRepositories } from '@/data'
import {
  createPlace,
  nowIso,
  softDelete,
  touch,
  type PlaceDraft,
  type PlacePatch,
} from '@/domain/entities'
import type { Category, Id, Place } from '@/domain/models'
import { isActive } from '@/domain/places'

export const usePlacesStore = defineStore('places', () => {
  const repositories = getRepositories()

  /** Every non-deleted place, closed ones included. */
  const items = ref<Place[]>([])
  const loaded = ref(false)

  const byId = computed(() => new Map(items.value.map((p) => [p.id, p])))
  const active = computed(() => items.value.filter(isActive))

  function activeIn(category: Category): Place[] {
    return active.value.filter((p) => p.category === category)
  }

  function get(id: Id): Place | undefined {
    return byId.value.get(id)
  }

  function requirePlace(id: Id): Place {
    const place = get(id)
    if (!place) throw new Error(`Unknown place: ${id}`)
    return place
  }

  async function load(): Promise<void> {
    items.value = await repositories.places.list()
    loaded.value = true
  }

  /** Mirrors a persisted place into the state. */
  function upsertLocal(place: Place): void {
    const index = items.value.findIndex((p) => p.id === place.id)
    if (place.deletedAt) {
      if (index >= 0) items.value.splice(index, 1)
    } else if (index >= 0) {
      items.value[index] = place
    } else {
      items.value.push(place)
    }
  }

  async function persist(place: Place): Promise<Place> {
    await repositories.places.save(place)
    upsertLocal(place)
    return place
  }

  async function create(draft: PlaceDraft): Promise<Place> {
    return persist(createPlace(draft))
  }

  async function update(id: Id, patch: PlacePatch): Promise<Place> {
    const current = requirePlace(id)
    return persist(touch({ ...current, ...patch }))
  }

  async function setVisited(id: Id, visited: boolean): Promise<Place> {
    return update(id, { visited })
  }

  async function markClosed(id: Id): Promise<Place> {
    return update(id, { closedAt: nowIso() })
  }

  async function reopen(id: Id): Promise<Place> {
    return update(id, { closedAt: undefined })
  }

  /** Soft delete, for input mistakes. Use markClosed for closed places. */
  async function remove(id: Id): Promise<void> {
    await persist(softDelete(requirePlace(id)))
  }

  /** Called when a tag is deleted. */
  async function removeTagEverywhere(tagId: Id): Promise<void> {
    const changed = items.value
      .filter((p) => p.tagIds.includes(tagId))
      .map((p) => touch({ ...p, tagIds: p.tagIds.filter((id) => id !== tagId) }))
    if (changed.length === 0) return
    await repositories.places.saveMany(changed)
    changed.forEach(upsertLocal)
  }

  /** Bulk insert (imports). */
  async function saveMany(places: readonly Place[]): Promise<void> {
    await repositories.places.saveMany(places)
    places.forEach(upsertLocal)
  }

  function $reset(): void {
    items.value = []
    loaded.value = false
  }

  return {
    items,
    loaded,
    byId,
    active,
    activeIn,
    get,
    load,
    create,
    update,
    setVisited,
    markClosed,
    reopen,
    remove,
    removeTagEverywhere,
    saveMany,
    $reset,
  }
})
