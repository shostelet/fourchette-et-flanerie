<script setup lang="ts">
import { List, Map as MapIcon, SlidersHorizontal } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { useOverlay } from '@/composables/useOverlay'
import { useFiltersStore } from '@/stores/filters'

/**
 * Filters + map/list switch, at the same place on the map and in the list.
 * Map and list are the two base views; the filters sheet is a state of the
 * base view, so it stays open when switching between them.
 */
const route = useRoute()
const router = useRouter()
const overlay = useOverlay()
const { activeCount, panelOpen } = storeToRefs(useFiltersStore())

const inList = computed(() => route.name === 'list')
const listPath = computed(() => router.resolve({ name: 'list' }).fullPath)

function toggleView(): void {
  if (inList.value) {
    overlay.close()
  } else if (window.history.state?.back === listPath.value) {
    // A place opened from the list: go back to that list instead of adding another one.
    router.back()
  } else {
    overlay.open({ name: 'list' })
  }
}
</script>

<template>
  <div class="flex gap-2">
    <Button
      variant="outline"
      class="relative rounded-full bg-card shadow-sm"
      :class="{ 'border-primary text-primary': panelOpen }"
      :aria-pressed="panelOpen"
      :aria-label="activeCount ? `Filtres (${activeCount} actifs)` : 'Filtres'"
      @click="panelOpen = !panelOpen"
    >
      <SlidersHorizontal />
      Filtres
      <span
        v-if="activeCount"
        class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground"
        aria-hidden="true"
      >
        {{ activeCount }}
      </span>
    </Button>
    <Button variant="outline" class="rounded-full bg-card shadow-sm" @click="toggleView">
      <MapIcon v-if="inList" />
      <List v-else class="text-primary" />
      {{ inList ? 'Carte' : 'Liste' }}
    </Button>
  </div>
</template>
