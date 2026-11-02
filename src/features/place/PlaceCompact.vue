<script setup lang="ts">
import { Maximize2, X } from '@lucide/vue'
import AppIcon from '@/components/common/AppIcon.vue'
import RatingSummary from '@/components/common/RatingSummary.vue'
import { Button } from '@/components/ui/button'
import type { Place } from '@/domain/models'
import { isClosed, isToTest } from '@/domain/places'
import type { PlaceRatings } from '@/domain/ratings'

/** Essentials only, with the map usable around (to find your way there). */
defineProps<{ place: Place; ratings: PlaceRatings }>()
const emit = defineEmits<{ expand: []; close: [] }>()
</script>

<template>
  <article class="pointer-events-auto mx-auto max-w-md rounded-xl bg-card p-3 shadow-xl">
    <div class="flex items-start gap-3">
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-label="Afficher la fiche complète"
        @click="emit('expand')"
      >
        <AppIcon :name="place.icon" class="size-5" />
      </button>
      <button type="button" class="min-w-0 flex-1 text-left" @click="emit('expand')">
        <!-- The name shrinks (ellipsis), the status never does. -->
        <h2 class="flex min-w-0 items-baseline gap-2">
          <span class="truncate text-base font-semibold">{{ place.name }}</span>
          <!-- A closed place can't be tested anymore: only "Fermé" is shown. -->
          <span v-if="isClosed(place)" class="shrink-0 text-xs font-medium text-destructive">Fermé</span>
          <span v-else-if="isToTest(place)" class="shrink-0 text-xs font-medium text-primary">
            À tester
          </span>
        </h2>
        <p class="truncate text-sm text-muted-foreground">{{ place.address }}</p>
      </button>
      <div class="-mt-1 -mr-1 flex">
        <Button variant="ghost" size="icon" class="rounded-full" aria-label="Fiche complète" @click="emit('expand')">
          <Maximize2 />
        </Button>
        <Button variant="ghost" size="icon" class="rounded-full" aria-label="Fermer" @click="emit('close')">
          <X />
        </Button>
      </div>
    </div>
    <div v-if="ratings.quality || ratings.value" class="mt-2 flex gap-4 border-t border-border pt-2">
      <RatingSummary compact label="Qualité" :summary="ratings.quality" />
      <RatingSummary compact label="Prix" :summary="ratings.value" />
    </div>
  </article>
</template>
