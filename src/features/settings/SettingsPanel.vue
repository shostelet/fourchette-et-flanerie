<script setup lang="ts">
import {
  ClipboardCheck,
  Database,
  Download,
  FileUp,
  MapPinPlus,
  Sparkles,
  Tags,
  Trash2,
  X,
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { useToast } from '@/composables/useToast'
import { useImportExport } from '@/features/import-export/useImportExport'
import { needsReview } from '@/domain/review'
import { useAppDataStore } from '@/stores/app-data'
import { usePlacesStore } from '@/stores/places'
import { seedSampleData } from './dev-seed'

const close = useCloseOverlay()
const appData = useAppDataStore()
const { exportAll } = useImportExport()
const toast = useToast()
const busy = ref(false)
const places = usePlacesStore()
const toReviewCount = computed(() => places.items.filter(needsReview).length)

/** Entries arriving in the next steps. */
const upcoming = ['Adresse de la maison']

const itemClass =
  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none'

async function run(action: () => Promise<void>): Promise<void> {
  busy.value = true
  try {
    await action()
  } finally {
    busy.value = false
  }
}

function exportData(): void {
  exportAll()
  toast.show('Export téléchargé')
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
        <li>
          <RouterLink :to="{ name: 'place-new' }" replace :class="itemClass">
            <MapPinPlus class="size-4 text-primary" aria-hidden="true" />
            Ajouter un lieu
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'tags' }" :class="itemClass">
            <Tags class="size-4 text-primary" aria-hidden="true" />
            Gérer les tags
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'review' }" :class="itemClass">
            <ClipboardCheck class="size-4 text-primary" aria-hidden="true" />
            Passer en revue
            <span
              v-if="toReviewCount"
              class="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
            >
              {{ toReviewCount }}
            </span>
          </RouterLink>
        </li>
        <li>
          <RouterLink :to="{ name: 'import' }" :class="itemClass">
            <FileUp class="size-4 text-primary" aria-hidden="true" />
            Importer un fichier
          </RouterLink>
        </li>
        <li>
          <button type="button" :class="itemClass" @click="exportData">
            <Download class="size-4 text-primary" aria-hidden="true" />
            Exporter mes données
          </button>
        </li>
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
