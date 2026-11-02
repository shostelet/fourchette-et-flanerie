<script setup lang="ts">
import { ChevronRight, Plus } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import SheetPanel from '@/components/common/SheetPanel.vue'
import TagChip from '@/components/common/TagChip.vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { useToast } from '@/composables/useToast'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { nextTagColor } from '@/config/tag-colors'
import { pluralize } from '@/domain/format'
import { CATEGORIES, type Category, type Id } from '@/domain/models'
import { usePlacesStore } from '@/stores/places'
import { usePreferencesStore } from '@/stores/preferences'
import { useTagsStore } from '@/stores/tags'
import type { TagFields } from './tag-fields'
import TagEditor from './TagEditor.vue'

/** Full management of tags: create, rename, recolor, icon, merge, delete. */
const close = useCloseOverlay()
const toast = useToast()
const tags = useTagsStore()
const places = usePlacesStore()
const { activeCategory } = storeToRefs(usePreferencesStore())

const category = ref<Category>(activeCategory.value)
const editingId = ref<Id>()
const busy = ref(false)

const list = computed(() => tags.forCategory(category.value))

/** Number of places using each tag (deleted places excluded, closed ones included). */
const usage = computed(() => {
  const counts = new Map<Id, number>()
  for (const place of places.items) {
    for (const id of place.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
})

function selectCategory(value: Category): void {
  category.value = value
  editingId.value = undefined
}

async function run(action: () => Promise<void>): Promise<void> {
  busy.value = true
  try {
    await action()
  } finally {
    busy.value = false
  }
}

function createTag(): void {
  void run(async () => {
    let name = 'Nouveau tag'
    for (let i = 2; tags.findByName(category.value, name); i++) name = `Nouveau tag ${i}`
    const tag = await tags.create({ category: category.value, name, color: nextTagColor(tags.items) })
    editingId.value = tag.id
  })
}

function save(id: Id, fields: TagFields): void {
  const homonym = tags.findByName(category.value, fields.name)
  if (homonym && homonym.id !== id) {
    // Same name as another tag: offer to merge them.
    const confirmed = window.confirm(
      `Le tag « ${homonym.name} » existe déjà. Fusionner les deux ? Les lieux concernés n’auront plus que « ${homonym.name} ».`,
    )
    if (confirmed) {
      void run(async () => {
        await tags.merge(id, homonym.id)
        editingId.value = undefined
        toast.show('Tags fusionnés')
      })
    }
    return
  }
  void run(async () => {
    await tags.update(id, fields)
    editingId.value = undefined
  })
}

function remove(id: Id): void {
  const tag = tags.byId.get(id)
  const count = usage.value.get(id) ?? 0
  const detail = count ? ` Il sera retiré de ${pluralize(count, 'lieu', 'lieux')}.` : ''
  if (tag && window.confirm(`Supprimer le tag « ${tag.name} » ?${detail}`)) {
    void run(async () => {
      await tags.remove(id)
      editingId.value = undefined
    })
  }
}
</script>

<template>
  <SheetPanel title="Gérer les tags" :data-category="category" @close="close">
    <div class="mx-auto max-w-xl space-y-4">
      <div role="tablist" aria-label="Catégorie" class="flex rounded-full bg-muted p-1">
        <button
          v-for="id in CATEGORIES"
          :key="id"
          type="button"
          role="tab"
          :aria-selected="category === id"
          :data-category="id"
          class="flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            category === id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="selectCategory(id)"
        >
          <AppIcon :name="CATEGORY_DEFINITIONS[id].icon" class="size-4" />
          {{ CATEGORY_DEFINITIONS[id].label }}
        </button>
      </div>

      <Button variant="outline" class="w-full" :disabled="busy" @click="createTag">
        <Plus />
        Nouveau tag
      </Button>

      <ul class="space-y-1">
        <li v-for="tag in list" :key="tag.id">
          <TagEditor
            v-if="editingId === tag.id"
            :tag="tag"
            :busy="busy"
            @save="save(tag.id, $event)"
            @delete="remove(tag.id)"
            @cancel="editingId = undefined"
          />
          <button
            v-else
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
            @click="editingId = tag.id"
          >
            <TagChip :tag="tag" class="flex-1" />
            <span class="text-sm text-muted-foreground">
              {{ pluralize(usage.get(tag.id) ?? 0, 'lieu', 'lieux') }}
            </span>
            <ChevronRight class="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p v-if="!list.length" class="text-center text-sm text-muted-foreground">
        Aucun tag dans {{ CATEGORY_DEFINITIONS[category].label }}.
      </p>
    </div>
  </SheetPanel>
</template>
