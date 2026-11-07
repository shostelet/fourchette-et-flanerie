<script setup lang="ts">
import { CircleCheck, FileUp, TriangleAlert } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SheetPanel from '@/components/common/SheetPanel.vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { ImportError } from '@/domain/import-export/errors'
import type { DuplicateDecision } from '@/domain/import-export/mapstr'
import { CATEGORIES } from '@/domain/models'
import { useHomeStore } from '@/stores/home'
import { usePlacesStore } from '@/stores/places'
import { useImportExport, type LoadedImport } from './useImportExport'

const close = useCloseOverlay()
const router = useRouter()
const { load, applyMapstr, replaceAll } = useImportExport()
const { home } = storeToRefs(useHomeStore())
const places = usePlacesStore()

const loaded = ref<LoadedImport>()
const error = ref<string>()
const busy = ref(false)
const done = ref<{ saved: number; toReview: number }>()

// Mapstr options
const decisions = ref<Record<string, DuplicateDecision>>({})
const useHome = ref(false)

const DECISION_OPTIONS: { value: DuplicateDecision; label: string }[] = [
  { value: 'skip', label: 'Ignorer' },
  { value: 'merge', label: 'Fusionner' },
  { value: 'keep-both', label: 'Garder les deux' },
]

const mapstrPlan = computed(() => (loaded.value?.format === 'mapstr' ? loaded.value.plan : undefined))
const nativeData = computed(() => (loaded.value?.format === 'native' ? loaded.value.data : undefined))
const duplicates = computed(() => mapstrPlan.value?.candidates.filter((c) => c.duplicateOf) ?? [])

const mapstrSummary = computed(() => {
  const candidates = mapstrPlan.value?.candidates ?? []
  return {
    byCategory: CATEGORIES.map((id) => ({
      label: CATEGORY_DEFINITIONS[id].label,
      count: candidates.filter((c) => c.place.category === id).length,
    })),
    toReview: candidates.filter((c) => c.place.needsReview).length,
  }
})

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allows picking the same file again
  if (!file) return

  error.value = undefined
  busy.value = true
  try {
    loaded.value = await load(file)
    decisions.value = {}
    useHome.value = !home.value
  } catch (e) {
    loaded.value = undefined
    error.value = e instanceof ImportError ? e.message : 'Une erreur inattendue est survenue.'
    console.error(e)
  } finally {
    busy.value = false
  }
}

async function confirmMapstr(): Promise<void> {
  const plan = mapstrPlan.value
  if (!plan) return
  busy.value = true
  try {
    const result = await applyMapstr(plan, new Map(Object.entries(decisions.value)), {
      useHome: useHome.value,
    })
    done.value = {
      saved: result.places.length,
      toReview: result.places.filter((p) => p.needsReview).length,
    }
  } finally {
    busy.value = false
  }
}

async function confirmNative(): Promise<void> {
  const data = nativeData.value
  if (!data) return
  const count = places.items.length
  if (
    count > 0 &&
    !window.confirm(`Remplacer les ${count} lieux de cet appareil par le contenu du fichier ?`)
  ) {
    return
  }
  busy.value = true
  try {
    await replaceAll(data)
    done.value = { saved: data.places.length, toReview: data.places.filter((p) => p.needsReview).length }
  } finally {
    busy.value = false
  }
}

function restart(): void {
  loaded.value = undefined
  error.value = undefined
}
</script>

<template>
  <SheetPanel title="Importer un fichier" @close="close">
    <!-- Done -->
    <div v-if="done" class="flex flex-col items-center gap-3 py-8 text-center">
      <CircleCheck class="size-12 text-primary" aria-hidden="true" />
      <p class="text-lg font-semibold">{{ done.saved }} lieu{{ done.saved > 1 ? 'x' : '' }} importé{{ done.saved > 1 ? 's' : '' }}</p>
      <p v-if="done.toReview" class="text-muted-foreground">
        Dont {{ done.toReview }} à vérifier lors du passage en revue.
      </p>
      <div class="mt-4 flex gap-2">
        <Button variant="ghost" @click="close">Terminer</Button>
        <Button v-if="done.toReview" @click="router.replace({ name: 'review' })">
          Passer en revue
        </Button>
      </div>
    </div>

    <!-- Pick a file -->
    <div v-else-if="!loaded" class="space-y-4">
      <p class="text-muted-foreground">
        Choisis un export <strong>Mapstr</strong> (ajouté à tes lieux actuels) ou un export
        <strong>Fourchette</strong> (qui remplace les données de cet appareil).
        Rien n’est enregistré avant ta confirmation.
      </p>
      <label
        class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-input bg-card p-8 text-center hover:border-primary"
        :class="{ 'pointer-events-none opacity-60': busy }"
      >
        <FileUp class="size-8 text-primary" aria-hidden="true" />
        <span class="font-medium">{{ busy ? 'Lecture…' : 'Choisir un fichier' }}</span>
        <span class="text-sm text-muted-foreground">.json ou .geojson</span>
        <input
          type="file"
          accept=".json,.geojson,application/json,application/geo+json"
          class="sr-only"
          @change="onFileChange"
        />
      </label>
      <p v-if="error" role="alert" class="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        <TriangleAlert class="size-4 shrink-0" aria-hidden="true" />
        {{ error }}
      </p>
    </div>

    <!-- Mapstr preview -->
    <div v-else-if="mapstrPlan" class="space-y-5">
      <section class="space-y-1">
        <h3 class="font-semibold">Export Mapstr</h3>
        <p v-for="item in mapstrSummary.byCategory" :key="item.label">
          {{ item.label }} : <strong>{{ item.count }}</strong> lieu{{ item.count > 1 ? 'x' : '' }}
        </p>
        <p>Nouveaux tags : <strong>{{ mapstrPlan.newTags.length }}</strong></p>
        <p v-if="mapstrSummary.toReview" class="text-sm text-muted-foreground">
          {{ mapstrSummary.toReview }} lieux seront signalés « à vérifier » (statut ou catégorie
          incertains), pour le passage en revue.
        </p>
      </section>

      <section v-if="mapstrPlan.home" class="space-y-1">
        <h3 class="font-semibold">Maison</h3>
        <label class="flex items-start gap-2">
          <input v-model="useHome" type="checkbox" class="mt-1 size-4 accent-primary" />
          <span>
            Utiliser « {{ mapstrPlan.home.address }} » comme adresse de la maison
            <span v-if="home" class="block text-sm text-muted-foreground">
              Remplacera l’adresse actuelle : {{ home.address }}
            </span>
          </span>
        </label>
      </section>

      <section v-if="duplicates.length" class="space-y-2">
        <h3 class="font-semibold">Lieux déjà connus ({{ duplicates.length }})</h3>
        <article
          v-for="{ place, duplicateOf } in duplicates"
          :key="place.id"
          class="space-y-2 rounded-lg bg-card p-3 shadow-sm"
        >
          <p class="text-sm">
            <strong>{{ place.name }}</strong> ressemble à
            <strong>{{ duplicateOf!.name }}</strong>, déjà enregistré.
          </p>
          <div role="group" :aria-label="`Que faire de ${place.name} ?`" class="flex flex-wrap gap-1">
            <button
              v-for="{ value, label } in DECISION_OPTIONS"
              :key="value"
              type="button"
              :aria-pressed="(decisions[place.id] ?? 'skip') === value"
              class="rounded-full border px-3 py-1 text-sm"
              :class="
                (decisions[place.id] ?? 'skip') === value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background'
              "
              @click="decisions[place.id] = value"
            >
              {{ label }}
            </button>
          </div>
        </article>
      </section>

      <section v-if="mapstrPlan.warnings.length" class="space-y-1 text-sm text-muted-foreground">
        <h3 class="font-semibold text-foreground">Ignorés</h3>
        <p v-for="warning in mapstrPlan.warnings" :key="warning">{{ warning }}</p>
      </section>
    </div>

    <!-- Native preview -->
    <div v-else-if="nativeData" class="space-y-4">
      <section class="space-y-1">
        <h3 class="font-semibold">Export Fourchette</h3>
        <p>Lieux : <strong>{{ nativeData.places.length }}</strong></p>
        <p>Visites : <strong>{{ nativeData.visits.length }}</strong></p>
        <p>Tags : <strong>{{ nativeData.tags.length }}</strong></p>
        <p v-if="nativeData.home">Maison : {{ nativeData.home.address }}</p>
      </section>
      <p class="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        <TriangleAlert class="size-4 shrink-0" aria-hidden="true" />
        Ce fichier remplacera toutes les données de cet appareil ({{ places.items.length }} lieux
        actuellement).
      </p>
    </div>

    <template v-if="loaded && !done" #footer>
      <Button variant="ghost" :disabled="busy" @click="restart">Autre fichier</Button>
      <Button v-if="mapstrPlan" :disabled="busy" @click="confirmMapstr">Importer</Button>
      <Button v-else variant="destructive" :disabled="busy" @click="confirmNative">
        Remplacer mes données
      </Button>
    </template>
  </SheetPanel>
</template>
