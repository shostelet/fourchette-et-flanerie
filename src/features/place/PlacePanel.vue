<script setup lang="ts">
import { X } from '@lucide/vue'
import { computed, watchEffect } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { isToTest } from '@/domain/places'
import { useAppDataStore } from '@/stores/app-data'
import { usePlacesStore } from '@/stores/places'

/** Temporary compact view of a place; the full detail comes with step 6. */
const props = defineProps<{ id: string }>()

const close = useCloseOverlay()
const appData = useAppDataStore()
const places = usePlacesStore()
const place = computed(() => places.get(props.id))

// Unknown place (deleted, wrong URL…): back to the map.
watchEffect(() => {
  if (appData.ready && !place.value) close()
})
</script>

<template>
  <!-- The map stays usable around the card. -->
  <div class="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3">
    <article
      v-if="place"
      :data-category="place.category"
      class="pointer-events-auto mx-auto flex max-w-md items-start gap-3 rounded-xl bg-card p-4 shadow-xl"
    >
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        <AppIcon :name="place.icon" class="size-5" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-base font-semibold">{{ place.name }}</h2>
        <p class="truncate text-sm text-muted-foreground">{{ place.address }}</p>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ CATEGORY_DEFINITIONS[place.category].label }}
          · {{ isToTest(place) ? 'À tester' : 'Déjà testé' }}
        </p>
      </div>
      <Button variant="ghost" size="icon" class="-mt-1 -mr-1 rounded-full" aria-label="Fermer" @click="close">
        <X />
      </Button>
    </article>
  </div>
</template>
