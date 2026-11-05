<script setup lang="ts">
import { computed } from 'vue'

/** A group of places when zoomed out: tap to zoom in until it splits. */
const props = defineProps<{ count: number }>()

/** A bit bigger for bigger groups, within reason. */
const size = computed(() => Math.min(56, 32 + Math.log2(props.count) * 5))
</script>

<template>
  <button
    type="button"
    :aria-label="`${count} lieux ici : zoomer`"
    class="flex cursor-pointer items-center justify-center rounded-full border-[3px] border-card bg-primary text-sm font-semibold text-primary-foreground shadow-md ring-4 ring-primary/25 transition-transform hover:scale-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    {{ count }}
  </button>
</template>
