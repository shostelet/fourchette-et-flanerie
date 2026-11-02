import type { Id } from './models'

/**
 * Replaces `sourceId` by `targetId` in a list of tag ids, without duplicates.
 * Returns undefined when the list doesn't contain the source (nothing to change).
 */
export function mergeTagIds(tagIds: readonly Id[], sourceId: Id, targetId: Id): Id[] | undefined {
  if (!tagIds.includes(sourceId)) return undefined
  return [...new Set(tagIds.map((id) => (id === sourceId ? targetId : id)))]
}
