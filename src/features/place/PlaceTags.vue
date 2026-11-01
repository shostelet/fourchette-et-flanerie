<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import type { Place, Tag } from '@/domain/models'
import { useTagsStore } from '@/stores/tags'

/** The "main" tag (category) first, then the user's tags. */
const props = defineProps<{ place: Place }>()

const tags = useTagsStore()
const placeTags = computed(() =>
  props.place.tagIds.map((id) => tags.byId.get(id)).filter((t): t is Tag => t !== undefined),
)
</script>

<template>
  <ul class="flex flex-wrap gap-1" aria-label="Tags">
    <li
      class="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-sm text-primary-foreground"
    >
      <AppIcon :name="CATEGORY_DEFINITIONS[place.category].icon" class="size-3.5" />
      {{ CATEGORY_DEFINITIONS[place.category].label }}
    </li>
    <li
      v-for="tag in placeTags"
      :key="tag.id"
      class="flex items-center gap-1.5 rounded-full border border-input bg-background px-2.5 py-0.5 text-sm"
    >
      <span class="size-2.5 rounded-full" :style="{ backgroundColor: tag.color }" aria-hidden="true" />
      {{ tag.name }}
    </li>
  </ul>
</template>
