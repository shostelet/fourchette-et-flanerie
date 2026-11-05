<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useTemplateRef, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import FiltersPanel from '@/features/filters/FiltersPanel.vue'
import AppHeader from '@/features/layout/AppHeader.vue'
import MapCanvas from '@/features/map/MapCanvas.vue'
import { useMapController } from '@/features/map/map-controller'
import { usePanelFocus } from '@/composables/usePanelFocus'
import SearchBar from '@/features/search/SearchBar.vue'
import { useAppDataStore } from '@/stores/app-data'
import { useFiltersStore } from '@/stores/filters'

const appData = useAppDataStore()
const route = useRoute()
const { panelOpen } = storeToRefs(useFiltersStore())
const { setZen } = useMapController()
const panels = useTemplateRef<HTMLElement>('panels')

// Focus moves into panels and back; Escape closes the filters first, then the panel.
usePanelFocus(panels, () => {
  if (!panelOpen.value) return false
  panelOpen.value = false
  return true
})

watch(
  () => route.name,
  (name) => {
    // The filters belong to the base views (map, list): any other panel closes them.
    if (name !== 'map' && name !== 'list') panelOpen.value = false
    // Route mode only exists with a place or home card open.
    if (name !== 'place' && name !== 'home') setZen(false)
  },
)
</script>

<template>
  <div class="flex h-dvh flex-col bg-background text-foreground">
    <AppHeader />
    <main class="relative flex-1 overflow-hidden">
      <!-- Waits for the data, so the initial view can use the home address. -->
      <MapCanvas v-if="appData.ready" />
      <p v-else class="flex h-full items-center justify-center text-muted-foreground">
        Chargement…
      </p>
      <!-- Overlays (menu, place detail…) are rendered on top of the map. -->
      <div ref="panels" class="contents">
        <RouterView />
      </div>
      <!-- Filters over the map (over the list, the list shows them itself) -->
      <FiltersPanel v-if="panelOpen && route.name === 'map'" />
    </main>
    <SearchBar />
  </div>
</template>
