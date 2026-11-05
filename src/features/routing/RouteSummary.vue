<script setup lang="ts">
import { Bike, Footprints, LoaderCircle, Route } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, toRef, type Component } from 'vue'
import { formatDistance } from '@/domain/geocoding'
import type { GeoPoint } from '@/domain/models'
import { formatDuration, TRAVEL_MODES, type TravelMode } from '@/domain/routing'
import { useMapController } from '@/features/map/map-controller'
import { usePreferencesStore } from '@/stores/preferences'
import { useTravelRoutes } from './useTravelRoutes'

/** Duration and distance on foot and by bike; the selected route is drawn on the map. */
const props = withDefaults(
  defineProps<{
    destination: GeoPoint
    /** Hex color of the line on the map. */
    color: string
    /** False for the home card: from home to home makes no sense. */
    allowHomeOrigin?: boolean
  }>(),
  { allowHomeOrigin: true },
)

const { origin, states, travelMode } = useTravelRoutes(toRef(props, 'destination'), {
  color: toRef(props, 'color'),
  allowHomeOrigin: props.allowHomeOrigin,
})
const { zen, setZen } = useMapController()
const { placeView } = storeToRefs(usePreferencesStore())

const MODES: Record<TravelMode, { icon: Component; label: string }> = {
  foot: { icon: Footprints, label: 'À pied' },
  bike: { icon: Bike, label: 'À vélo' },
}

/** One chip per mode, with what to display. */
const chips = computed(() =>
  TRAVEL_MODES.map((mode) => {
    const state = states.value[mode]
    return {
      mode,
      ...MODES[mode],
      selected: travelMode.value === mode,
      loading: !state || state.status === 'loading',
      summary:
        state?.status === 'done'
          ? { duration: formatDuration(state.route.duration), distance: formatDistance(state.route.distance) }
          : undefined,
    }
  }),
)
const canShowRoute = computed(() => states.value[travelMode.value]?.status === 'done')

/** Route mode: only this route on the map, the card compact to leave room. */
function toggleRouteMode(): void {
  const on = !zen.value
  if (on) placeView.value = 'compact'
  setZen(on)
}
</script>

<template>
  <div v-if="origin" class="space-y-1">
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="chip in chips"
        :key="chip.mode"
        type="button"
        :aria-pressed="chip.selected"
        :title="chip.label"
        class="flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors"
        :class="
          chip.selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-input bg-background hover:bg-accent'
        "
        @click="travelMode = chip.mode"
      >
        <component :is="chip.icon" class="size-4" aria-hidden="true" />
        <span class="sr-only">{{ chip.label }} :</span>
        <template v-if="chip.summary">
          <span class="font-medium">{{ chip.summary.duration }}</span>
          <span class="opacity-80">· {{ chip.summary.distance }}</span>
        </template>
        <LoaderCircle v-else-if="chip.loading" class="size-3.5 animate-spin" aria-label="Calcul…" />
        <span v-else class="opacity-80">indisponible</span>
      </button>
      <button
        v-if="canShowRoute"
        type="button"
        :aria-pressed="zen"
        class="flex h-8 items-center gap-1 rounded-full px-2.5 text-sm"
        :class="zen ? 'bg-primary/15 font-medium text-primary' : 'text-primary hover:bg-accent'"
        @click="toggleRouteMode"
      >
        <Route class="size-4" aria-hidden="true" />
        {{ zen ? 'Quitter le mode trajet' : 'Mode trajet' }}
      </button>
    </div>
    <p class="text-xs text-muted-foreground">
      {{ origin.label }} ·
      <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener" class="underline">
        itinéraires OSM/FOSSGIS
      </a>
    </p>
  </div>
</template>
