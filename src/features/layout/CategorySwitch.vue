<script setup lang="ts">
import { storeToRefs } from 'pinia'
import AppIcon from '@/components/common/AppIcon.vue'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { CATEGORIES } from '@/domain/models'
import { usePreferencesStore } from '@/stores/preferences'

const { activeCategory } = storeToRefs(usePreferencesStore())
</script>

<template>
  <div role="radiogroup" aria-label="Catégorie" class="flex rounded-full bg-muted p-1">
    <button
      v-for="id in CATEGORIES"
      :key="id"
      type="button"
      role="radio"
      :aria-checked="activeCategory === id"
      class="flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring"
      :class="
        activeCategory === id
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      "
      @click="activeCategory = id"
    >
      <AppIcon :name="CATEGORY_DEFINITIONS[id].icon" class="size-4" />
      {{ CATEGORY_DEFINITIONS[id].label }}
    </button>
  </div>
</template>
