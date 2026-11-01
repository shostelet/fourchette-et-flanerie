<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { isToTest } from '@/domain/places'
import { useAppDataStore } from '@/stores/app-data'
import { useHomeStore } from '@/stores/home'
import { usePlacesStore } from '@/stores/places'
import { usePreferencesStore } from '@/stores/preferences'

/**
 * Temporary stand-in for the map (step 2). Shows what the stores hold,
 * which proves the data layer is wired end to end.
 */
const appData = useAppDataStore()
const places = usePlacesStore()
const { home } = storeToRefs(useHomeStore())
const { activeCategory } = storeToRefs(usePreferencesStore())

const visible = computed(() => places.activeIn(activeCategory.value))
const toTestCount = computed(() => visible.value.filter(isToTest).length)
const label = computed(() => CATEGORY_DEFINITIONS[activeCategory.value].label)
</script>

<template>
  <div
    class="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:16px_16px] p-6 text-center"
  >
    <p class="text-lg font-semibold">La carte arrive à l’étape 2</p>
    <p v-if="!appData.ready" class="text-muted-foreground">Chargement…</p>
    <template v-else>
      <p class="text-muted-foreground">
        {{ label }} : {{ visible.length }} lieu{{ visible.length > 1 ? 'x' : '' }},
        dont {{ toTestCount }} à tester
      </p>
      <p class="text-sm text-muted-foreground">
        {{ home ? `Maison : ${home.address}` : 'Adresse de la maison non définie' }}
      </p>
      <ul class="mt-2 w-full max-w-sm space-y-1 text-left text-sm">
        <li
          v-for="place in visible"
          :key="place.id"
          class="flex items-center justify-between rounded-md bg-card px-3 py-2 shadow-sm"
        >
          <span>{{ place.name }}</span>
          <span v-if="isToTest(place)" class="font-semibold text-primary" title="À tester">?</span>
        </li>
      </ul>
    </template>
  </div>
</template>
