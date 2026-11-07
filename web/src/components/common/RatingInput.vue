<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { RATING_FACES } from '@/config/ratings'
import type { Rating } from '@/domain/models'

/** Row of five faces. Tapping the selected face again clears the rating (ratings are optional). */
const model = defineModel<Rating | undefined>()
defineProps<{ label: string }>()

function select(value: Rating): void {
  model.value = model.value === value ? undefined : value
}
</script>

<template>
  <div class="space-y-1">
    <p class="text-sm font-medium">{{ label }}</p>
    <div role="group" :aria-label="label" class="flex gap-1">
      <button
        v-for="face in RATING_FACES"
        :key="face.value"
        type="button"
        :aria-pressed="model === face.value"
        :aria-label="face.label"
        :title="face.label"
        class="flex size-11 items-center justify-center rounded-full transition"
        :class="
          model === face.value
            ? 'scale-110 bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:bg-accent'
        "
        @click="select(face.value)"
      >
        <AppIcon :name="face.icon" class="size-6" />
      </button>
    </div>
  </div>
</template>
