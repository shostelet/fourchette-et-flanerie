<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, nextTick, onBeforeUnmount, useTemplateRef, watch, watchEffect } from 'vue'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { useMapController } from '@/features/map/map-controller'
import { useAppDataStore } from '@/stores/app-data'
import { usePlacesStore } from '@/stores/places'
import { usePreferencesStore } from '@/stores/preferences'
import { useVisitsStore } from '@/stores/visits'
import { useRouteModeFit } from '@/features/routing/useRouteModeFit'
import PlaceCompact from './PlaceCompact.vue'
import PlaceDetails from './PlaceDetails.vue'

/**
 * Place detail, over the map. Two modes, the last one chosen being kept:
 * - compact: essentials at the bottom, the map usable around;
 * - expanded: everything (tags, ratings, visits, actions).
 * The card uses its own category's colors, whatever the active category.
 */
const props = defineProps<{ id: string }>()

const close = useCloseOverlay()
const appData = useAppDataStore()
const places = usePlacesStore()
const visits = useVisitsStore()
const { setFocus, ensureVisible, setZen, zen } = useMapController()
const panel = useTemplateRef<HTMLElement>('panel')
const { placeView } = storeToRefs(usePreferencesStore())

const place = computed(() => places.get(props.id))
const ratings = computed(() => visits.ratingsFor(props.id))

// Unknown or deleted place (wrong URL, just deleted…): back to the map.
watchEffect(() => {
  if (appData.ready && !place.value) close()
})

// Highlight the place on the map (even when its category is not the active one).
watch(
  place,
  (value) =>
    setFocus(
      value
        ? { location: value.location, label: value.name, icon: value.icon, category: value.category }
        : undefined,
    ),
  { immediate: true },
)
onBeforeUnmount(() => setFocus(undefined))

// Route mode: frame the route; going to another place ends it.
useRouteModeFit(panel)
watch(
  () => props.id,
  () => setZen(false),
)

// Keep the pin visible above the card: on opening, when switching
// compact/expanded, and when going from one place to another.
watch(
  [() => place.value?.id, placeView],
  async () => {
    await nextTick()
    const card = panel.value?.firstElementChild
    // In route mode, the route framing takes care of the camera.
    if (place.value && card && !zen.value) ensureVisible(place.value.location, card.getBoundingClientRect().top)
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <div
    v-if="place"
    ref="panel"
    :data-category="place.category"
    class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col"
    :class="placeView === 'compact' ? 'p-3' : 'top-[12%] justify-end'"
  >
    <PlaceCompact
      v-if="placeView === 'compact'"
      :place="place"
      :ratings="ratings"
      @expand="placeView = 'expanded'"
      @close="close"
    />
    <PlaceDetails
      v-else
      :place="place"
      :ratings="ratings"
      @compact="placeView = 'compact'"
      @close="close"
    />
  </div>
</template>
