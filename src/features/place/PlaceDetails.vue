<script setup lang="ts">
import {
  Archive,
  Globe,
  Link as LinkIcon,
  Minimize2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from '@lucide/vue'
import { computed, ref, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import InstagramIcon from '@/components/common/InstagramIcon.vue'
import RatingSummary from '@/components/common/RatingSummary.vue'
import { Button } from '@/components/ui/button'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { CRITERION_LABELS } from '@/config/ratings'
import type { VisitPatch } from '@/domain/entities'
import { linkLabel } from '@/domain/format'
import type { Place, PlaceLinkKind } from '@/domain/models'
import { isClosed } from '@/domain/places'
import type { PlaceRatings } from '@/domain/ratings'
import RouteSummary from '@/features/routing/RouteSummary.vue'
import VisitForm from '@/features/visits/VisitForm.vue'
import VisitItem from '@/features/visits/VisitItem.vue'
import { usePlacesStore } from '@/stores/places'
import { useVisitsStore } from '@/stores/visits'
import PlaceTags from './PlaceTags.vue'

const props = defineProps<{ place: Place; ratings: PlaceRatings }>()
const emit = defineEmits<{ compact: []; close: [] }>()

const places = usePlacesStore()
const visits = useVisitsStore()
const addingVisit = ref(false)
const busy = ref(false)

const placeVisits = computed(() => visits.forPlace(props.place.id))
const closed = computed(() => isClosed(props.place))

const LINK_ICONS: Record<PlaceLinkKind, Component> = {
  website: Globe,
  instagram: InstagramIcon,
  other: LinkIcon,
}

async function run(action: () => Promise<unknown>): Promise<void> {
  busy.value = true
  try {
    await action()
  } finally {
    busy.value = false
  }
}

function setVisited(visited: boolean): void {
  if (visited !== props.place.visited) void run(() => places.setVisited(props.place.id, visited))
}

async function addVisit(fields: VisitPatch): Promise<void> {
  await run(() => visits.add({ placeId: props.place.id, ...fields }))
  addingVisit.value = false
}

function toggleClosed(): void {
  if (closed.value) {
    void run(() => places.reopen(props.place.id))
  } else if (window.confirm(`Marquer « ${props.place.name} » comme fermé définitivement ?`)) {
    void run(() => places.markClosed(props.place.id))
  }
}

function remove(): void {
  const confirmed = window.confirm(
    `Supprimer « ${props.place.name} » ? À réserver aux erreurs de saisie : pour un lieu qui a fermé, utilise plutôt « Marquer comme fermé ».`,
  )
  // Once deleted, the panel closes by itself (the place no longer exists).
  if (confirmed) void run(() => places.remove(props.place.id))
}
</script>

<template>
  <article class="pointer-events-auto flex max-h-full min-h-0 flex-col rounded-t-2xl bg-card shadow-[0_-8px_24px_rgb(0_0_0/0.12)]">
    <!-- Header -->
    <header class="flex items-start gap-3 border-b border-border p-4">
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        :class="{ 'opacity-50 grayscale': closed }"
      >
        <AppIcon :name="place.icon" class="size-6" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="text-lg leading-tight font-semibold">{{ place.name }}</h2>
        <p class="text-sm text-muted-foreground">{{ place.address }}</p>
      </div>
      <div class="-mt-1 -mr-2 flex">
        <Button as-child variant="ghost" size="icon" class="rounded-full">
          <RouterLink :to="{ name: 'place-edit', params: { id: place.id } }" aria-label="Modifier">
            <Pencil />
          </RouterLink>
        </Button>
        <Button variant="ghost" size="icon" class="rounded-full" aria-label="Vue compacte" @click="emit('compact')">
          <Minimize2 />
        </Button>
        <Button variant="ghost" size="icon" class="rounded-full" aria-label="Fermer" @click="emit('close')">
          <X />
        </Button>
      </div>
    </header>

    <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
      <p v-if="closed" class="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
        Ce lieu a fermé définitivement.
      </p>

      <RouteSummary
        v-if="!closed"
        :destination="place.location"
        :color="CATEGORY_DEFINITIONS[place.category].color"
      />

      <PlaceTags :place="place" />

      <p v-if="place.memo" class="text-sm whitespace-pre-line italic">« {{ place.memo }} »</p>

      <ul v-if="place.links.length" class="space-y-1">
        <li v-for="link in place.links" :key="link.url">
          <a
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline"
          >
            <component :is="LINK_ICONS[link.kind]" class="size-4" aria-hidden="true" />
            {{ linkLabel(link) }}
          </a>
        </li>
      </ul>

      <!-- Status -->
      <!-- Read-only once closed: the status stays visible, but can't change anymore. -->
      <div
        role="radiogroup"
        aria-label="Statut"
        :aria-disabled="closed"
        class="flex rounded-full bg-muted p-1"
        :class="{ 'opacity-60': closed }"
      >
        <button
          v-for="option in [
            { visited: false, label: 'À tester' },
            { visited: true, label: 'Déjà testé' },
          ]"
          :key="option.label"
          type="button"
          role="radio"
          :aria-checked="place.visited === option.visited"
          :disabled="busy || closed"
          class="flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
          :class="
            place.visited === option.visited
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground enabled:hover:text-foreground'
          "
          @click="setVisited(option.visited)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- Ratings -->
      <section v-if="ratings.quality || ratings.value" class="flex flex-wrap gap-x-8 gap-y-4">
        <RatingSummary :label="CRITERION_LABELS.quality" :summary="ratings.quality" />
        <RatingSummary :label="CRITERION_LABELS.value" :summary="ratings.value" />
      </section>

      <!-- Visits -->
      <section class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold">Visites</h3>
          <Button v-if="!addingVisit" size="sm" variant="outline" @click="addingVisit = true">
            <Plus />
            Ajouter une visite
          </Button>
        </div>
        <div v-if="addingVisit" class="rounded-lg bg-muted/60 p-3">
          <VisitForm submit-label="Ajouter" :busy="busy" @save="addVisit" @cancel="addingVisit = false" />
        </div>
        <ul v-if="placeVisits.length" class="space-y-2">
          <VisitItem v-for="visit in placeVisits" :key="visit.id" :visit="visit" />
        </ul>
        <p v-else-if="!addingVisit" class="text-sm text-muted-foreground">Aucune visite enregistrée.</p>
      </section>

      <!-- Lifecycle -->
      <section class="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button variant="outline" size="sm" :disabled="busy" @click="toggleClosed">
          <RotateCcw v-if="closed" />
          <Archive v-else />
          {{ closed ? 'Rouvrir' : 'Marquer comme fermé' }}
        </Button>
        <Button variant="ghost" size="sm" class="text-destructive" :disabled="busy" @click="remove">
          <Trash2 />
          Supprimer
        </Button>
      </section>
    </div>
  </article>
</template>
