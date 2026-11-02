<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import type { Tag } from '@/domain/models'

/** A tag's marker (its icon in its color, or a colored dot) followed by its name. */
defineProps<{ tag: Pick<Tag, 'name' | 'color' | 'icon'> }>()
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-1.5">
    <AppIcon v-if="tag.icon" :name="tag.icon" class="size-3.5 shrink-0" :style="{ color: tag.color }" />
    <span
      v-else
      class="size-2.5 shrink-0 rounded-full"
      :style="{ backgroundColor: tag.color }"
      aria-hidden="true"
    />
    <span class="truncate">{{ tag.name }}</span>
  </span>
</template>
