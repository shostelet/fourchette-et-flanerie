<script setup lang="ts">
import { LoaderCircle, MapPinPlus, RotateCw, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { Button } from '@/components/ui/button'
import { useOverlay } from '@/composables/useOverlay'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { formatDistance, type GeoResult } from '@/domain/geocoding'
import type { Place } from '@/domain/models'
import { isToTest } from '@/domain/places'
import { usePreferencesStore } from '@/stores/preferences'
import { useSearchStore } from '@/stores/search'

/**
 * Search results over the map: saved places of the active category first
 * (only when there are some), then new addresses around the map center.
 */
const search = useSearchStore()
const { query, known, newResults, status, error } = storeToRefs(search)
const { activeCategory } = storeToRefs(usePreferencesStore())
const overlay = useOverlay()

function distanceLabel(point: { lat: number; lng: number }): string | undefined {
  const meters = search.distanceTo(point)
  return meters === undefined ? undefined : formatDistance(meters)
}

// A saved place replaces the results (closing it returns to the map). The query
// stays in the search bar: tapping it shows the results again.
function openKnown(place: Place): void {
  overlay.open({ name: 'place', params: { id: place.id } })
}

// Adding a new address is a sub-view: cancelling returns to the results.
function addNew(result: GeoResult): void {
  search.pendingResult = result
  overlay.openChild({ name: 'place-new' })
}

// Not in the results (e.g. a brand new place): create it by hand with the typed name.
function addManually(): void {
  search.pendingName = query.value.trim()
  overlay.openChild({ name: 'place-new' })
}

/** Read by screen readers when the results change (the focus stays in the search bar). */
const announcement = computed(() => {
  if (!query.value.trim()) return ''
  const saved = `${known.value.length} adresse${known.value.length > 1 ? 's' : ''} enregistrée${known.value.length > 1 ? 's' : ''}`
  if (status.value === 'loading') return `${saved}, recherche de nouvelles adresses…`
  if (status.value !== 'done') return saved
  const fresh = newResults.value.length
  return `${saved}, ${fresh} nouvelle${fresh > 1 ? 's' : ''} adresse${fresh > 1 ? 's' : ''}`
})

function closeSearch(): void {
  search.clear()
  overlay.close()
}

const row =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none'
</script>

<template>
  <section aria-label="Résultats de recherche" class="absolute inset-0 z-20 flex flex-col bg-background">
    <header class="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-1">
      <h2 class="text-sm font-semibold text-muted-foreground">Recherche</h2>
      <p class="sr-only" aria-live="polite">{{ announcement }}</p>
      <Button variant="ghost" size="icon" class="rounded-full" aria-label="Fermer la recherche" @click="closeSearch">
        <X />
      </Button>
    </header>

    <!-- Empty query (erased with the keyboard): nothing to show -->
    <div v-if="!query.trim()" class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p class="text-muted-foreground">Tape le nom d’un lieu ou une adresse.</p>
      <Button variant="outline" @click="closeSearch">Retourner à la carte</Button>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-xl space-y-5 p-3">
      <!-- Saved places -->
      <section v-if="known.length" class="space-y-1">
        <h2 class="px-3 text-sm font-semibold text-muted-foreground">Adresses enregistrées</h2>
        <ul>
          <li v-for="place in known" :key="place.id">
            <button type="button" :class="row" @click="openKnown(place)">
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <AppIcon :name="place.icon" class="size-4" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex items-baseline gap-2">
                  <span class="truncate font-medium">{{ place.name }}</span>
                  <span v-if="isToTest(place)" class="shrink-0 text-xs font-medium text-primary">
                    À tester
                  </span>
                </span>
                <span class="block truncate text-sm text-muted-foreground">{{ place.address }}</span>
              </span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ distanceLabel(place.location) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- New addresses -->
      <section class="space-y-1">
        <h2 class="px-3 text-sm font-semibold text-muted-foreground">Nouvelles adresses</h2>

        <p v-if="query.trim().length < 3" class="px-3 text-sm text-muted-foreground">
          Tape au moins 3 caractères pour chercher de nouvelles adresses.
        </p>
        <p v-else-if="status === 'loading'" class="flex items-center gap-2 px-3 text-sm text-muted-foreground">
          <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
          Recherche…
        </p>
        <div v-else-if="status === 'error'" class="space-y-2 px-3">
          <p class="text-sm text-destructive">{{ error }}</p>
          <Button variant="outline" size="sm" @click="search.retry()">
            <RotateCw />
            Réessayer
          </Button>
        </div>
        <p v-else-if="!newResults.length" class="px-3 text-sm text-muted-foreground">
          Aucune nouvelle adresse trouvée autour de la carte.
        </p>

        <ul v-else>
          <li v-for="result in newResults" :key="result.key">
            <button
              type="button"
              :class="row"
              :data-category="result.category ?? activeCategory"
              @click="addNew(result)"
            >
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-primary text-primary"
              >
                <AppIcon v-if="result.icon" :name="result.icon" class="size-4" />
                <MapPinPlus v-else class="size-4" aria-hidden="true" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{{ result.name }}</span>
                <span class="block truncate text-sm text-muted-foreground">
                  <template v-if="result.category && result.category !== activeCategory">
                    {{ CATEGORY_DEFINITIONS[result.category].label }} ·
                  </template>
                  {{ result.address }}
                </span>
              </span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ distanceLabel(result.location) }}</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Not found: create it by hand (the address will come from the pin) -->
      <section v-if="status !== 'loading'" class="space-y-1 border-t border-border pt-3">
        <button type="button" :class="row" @click="addManually">
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground text-muted-foreground"
          >
            <MapPinPlus class="size-4" aria-hidden="true" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">Créer « {{ query.trim() }} »</span>
            <span class="block text-sm text-muted-foreground">Pas dans la liste ? Tu le places sur la carte.</span>
          </span>
        </button>
      </section>

      <p class="px-3 text-xs text-muted-foreground">
        Nouvelles adresses : © les contributeurs
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" class="underline">
          OpenStreetMap
        </a>
        , via Photon. Un lieu manque ou est faux ?
        <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener" class="underline">Contribue à OSM</a>.
      </p>
    </div>
    </div>
  </section>
</template>
