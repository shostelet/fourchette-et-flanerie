<script setup lang="ts">
import { computed } from 'vue'
import TagChip from '@/components/common/TagChip.vue'
import type { Place, Tag } from '@/domain/models'
import { useTagsStore } from '@/stores/tags'

/** The user's tags (the category is already given by the colors and the header). */
const props = defineProps<{ place: Place }>()

const tags = useTagsStore()
const placeTags = computed(() =>
  props.place.tagIds.map((id) => tags.byId.get(id)).filter((t): t is Tag => t !== undefined),
)
</script>

<template>
  <ul v-if="placeTags.length" class="flex flex-wrap gap-1" aria-label="Tags">
    <li
      v-for="tag in placeTags"
      :key="tag.id"
      class="rounded-full border border-input bg-background px-2.5 py-0.5 text-sm"
    >
      <TagChip :tag="tag" />
    </li>
  </ul>
</template>
