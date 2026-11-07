import { computed, ref } from 'vue'
import { mergeIntoExisting } from '@/domain/import-export/mapstr'
import type { Id, Place, Rating } from '@/domain/models'
import { reviewPatch, reviewQueue, type ReviewCorrections, type ReviewDecision } from '@/domain/review'
import { usePlacesStore } from '@/stores/places'
import { useTagsStore } from '@/stores/tags'
import { useVisitsStore } from '@/stores/visits'

export interface QuickVisit {
  quality?: Rating
  value?: Rating
  comment?: string
}

/** State of one review session: the queue, the progress, and the decisions. */
export function useReviewSession() {
  const places = usePlacesStore()
  const visits = useVisitsStore()
  const tags = useTagsStore()

  /** Places skipped during this session (not persisted: they come back next time). */
  const skipped = ref(new Set<Id>())

  const queue = computed(() => reviewQueue(places.items, skipped.value))
  const current = computed(() => queue.value[0])

  /** Snapshot taken at the start, for a stable "12 / 128" counter. */
  const total = ref(queue.value.length)
  const remaining = computed(() => queue.value.length)
  const reviewedCount = computed(() => total.value - remaining.value)
  const onlySkippedLeft = computed(
    () => remaining.value > 0 && queue.value.every((p) => skipped.value.has(p.id)),
  )

  async function decide(
    decision: ReviewDecision,
    corrections: ReviewCorrections,
    visit: QuickVisit = {},
  ): Promise<void> {
    const place = current.value
    if (!place) return

    const tagIds = await tags.moveToCategory(corrections.tagIds, corrections.category)
    await places.update(place.id, reviewPatch(decision, { ...corrections, tagIds }))

    const hasVisitContent = visit.quality || visit.value || visit.comment?.trim()
    if (decision === 'visited' && hasVisitContent) {
      // Old visit: the date is unknown.
      await visits.add({ placeId: place.id, ...visit })
    }
    if (decision === 'skip') skipped.value.add(place.id)
  }

  /**
   * The current place is a duplicate of `target`: its tags and memo are
   * added to the target, then it is deleted (soft delete).
   */
  async function mergeInto(target: Place, corrections: ReviewCorrections): Promise<void> {
    const place = current.value
    if (!place || place.id === target.id) return

    const tagIds = await tags.moveToCategory(corrections.tagIds, target.category)
    const merged = mergeIntoExisting(target, { ...place, tagIds })
    await places.update(target.id, {
      tagIds: merged.tagIds,
      memo: merged.memo,
      visited: target.visited || place.visited,
    })
    await places.remove(place.id)
  }

  /** Goes through the skipped places again. */
  function retrySkipped(): void {
    skipped.value.clear()
  }

  return {
    current,
    total,
    remaining,
    reviewedCount,
    onlySkippedLeft,
    decide,
    mergeInto,
    retrySkipped,
  }
}
