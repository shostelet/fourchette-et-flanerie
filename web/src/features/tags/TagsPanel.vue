<script setup lang="ts">
import { ArrowDown10, ArrowDownAZ, Pencil, Plus, Search, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import SheetPanel from '@/components/common/SheetPanel.vue'
import TagChip from '@/components/common/TagChip.vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { useToast } from '@/composables/useToast'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { nextTagColor } from '@/config/tag-colors'
import { pluralize } from '@/domain/format'
import type { Id } from '@/domain/models'
import { filterAndSortTags, type TagSort } from '@/domain/tags'
import { usePlacesStore } from '@/stores/places'
import { usePreferencesStore } from '@/stores/preferences'
import { useTagsStore } from '@/stores/tags'
import { readJson, writeJson } from '@/utils/local-storage'
import type { TagFields } from './tag-fields'
import TagEditor from './TagEditor.vue'

/**
 * Tags of the active category (switched with the app header): search, sort,
 * create, rename, recolor, icon, merge, delete.
 */
const close = useCloseOverlay()
const toast = useToast()
const tags = useTagsStore()
const places = usePlacesStore()
const { activeCategory } = storeToRefs(usePreferencesStore())

const query = ref('')
const sort = ref<TagSort>(readJson<string>('tagSort', 'name') === 'usage' ? 'usage' : 'name')
watch(sort, (value) => writeJson('tagSort', value))

/** Tag being edited, or 'new' for the creation form (shown on top, saved only on "Créer"). */
const editing = ref<Id | 'new'>()
const newTagColor = ref('')
const busy = ref(false)

// Switching category in the header closes any open editor.
watch(activeCategory, () => (editing.value = undefined))

/** Number of places using each tag (deleted places excluded, closed ones included). */
const usage = computed(() => {
  const counts = new Map<Id, number>()
  for (const place of places.items) {
    for (const id of place.tagIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
})

const list = computed(() =>
  filterAndSortTags(tags.forCategory(activeCategory.value), query.value, sort.value, usage.value),
)
const categoryLabel = computed(() => CATEGORY_DEFINITIONS[activeCategory.value].label)

async function run(action: () => Promise<void>): Promise<void> {
  busy.value = true
  try {
    await action()
  } finally {
    busy.value = false
  }
}

function startCreating(): void {
  newTagColor.value = nextTagColor(tags.items)
  editing.value = 'new'
}

function create(fields: TagFields): void {
  if (tags.findByName(activeCategory.value, fields.name)) {
    window.alert(`Le tag « ${fields.name} » existe déjà.`)
    return
  }
  void run(async () => {
    await tags.create({ category: activeCategory.value, ...fields })
    editing.value = undefined
    toast.show('Tag créé')
  })
}

function save(id: Id, fields: TagFields): void {
  const homonym = tags.findByName(activeCategory.value, fields.name)
  if (homonym && homonym.id !== id) {
    // Same name as another tag: offer to merge them.
    const confirmed = window.confirm(
      `Le tag « ${homonym.name} » existe déjà. Fusionner les deux ? Les lieux concernés n’auront plus que « ${homonym.name} ».`,
    )
    if (confirmed) {
      void run(async () => {
        await tags.merge(id, homonym.id)
        editing.value = undefined
        toast.show('Tags fusionnés')
      })
    }
    return
  }
  void run(async () => {
    await tags.update(id, fields)
    editing.value = undefined
  })
}

function remove(id: Id): void {
  const tag = tags.byId.get(id)
  const count = usage.value.get(id) ?? 0
  const detail = count ? ` Il sera retiré de ${pluralize(count, 'lieu', 'lieux')}.` : ''
  if (tag && window.confirm(`Supprimer le tag « ${tag.name} » ?${detail}`)) {
    void run(async () => {
      await tags.remove(id)
      editing.value = undefined
    })
  }
}
</script>

<template>
  <SheetPanel :title="`Tags ${categoryLabel}`" @close="close">
    <div class="mx-auto max-w-xl space-y-3">
      <!-- Search + sort -->
      <div class="flex gap-2">
        <label class="relative flex flex-1 items-center">
          <span class="sr-only">Rechercher un tag</span>
          <Search class="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
          <input
            v-model="query"
            type="search"
            autocomplete="off"
            placeholder="Rechercher un tag…"
            class="h-10 w-full rounded-full border border-input bg-background pr-9 pl-9 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            v-if="query"
            type="button"
            aria-label="Effacer la recherche"
            class="absolute right-2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            @click="query = ''"
          >
            <X class="size-4" />
          </button>
        </label>
        <Button
          variant="outline"
          class="shrink-0 rounded-full"
          :aria-label="sort === 'name' ? 'Trier par nombre de lieux' : 'Trier par ordre alphabétique'"
          :title="sort === 'name' ? 'Ordre alphabétique (A → Z)' : 'Nombre de lieux (9 → 0)'"
          @click="sort = sort === 'name' ? 'usage' : 'name'"
        >
          <ArrowDownAZ v-if="sort === 'name'" />
          <ArrowDown10 v-else />
          {{ sort === 'name' ? 'A-Z' : '9-0' }}
        </Button>
      </div>

      <!-- Creation form, always on top until saved or cancelled -->
      <TagEditor
        v-if="editing === 'new'"
        :initial="{ name: '', color: newTagColor }"
        is-new
        :busy="busy"
        @save="create"
        @cancel="editing = undefined"
      />
      <Button v-else variant="outline" class="w-full" :disabled="busy" @click="startCreating">
        <Plus />
        Nouveau tag
      </Button>

      <ul class="space-y-1">
        <li v-for="tag in list" :key="tag.id">
          <TagEditor
            v-if="editing === tag.id"
            :initial="tag"
            :busy="busy"
            @save="save(tag.id, $event)"
            @delete="remove(tag.id)"
            @cancel="editing = undefined"
          />
          <button
            v-else
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent"
            :aria-label="`Modifier le tag ${tag.name}`"
            @click="editing = tag.id"
          >
            <TagChip :tag="tag" class="flex-1" />
            <span class="text-sm text-muted-foreground">
              {{ pluralize(usage.get(tag.id) ?? 0, 'lieu', 'lieux') }}
            </span>
            <Pencil class="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      </ul>
      <p v-if="!list.length" class="text-center text-sm text-muted-foreground">
        {{ query ? `Aucun tag ne correspond à « ${query} ».` : `Aucun tag dans ${categoryLabel}.` }}
      </p>
    </div>
  </SheetPanel>
</template>
