<script setup lang="ts">
import { House, Search, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useMapController } from '@/features/map/map-controller'
import { useHomeStore } from '@/stores/home'

// Local for now; moves to a search store with the search feature (step 8).
const query = ref('')

const { home } = storeToRefs(useHomeStore())
const { flyTo } = useMapController()

function centerOnHome(): void {
  if (home.value) flyTo(home.value.location)
}
</script>

<template>
  <footer
    class="z-10 flex items-center gap-2 border-t border-border bg-card px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
  >
    <label class="relative flex flex-1 items-center">
      <span class="sr-only">Rechercher un lieu</span>
      <Search
        class="pointer-events-none absolute left-3 size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        v-model="query"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        placeholder="Rechercher un lieu…"
        class="h-10 w-full rounded-full border border-input bg-background pr-9 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        v-if="query"
        type="button"
        aria-label="Effacer la recherche"
        class="absolute right-2 rounded-full p-1 text-muted-foreground hover:text-foreground"
        @click="query = ''"
      >
        <X class="size-4" />
      </button>
    </label>
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
