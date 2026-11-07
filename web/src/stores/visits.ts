import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getRepositories } from '@/data'
import { createVisit, touch, type VisitDraft, type VisitPatch } from '@/domain/entities'
import type { Id, Visit } from '@/domain/models'
import { summarizeVisits, type PlaceRatings } from '@/domain/ratings'
import { sortVisits } from '@/domain/visits'
import { usePlacesStore } from './places'

export const useVisitsStore = defineStore('visits', () => {
  const repositories = getRepositories()
  const places = usePlacesStore()

  const items = ref<Visit[]>([])
  const loaded = ref(false)

  /** Visits grouped by place, most recent first. */
  const byPlace = computed(() => {
    const groups = new Map<Id, Visit[]>()
    for (const visit of items.value) {
      const group = groups.get(visit.placeId)
      if (group) group.push(visit)
      else groups.set(visit.placeId, [visit])
    }
    for (const [placeId, group] of groups) groups.set(placeId, sortVisits(group))
    return groups
  })

  function forPlace(placeId: Id): Visit[] {
    return byPlace.value.get(placeId) ?? []
  }

  function ratingsFor(placeId: Id): PlaceRatings {
    return summarizeVisits(forPlace(placeId))
  }

  async function load(): Promise<void> {
    items.value = await repositories.visits.list()
    loaded.value = true
  }

  function upsertLocal(visit: Visit): void {
    const index = items.value.findIndex((v) => v.id === visit.id)
    if (index >= 0) items.value[index] = visit
    else items.value.push(visit)
  }

  /** Adding a visit also marks the place as visited. */
  async function add(draft: VisitDraft): Promise<Visit> {
    const visit = createVisit(draft)
    await repositories.visits.save(visit)
    upsertLocal(visit)
    if (places.get(draft.placeId)?.visited === false) {
      await places.setVisited(draft.placeId, true)
    }
    return visit
  }

  async function update(id: Id, patch: VisitPatch): Promise<Visit> {
    const current = items.value.find((v) => v.id === id)
    if (!current) throw new Error(`Unknown visit: ${id}`)
    const visit = touch({ ...current, ...patch })
    await repositories.visits.save(visit)
    upsertLocal(visit)
    return visit
  }

  /** Bulk insert (imports). */
  async function saveMany(visits: readonly Visit[]): Promise<void> {
    await repositories.visits.saveMany(visits)
    visits.forEach(upsertLocal)
  }

  function $reset(): void {
    items.value = []
    loaded.value = false
  }

  return { items, loaded, byPlace, forPlace, ratingsFor, load, add, update, saveMany, $reset }
})
