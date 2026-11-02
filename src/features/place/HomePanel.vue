<script setup lang="ts">
import { House, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { onBeforeUnmount, watch, watchEffect } from 'vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { useMapController } from '@/features/map/map-controller'
import { useAppDataStore } from '@/stores/app-data'
import { useHomeStore } from '@/stores/home'
import { usePreferencesStore } from '@/stores/preferences'

/**
 * Compact card for the home address, when its pin is tapped.
 * Never expanded: there is nothing more to show (for now).
 */
const close = useCloseOverlay()
const appData = useAppDataStore()
const { home } = storeToRefs(useHomeStore())
const { activeCategory } = storeToRefs(usePreferencesStore())
const { setFocus } = useMapController()

// No home (wrong URL, data wiped…): back to the map.
watchEffect(() => {
  if (appData.ready && !home.value) close()
})

watch(
  home,
  (value) =>
    setFocus(
      value
        ? {
            location: value.location,
            label: 'La maison',
            icon: 'house',
            category: activeCategory.value,
            variant: 'home',
          }
        : undefined,
    ),
  { immediate: true },
)
onBeforeUnmount(() => setFocus(undefined))
</script>

<template>
  <div v-if="home" class="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3">
    <article class="pointer-events-auto mx-auto flex max-w-md items-start gap-3 rounded-xl bg-card p-3 shadow-xl">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-cream">
        <House class="size-5" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="text-base font-semibold">La maison</h2>
        <p class="truncate text-sm text-muted-foreground">{{ home.address }}</p>
      </div>
      <Button variant="ghost" size="icon" class="-mt-1 -mr-1 rounded-full" aria-label="Fermer" @click="close">
        <X />
      </Button>
    </article>
  </div>
</template>
