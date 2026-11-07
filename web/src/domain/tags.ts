import type { Id, Tag } from './models'
import { compareText, normalizeText } from './text'

/**
 * Replaces `sourceId` by `targetId` in a list of tag ids, without duplicates.
 * Returns undefined when the list doesn't contain the source (nothing to change).
 */
export function mergeTagIds(tagIds: readonly Id[], sourceId: Id, targetId: Id): Id[] | undefined {
  if (!tagIds.includes(sourceId)) return undefined
  return [...new Set(tagIds.map((id) => (id === sourceId ? targetId : id)))]
}

export type TagSort = 'name' | 'usage'

/**
 * Tags matching a query (case and accents ignored), sorted A→Z or by number
 * of places (most used first, then A→Z).
 */
export function filterAndSortTags(
  tags: readonly Tag[],
  query: string,
  sort: TagSort,
  usage: ReadonlyMap<Id, number>,
): Tag[] {
  const wanted = normalizeText(query)
  const count = (tag: Tag) => usage.get(tag.id) ?? 0
  return tags
    .filter((tag) => !wanted || normalizeText(tag.name).includes(wanted))
    .sort((a, b) => (sort === 'usage' ? count(b) - count(a) : 0) || compareText(a.name, b.name))
}
