import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getRepositories } from '@/data'
import { createTag, softDelete, touch, type TagDraft, type TagPatch } from '@/domain/entities'
import type { Category, Id, Tag } from '@/domain/models'
import { mergeTagIds } from '@/domain/tags'
import { compareText, normalizeText } from '@/domain/text'
import { usePlacesStore } from './places'

export const useTagsStore = defineStore('tags', () => {
  const repositories = getRepositories()
  const places = usePlacesStore()

  const items = ref<Tag[]>([])
  const loaded = ref(false)

  const byId = computed(() => new Map(items.value.map((t) => [t.id, t])))

  /** Tags of a category, alphabetically. */
  function forCategory(category: Category): Tag[] {
    return items.value
      .filter((t) => t.category === category)
      .sort((a, b) => compareText(a.name, b.name))
  }

  /** Case- and accent-insensitive lookup, to avoid duplicate tags. */
  function findByName(category: Category, name: string): Tag | undefined {
    const wanted = normalizeText(name)
    return items.value.find((t) => t.category === category && normalizeText(t.name) === wanted)
  }

  async function load(): Promise<void> {
    items.value = await repositories.tags.list()
    loaded.value = true
  }

  function upsertLocal(tag: Tag): void {
    const index = items.value.findIndex((t) => t.id === tag.id)
    if (tag.deletedAt) {
      if (index >= 0) items.value.splice(index, 1)
    } else if (index >= 0) {
      items.value[index] = tag
    } else {
      items.value.push(tag)
    }
  }

  async function persist(tag: Tag): Promise<Tag> {
    await repositories.tags.save(tag)
    upsertLocal(tag)
    return tag
  }

  /** Returns the existing tag when one with the same name already exists. */
  async function create(draft: TagDraft): Promise<Tag> {
    return findByName(draft.category, draft.name) ?? persist(createTag(draft))
  }

  async function update(id: Id, patch: TagPatch): Promise<Tag> {
    const current = byId.value.get(id)
    if (!current) throw new Error(`Unknown tag: ${id}`)
    const name = patch.name?.trim()
    return persist(touch({ ...current, ...patch, ...(name ? { name } : {}) }))
  }

  /** Soft delete, and detach the tag from every place. */
  async function remove(id: Id): Promise<void> {
    const current = byId.value.get(id)
    if (!current) return
    await persist(softDelete(current))
    await places.removeTagEverywhere(id)
  }

  /** Moves every place from `sourceId` to `targetId`, then deletes the source. */
  async function merge(sourceId: Id, targetId: Id): Promise<void> {
    const source = byId.value.get(sourceId)
    if (!source || sourceId === targetId) return
    for (const place of places.items) {
      const tagIds = mergeTagIds(place.tagIds, sourceId, targetId)
      if (tagIds) await places.update(place.id, { tagIds })
    }
    await persist(softDelete(source))
  }

  /**
   * Tags must belong to their place's category: each tag of another category
   * is replaced by the tag with the same name in `category` (created if
   * needed, with the same color and icon).
   */
  async function moveToCategory(tagIds: readonly Id[], category: Category): Promise<Id[]> {
    const result: Id[] = []
    for (const id of tagIds) {
      const tag = byId.value.get(id)
      if (!tag) continue
      if (tag.category === category) result.push(id)
      else {
        const moved = await create({ category, name: tag.name, color: tag.color, icon: tag.icon })
        result.push(moved.id)
      }
    }
    return [...new Set(result)]
  }

  /** Bulk insert (imports). */
  async function saveMany(tags: readonly Tag[]): Promise<void> {
    await repositories.tags.saveMany(tags)
    tags.forEach(upsertLocal)
  }

  function $reset(): void {
    items.value = []
    loaded.value = false
  }

  return {
    items,
    loaded,
    byId,
    forCategory,
    findByName,
    load,
    create,
    update,
    remove,
    merge,
    moveToCategory,
    saveMany,
    $reset,
  }
})
