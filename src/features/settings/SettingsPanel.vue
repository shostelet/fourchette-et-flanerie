<script setup lang="ts">
import { Database, Sparkles, Trash2, X } from '@lucide/vue'
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { useAppDataStore } from '@/stores/app-data'
import { seedSampleData } from './dev-seed'

const close = useCloseOverlay()
const appData = useAppDataStore()
const busy = ref(false)

/** Entries arriving in the next steps. */
const upcoming = [
  'Ajouter un lieu',
  'Passer en revue',
  'Gérer les tags',
  'Importer depuis Mapstr',
  'Exporter / importer mes données',
  'Adresse de la maison',
]

async function run(action: () => Promise<void>): Promise<void> {
  busy.value = true
  try {
    await action()
  } finally {
    busy.value = false
  }
}

function addSamples(): void {
  void run(seedSampleData)
}

function wipe(): void {
  const confirmed = window.confirm(
    'Effacer toutes les données enregistrées sur cet appareil ? Cette action est définitive.',
  )
  if (confirmed) void run(() => appData.wipeAll({ includePreferences: true }))
}
</script>

<template>
  <div class="absolute inset-0 z-20 flex">
    <div class="absolute inset-0 bg-ink/30" aria-hidden="true" @click="close" />
    <nav
      aria-label="Menu"
      class="relative flex h-full w-80 max-w-[85%] flex-col gap-4 overflow-y-auto bg-card p-4 shadow-xl"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Menu</h2>
        <Button variant="ghost" size="icon" class="rounded-full" aria-label="Fermer" @click="close">
          <X />
        </Button>
      </div>

      <ul class="space-y-1">
        <li
          v-for="label in upcoming"
          :key="label"
          class="flex items-center justify-between rounded-md px-3 py-2 text-muted-foreground"
        >
          {{ label }}
          <span class="rounded-full bg-muted px-2 py-0.5 text-xs">Bientôt</span>
        </li>
      </ul>

      <section class="mt-auto space-y-2 border-t border-border pt-4">
        <h3 class="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Database class="size-4" aria-hidden="true" />
          Outils de développement
        </h3>
        <Button variant="outline" class="w-full justify-start" :disabled="busy" @click="addSamples">
          <Sparkles />
          Ajouter des lieux d’exemple
        </Button>
        <Button variant="destructive" class="w-full justify-start" :disabled="busy" @click="wipe">
          <Trash2 />
          Effacer toutes les données locales
        </Button>
      </section>
    </nav>
  </div>
</template>
