<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import RatingSummary from '@/components/common/RatingSummary.vue'
import { Button } from '@/components/ui/button'
import { useGeolocation } from '@/composables/useGeolocation'
import { useOverlay } from '@/composables/useOverlay'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { sortPlaces, type PlaceSort } from '@/domain/filters'
import { pluralize } from '@/domain/format'
import { formatDistance } from '@/domain/geocoding'
import type { GeoPoint, Place } from '@/domain/models'
import { distanceMeters, isClosed, isToTest } from '@/domain/places'
import { useMapController } from '@/features/map/map-controller'
import { useFiltersStore } from '@/stores/filters'
import { useHomeStore } from '@/stores/home'
import { usePreferencesStore } from '@/stores/preferences'
import { useVisitsStore } from '@/stores/visits'
import FiltersPanel from '@/features/filters/FiltersPanel.vue'
import ViewToolbar from './ViewToolbar.vue'

/** The filtered places of the active category, as a sortable list. */
const overlay = useOverlay()
const filters = useFiltersStore()
const { sort, visiblePlaces, activeCount, panelOpen } = storeToRefs(filters)
const visits = useVisitsStore()
const { home } = storeToRefs(useHomeStore())
const { activeCategory } = storeToRefs(usePreferencesStore())
const { position } = useGeolocation()
const { center } = useMapController()

const SORT_OPTIONS: { value: PlaceSort; label: string }[] = [
  { value: 'distance', label: 'Les plus proches' },
  { value: 'name', label: 'Ordre alphabétique' },
  { value: 'recent', label: 'Ajoutés récemment' },
  { value: 'quality', label: 'Mieux notés (qualité)' },
  { value: 'value', label: 'Meilleur rapport qualité/prix' },
]

/** Distances are from where you are, otherwise from home, otherwise from the map. */
const origin = computed<GeoPoint | undefined>(() => position.value ?? home.value?.location ?? center())
const originLabel = computed(() =>
  position.value ? 'de ta position' : home.value ? 'de la maison' : 'du centre de la carte',
)

const sorted = computed(() =>
  sortPlaces(visiblePlaces.value, sort.value, {
    origin: origin.value,
    ratings: (id) => visits.ratingsFor(id),
  }),
)

function distanceLabel(place: Place): string | undefined {
  return origin.value ? formatDistance(distanceMeters(origin.value, place.location)) : undefined
}

// A place is a sub-view of the list: closing it returns to the list.
function openPlace(place: Place): void {
  overlay.openChild({ name: 'place', params: { id: place.id } })
}
</script>

<template>
  <section aria-label="Liste des lieux" class="absolute inset-0 z-20 flex flex-col bg-background">
    <header class="space-y-2 border-b border-border bg-card px-4 py-2">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h2 class="font-semibold">{{ CATEGORY_DEFINITIONS[activeCategory].label }}</h2>
          <p class="text-xs text-muted-foreground">
            {{ pluralize(sorted.length, 'lieu', 'lieux') }}
            <template v-if="activeCount"> · {{ pluralize(activeCount, 'filtre actif', 'filtres actifs') }}</template>
          </p>
        </div>
        <ViewToolbar />
      </div>
      <label class="flex items-center gap-2 text-sm">
        <span class="text-muted-foreground">Trier :</span>
        <select
          v-model="sort"
          class="h-8 flex-1 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
    </header>

    <div class="flex-1 overflow-y-auto">
      <ul class="mx-auto max-w-xl divide-y divide-border">
        <li v-for="place in sorted" :key="place.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            @click="openPlace(place)"
          >
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
              :class="{ 'opacity-50 grayscale': isClosed(place) }"
            >
              <AppIcon :name="place.icon" class="size-5" />
            </span>
            <span class="min-w-0 flex-1 space-y-0.5">
              <span class="flex items-baseline gap-2">
                <span class="truncate font-medium">{{ place.name }}</span>
                <span v-if="isClosed(place)" class="shrink-0 text-xs font-medium text-destructive">Fermé</span>
                <span v-else-if="isToTest(place)" class="shrink-0 text-xs font-medium text-primary">À tester</span>
              </span>
              <span class="block truncate text-sm text-muted-foreground">{{ place.address }}</span>
              <span
                v-if="visits.ratingsFor(place.id).quality || visits.ratingsFor(place.id).value"
                class="flex gap-4"
              >
                <RatingSummary compact label="Qualité" :summary="visits.ratingsFor(place.id).quality" />
                <RatingSummary compact label="Prix" :summary="visits.ratingsFor(place.id).value" />
              </span>
            </span>
            <span class="shrink-0 text-xs text-muted-foreground" :title="`Distance ${originLabel}`">
              {{ distanceLabel(place) }}
            </span>
          </button>
        </li>
      </ul>
      <div v-if="!sorted.length" class="space-y-3 p-6 text-center">
        <p class="text-muted-foreground">Aucun lieu ne correspond.</p>
        <Button v-if="activeCount" variant="outline" @click="filters.reset()">Réinitialiser les filtres</Button>
      </div>
      <p v-else class="p-4 text-center text-xs text-muted-foreground">Distances {{ originLabel }}.</p>
    </div>

    <!-- Filters, as a layer over the list -->
    <FiltersPanel v-if="panelOpen" />
  </section>
</template>
