<script setup lang="ts">
import { House, Search, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { isLockedRoute, useOverlay } from '@/composables/useOverlay'
import { useMapController } from '@/features/map/map-controller'
import { useHomeStore } from '@/stores/home'
import { useSearchStore } from '@/stores/search'

const route = useRoute()
const overlay = useOverlay()
const search = useSearchStore()
const { query } = storeToRefs(search)
const { home } = storeToRefs(useHomeStore())
const { flyTo } = useMapController()
const input = useTemplateRef<HTMLInputElement>('input')

/** No search while a form or the review is open: it would replace it. */
const disabled = computed(() => isLockedRoute(route.name))

// Typing opens the results panel (one panel at a time: it replaces the current one).
watch(query, (value) => {
  if (value.trim() && route.name !== 'search' && !disabled.value) overlay.open({ name: 'search' })
})

/** Back to the results of the current query (e.g. after opening a place from them). */
function showResults(): void {
  if (query.value.trim() && route.name !== 'search' && !disabled.value) overlay.open({ name: 'search' })
}

// Back on the map (results closed): the search is over.
watch(
  () => route.name,
  (name) => {
    if (name === 'map') search.clear()
  },
)

function clear(): void {
  search.clear()
  if (route.name === 'search') overlay.close()
}

function centerOnHome(): void {
  if (home.value) flyTo(home.value.location)
}
</script>

<template>
  <footer
    class="z-10 flex items-center gap-2 border-t border-border bg-card px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
  >
    <form class="relative flex flex-1 items-center" role="search" @submit.prevent="input?.blur()">
      <label class="contents">
        <span class="sr-only">Rechercher un lieu</span>
        <Search
          class="pointer-events-none absolute left-3 size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref="input"
          v-model="query"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          :disabled="disabled"
          @focus="showResults"
          placeholder="Rechercher un lieu ou une adresse…"
          class="h-10 w-full rounded-full border border-input bg-background pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      <button
        v-if="query"
        type="button"
        aria-label="Effacer la recherche"
        class="absolute right-2 rounded-full p-1 text-muted-foreground hover:text-foreground"
        @click="clear"
      >
        <X class="size-4" />
      </button>
    </form>
    <Button
      variant="secondary"
      size="icon"
      class="shrink-0 rounded-full"
      :aria-label="home ? 'Recentrer sur la maison' : 'Adresse de la maison non définie'"
      :disabled="!home"
      @click="centerOnHome"
    >
      <House />
    </Button>
  </footer>
</template>
