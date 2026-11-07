<script setup lang="ts">
import { Check, Plus } from '@lucide/vue'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import TagChip from '@/components/common/TagChip.vue'
import { nextTagColor } from '@/config/tag-colors'
import type { Category, Id, Tag } from '@/domain/models'
import { useTagsStore } from '@/stores/tags'

/**
 * Selects the tags of a place, and creates new ones on the fly.
 * Shows the category's tags, plus already selected tags from the other
 * category (they will be moved when the place is saved).
 */
const model = defineModel<Id[]>({ required: true })
const props = defineProps<{ category: Category }>()

const tags = useTagsStore()
const input = useTemplateRef<HTMLInputElement>('input')
const adding = ref(false)
const newName = ref('')

const choices = computed<Tag[]>(() => {
  const carried = model.value
    .map((id) => tags.byId.get(id))
    .filter((t): t is Tag => t !== undefined && t.category !== props.category)
  return [...carried, ...tags.forCategory(props.category)]
})

function toggle(id: Id): void {
  model.value = model.value.includes(id) ? model.value.filter((t) => t !== id) : [...model.value, id]
}

async function startAdding(): Promise<void> {
  adding.value = true
  await nextTick()
  input.value?.focus()
}

/** Creates the tag (or reuses one with the same name) and selects it. */
async function add(): Promise<void> {
  const name = newName.value.trim()
  if (name) {
    const tag = await tags.create({ category: props.category, name, color: nextTagColor(tags.items) })
    if (!model.value.includes(tag.id)) model.value = [...model.value, tag.id]
  }
  newName.value = ''
  adding.value = false
}

const chip = (selected: boolean) =>
  selected
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background text-foreground'
</script>

<template>
  <div class="flex flex-wrap items-center gap-1" role="group" aria-label="Tags">
    <button
      v-for="tag in choices"
      :key="tag.id"
      type="button"
      :aria-pressed="model.includes(tag.id)"
      class="rounded-full border px-2.5 py-1 text-sm"
      :class="chip(model.includes(tag.id))"
      @click="toggle(tag.id)"
    >
      <TagChip :tag="tag" />
    </button>

    <form
      v-if="adding"
      class="flex items-center gap-1 rounded-full border border-primary bg-background py-0.5 pr-0.5 pl-3"
      @submit.prevent="add"
    >
      <input
        ref="input"
        v-model="newName"
        type="text"
        enterkeyhint="done"
        placeholder="Nouveau tag"
        aria-label="Nom du nouveau tag"
        class="w-32 bg-transparent text-sm outline-none"
        @keydown.esc="adding = false"
      />
      <button
        type="submit"
        class="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-label="Ajouter le tag"
      >
        <Check class="size-3.5" />
      </button>
    </form>
    <button
      v-else
      type="button"
      class="flex items-center gap-1 rounded-full border border-dashed border-input px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground"
      @click="startAdding"
    >
      <Plus class="size-3.5" aria-hidden="true" />
      Tag
    </button>
  </div>
</template>
