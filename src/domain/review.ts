import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { nowIso, type PlacePatch } from './entities'
import type { Category, Id, IsoDateTime, Place } from './models'
import { isActive } from './places'
import { compareText } from './text'

/**
 * Review: going through the places flagged `needsReview` (after an import)
 * to confirm their status, category, icon and tags.
 */
export type ReviewDecision = 'visited' | 'to-test' | 'closed' | 'skip'

/** Quick fixes made on the review card. */
export interface ReviewCorrections {
  category: Category
  icon: string
  tagIds: Id[]
}

export function correctionsFor(place: Place): ReviewCorrections {
  return { category: place.category, icon: place.icon, tagIds: [...place.tagIds] }
}

/**
 * Switching category resets the icon to the new category's default.
 * Tags are kept: they are moved to the new category when saving.
 */
export function withCategory(
  corrections: ReviewCorrections,
  category: Category,
): ReviewCorrections {
  if (corrections.category === category) return corrections
  return { ...corrections, category, icon: CATEGORY_DEFINITIONS[category].defaultPlaceIcon }
}

export function toggleTag(corrections: ReviewCorrections, tagId: Id): ReviewCorrections {
  const tagIds = corrections.tagIds.includes(tagId)
    ? corrections.tagIds.filter((id) => id !== tagId)
    : [...corrections.tagIds, tagId]
  return { ...corrections, tagIds }
}

/** Changes to save for a decision. "Skip" saves the corrections but keeps the flag. */
export function reviewPatch(
  decision: ReviewDecision,
  corrections: ReviewCorrections,
  now: IsoDateTime = nowIso(),
): PlacePatch {
  const base: PlacePatch = {
    category: corrections.category,
    icon: corrections.icon,
    tagIds: [...new Set(corrections.tagIds)],
  }
  switch (decision) {
    case 'visited':
      return { ...base, visited: true, needsReview: false }
    case 'to-test':
      return { ...base, visited: false, needsReview: false }
    case 'closed':
      return { ...base, closedAt: now, needsReview: false }
    case 'skip':
      return base
  }
}

export function needsReview(place: Place): boolean {
  return isActive(place) && place.needsReview
}

/**
 * Places left to review, in import order (then by name).
 * Places skipped during this session go to the end of the queue.
 */
export function reviewQueue(places: readonly Place[], skipped: ReadonlySet<Id>): Place[] {
  const pending = places
    .filter(needsReview)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || compareText(a.name, b.name))
  return [
    ...pending.filter((p) => !skipped.has(p.id)),
    ...pending.filter((p) => skipped.has(p.id)),
  ]
}
