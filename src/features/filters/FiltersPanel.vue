<script setup lang="ts">
import { RotateCcw, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import TagChip from '@/components/common/TagChip.vue'
import { Button } from '@/components/ui/button'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import type { StatusFilter } from '@/domain/filters'
import { pluralize } from '@/domain/format'
import { useFiltersStore } from '@/stores/filters'
import { usePreferencesStore } from '@/stores/preferences'
import { useTagsStore } from '@/stores/tags'

/** Filters, applied live over the base view (map or list), which stays visible. */
const filters = useFiltersStore()
const { status, showClosed, current, activeCount, visiblePlaces, panelOpen } = storeToRefs(filters)
const tags = useTagsStore()
const { activeCategory } = storeToRefs(usePreferencesStore())

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'to-test', label: 'À tester' },
  { value: 'visited', label: 'Déjà testés' },
]

const categoryTags = computed(() => tags.forCategory(activeCategory.value))
const selectedTagIds = computed(() => new Set(current.value.tagIds))

const chip = (selected: boolean) =>
  selected
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background text-foreground hover:bg-accent'
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex max-h-[70%] flex-col">
    <section
      aria-label="Filtres"
      class="pointer-events-auto flex min-h-0 flex-col rounded-t-2xl bg-card shadow-[0_-8px_24px_rgb(0_0_0/0.12)]"
    >
      <header class="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div>
          <h2 class="font-semibold">Filtres {{ CATEGORY_DEFINITIONS[activeCategory].label }}</h2>
          <p class="text-xs text-muted-foreground" aria-live="polite">
            {{ pluralize(visiblePlaces.length, 'lieu affiché', 'lieux affichés') }}
          </p>
        </div>
        <div class="flex items-center gap-1">
          <Button v-if="activeCount" variant="ghost" size="sm" @click="filters.reset()">
            <RotateCcw />
            Réinitialiser
          </Button>
          <Button variant="ghost" size="icon" class="rounded-full" aria-label="Fermer les filtres" @click="panelOpen = false">
            <X />
          </Button>
        </div>
      </header>

      <div class="min-h-0 space-y-5 overflow-y-auto p-4">
        <div role="radiogroup" aria-label="Statut" class="flex rounded-full bg-muted p-1">
          <button
            v-for="option in STATUS_OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="status === option.value"
            class="flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
            :class="
              status === option.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            "
            @click="status = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <label class="flex items-center justify-between gap-3">
          <span class="text-sm font-medium">Afficher les lieux fermés</span>
          <input v-model="showClosed" type="checkbox" class="size-5 accent-primary" />
        </label>

        <section v-if="categoryTags.length" class="space-y-2">
          <h3 class="text-sm font-medium">
            Tags
            <span class="font-normal text-muted-foreground">(au moins un)</span>
          </h3>
          <div class="flex flex-wrap gap-1" role="group" aria-label="Tags">
            <button
              v-for="tag in categoryTags"
              :key="tag.id"
              type="button"
              :aria-pressed="selectedTagIds.has(tag.id)"
              class="rounded-full border px-2.5 py-1 text-sm"
              :class="chip(selectedTagIds.has(tag.id))"
              @click="filters.toggleTag(tag.id)"
            >
              <TagChip :tag="tag" />
            </button>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>
