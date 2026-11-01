<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/features/layout/AppHeader.vue'
import MapCanvas from '@/features/map/MapCanvas.vue'
import SearchBar from '@/features/search/SearchBar.vue'
import { useAppDataStore } from '@/stores/app-data'

const appData = useAppDataStore()
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
      <RouterView />
    </main>
    <SearchBar />
  </div>
</template>
