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
  }>(),
  { toTest: false, variant: 'place' },
)
</script>

<template>
  <button
    type="button"
    :title="label"
    :aria-label="toTest ? `${label} (à tester)` : label"
    class="relative flex cursor-pointer flex-col items-center drop-shadow-md transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none"
  >
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
