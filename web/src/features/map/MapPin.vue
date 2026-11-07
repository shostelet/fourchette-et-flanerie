<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'

withDefaults(
  defineProps<{
    icon: string
    /** Name, for screen readers and the native tooltip. */
    label: string
    /** Shows the "?" badge (never been there). */
    toTest?: boolean
    variant?: 'place' | 'home'
    /** Bigger, with a halo: the place currently focused (e.g. in review). */
    highlighted?: boolean
    /** Permanently closed: greyed out (only shown when the filter asks for it). */
    closed?: boolean
  }>(),
  { toTest: false, variant: 'place', highlighted: false, closed: false },
)
</script>

<template>
  <button
    type="button"
    :title="label"
    :aria-label="closed ? `${label} (fermé)` : toTest ? `${label} (à tester)` : label"
    class="relative flex cursor-pointer flex-col items-center drop-shadow-md transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:rounded-full focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink"
    :class="{ 'z-10 scale-125': highlighted, 'opacity-60 grayscale': closed }"
  >
    <span
      v-if="highlighted"
      class="absolute top-0 size-9 motion-safe:animate-ping rounded-full"
      :class="variant === 'home' ? 'bg-ink/40' : 'bg-primary/40'"
      aria-hidden="true"
    />
    <span
      class="flex size-9 items-center justify-center rounded-full border-2 border-card"
      :class="variant === 'home' ? 'bg-ink text-cream' : 'bg-primary text-primary-foreground'"
    >
      <AppIcon :name="icon" class="size-[18px]" />
    </span>
    <!-- Pin tail -->
    <span
      class="-mt-1 size-2.5 rotate-45 border-r-2 border-b-2 border-card"
      :class="variant === 'home' ? 'bg-ink' : 'bg-primary'"
      aria-hidden="true"
    />
    <span
      v-if="toTest"
      class="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full border border-primary bg-card text-[10px] leading-none font-bold text-primary"
      aria-hidden="true"
    >
      ?
    </span>
  </button>
</template>
