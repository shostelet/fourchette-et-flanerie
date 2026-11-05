<script setup lang="ts">
import { Route, X } from '@lucide/vue'
import { useMapController } from '@/features/map/map-controller'

const { setZen } = useMapController()
</script>

<template>
  <div
    class="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card py-1 pr-1 pl-4 text-sm shadow-md"
    role="status"
  >
    <Route class="size-4 text-primary" aria-hidden="true" />
    <span class="font-medium">Mode trajet</span>
    <button
      type="button"
      class="flex items-center gap-1 rounded-full px-3 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      @click="setZen(false)"
    >
      <X class="size-3.5" aria-hidden="true" />
      Quitter
    </button>
  </div>
</template>
