import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getRepositories } from '@/data'
import { createTag, softDelete, touch, type TagDraft, type TagPatch } from '@/domain/entities'
import type { Category, Id, Tag } from '@/domain/models'
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
    return persist(touch({ ...current, ...patch }))
  }

  /** Soft delete, and detach the tag from every place. */
  async function remove(id: Id): Promise<void> {
    const current = byId.value.get(id)
    if (!current) return
    await persist(softDelete(current))
    await places.removeTagEverywhere(id)
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

  return { items, loaded, byId, forCategory, findByName, load, create, update, remove, saveMany, $reset }
})
