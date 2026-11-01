<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/features/layout/AppHeader.vue'
import MapPlaceholder from '@/features/map/MapPlaceholder.vue'
import SearchBar from '@/features/search/SearchBar.vue'
</script>

<template>
  <div class="flex h-dvh flex-col bg-background text-foreground">
    <AppHeader />
    <main class="relative flex-1 overflow-hidden">
      <MapPlaceholder />
      <!-- Overlays (menu, place detail…) are rendered on top of the map. -->
      <RouterView />
    </main>
    <SearchBar />
  </div>
</template>
