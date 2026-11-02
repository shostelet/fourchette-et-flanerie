<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'

/** Horizontal row of icons to choose from. `allowNone`: a first choice for "no icon". */
const model = defineModel<string | undefined>()
withDefaults(
  defineProps<{
    options: readonly { icon: string; label: string }[]
    label: string
    allowNone?: boolean
    wrap?: boolean
  }>(),
  { allowNone: false, wrap: false },
)

const chip = (selected: boolean) =>
  selected
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background text-foreground hover:bg-accent'
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="flex gap-1"
    :class="wrap ? 'flex-wrap' : 'overflow-x-auto pb-1'"
  >
    <button
      v-if="allowNone"
      type="button"
      role="radio"
      :aria-checked="!model"
      aria-label="Aucune icône"
      title="Aucune icône"
      class="flex size-10 shrink-0 items-center justify-center rounded-full border text-xs"
      :class="chip(!model)"
      @click="model = undefined"
    >
      ∅
    </button>
    <button
      v-for="option in options"
      :key="option.icon"
      type="button"
      role="radio"
      :aria-checked="model === option.icon"
      :aria-label="option.label"
      :title="option.label"
      class="flex size-10 shrink-0 items-center justify-center rounded-full border"
      :class="chip(model === option.icon)"
      @click="model = option.icon"
    >
      <AppIcon :name="option.icon" class="size-5" />
    </button>
  </div>
</template>
