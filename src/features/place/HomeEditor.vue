<script setup lang="ts">
import { Check, LoaderCircle, MapPin, Search } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { ref } from 'vue'
import SheetPanel from '@/components/common/SheetPanel.vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { useDebouncedSearch } from '@/composables/useDebouncedSearch'
import { useToast } from '@/composables/useToast'
import type { GeoResult } from '@/domain/geocoding'
import { useMapController } from '@/features/map/map-controller'
import { searchAddresses } from '@/services/photon'
import { useHomeStore } from '@/stores/home'

/** Sets the home address by searching it (Photon, addresses only). */
const close = useCloseOverlay()
const toast = useToast()
const homeStore = useHomeStore()
const { home } = storeToRefs(homeStore)
const { center, flyTo } = useMapController()

const query = ref('')
const selected = ref<GeoResult>()
const busy = ref(false)

const { results, status, error, retry } = useDebouncedSearch(query, (value, signal) =>
  searchAddresses(value, { near: home.value?.location ?? center(), signal }),
)

/** The full address of a result (house number, street, city). */
function fullAddress(result: GeoResult): string {
  return result.kind === 'address' ? result.name : [result.name, result.address].filter(Boolean).join(', ')
}

async function save(): Promise<void> {
  const result = selected.value
  if (!result) return
  busy.value = true
  try {
    await homeStore.save({ address: fullAddress(result), location: result.location })
    flyTo(result.location)
    toast.show('Adresse de la maison enregistrée')
    close()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <SheetPanel title="Adresse de la maison" @close="close">
    <div class="mx-auto max-w-xl space-y-4">
      <p v-if="home" class="text-sm text-muted-foreground">
        Actuellement : <strong class="text-foreground">{{ home.address }}</strong>
      </p>

      <label class="relative flex items-center">
        <span class="sr-only">Rechercher une adresse</span>
        <Search class="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          autocomplete="street-address"
          placeholder="Numéro, rue, ville…"
          class="h-10 w-full rounded-full border border-input bg-background pl-9 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          @input="selected = undefined"
        />
      </label>

      <p v-if="status === 'loading'" class="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
        Recherche…
      </p>
      <div v-else-if="status === 'error'" class="space-y-2">
        <p class="text-sm text-destructive">{{ error }}</p>
        <Button variant="outline" size="sm" @click="retry()">Réessayer</Button>
      </div>
      <p v-else-if="status === 'done' && !results.length" class="text-sm text-muted-foreground">
        Aucune adresse trouvée.
      </p>

      <ul v-if="results.length" role="listbox" aria-label="Adresses" class="space-y-1">
        <li v-for="result in results" :key="result.key">
          <button
            type="button"
            role="option"
            :aria-selected="selected?.key === result.key"
            class="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left"
            :class="selected?.key === result.key ? 'border-ink bg-card' : 'border-transparent hover:bg-accent'"
            @click="selected = result"
          >
            <MapPin class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ result.name }}</span>
              <span class="block truncate text-sm text-muted-foreground">{{ result.address }}</span>
            </span>
            <Check v-if="selected?.key === result.key" class="size-4 shrink-0" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>

    <template #footer>
      <Button variant="ghost" :disabled="busy" @click="close">Annuler</Button>
      <Button class="bg-ink text-cream hover:bg-ink/90" :disabled="busy || !selected" @click="save">
        Enregistrer
      </Button>
    </template>
  </SheetPanel>
</template>
