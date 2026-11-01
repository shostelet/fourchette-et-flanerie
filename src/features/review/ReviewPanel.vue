<script setup lang="ts">
import { Check, CircleCheck, Copy, Plus, X } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import RatingInput from '@/components/common/RatingInput.vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { PLACE_ICONS } from '@/config/place-icons'
import { CRITERION_LABELS } from '@/config/ratings'
import { nextTagColor } from '@/config/tag-colors'
import { CATEGORIES, type Category, type Tag } from '@/domain/models'
import { findDuplicate } from '@/domain/places'
import {
  correctionsFor,
  toggleTag,
  withCategory,
  type ReviewCorrections,
  type ReviewDecision,
} from '@/domain/review'
import { useMapController } from '@/features/map/map-controller'
import { usePlacesStore } from '@/stores/places'
import { useTagsStore } from '@/stores/tags'
import { useReviewSession, type QuickVisit } from './useReviewSession'

const REVIEW_ZOOM = 16

const close = useCloseOverlay()
const places = usePlacesStore()
const tags = useTagsStore()
const { flyTo, setFocus } = useMapController()
const { current, total, reviewedCount, remaining, onlySkippedLeft, decide, mergeInto, retrySkipped } =
  useReviewSession()

const sheet = useTemplateRef<HTMLElement>('sheet')
const body = useTemplateRef<HTMLElement>('body')
const tagInput = useTemplateRef<HTMLInputElement>('tagInput')
const draft = ref<ReviewCorrections>()
const visit = ref<QuickVisit>({})
const showVisitForm = ref(false)
const addingTag = ref(false)
const newTagName = ref('')
const busy = ref(false)

// A new place: reset the card and move the map to it.
watch(
  () => current.value?.id,
  () => {
    const place = current.value
    draft.value = place ? correctionsFor(place) : undefined
    visit.value = {}
    showVisitForm.value = false
    addingTag.value = false
    newTagName.value = ''
    body.value?.scrollTo({ top: 0 })
    if (place) {
      flyTo(place.location, REVIEW_ZOOM, { bottomPadding: sheet.value?.offsetHeight ?? 0 })
    }
  },
  { immediate: true, flush: 'post' },
)

// Highlight the place on the map, with the (possibly corrected) category and icon.
watch(
  [current, draft],
  ([place, corrections]) =>
    setFocus(
      place && corrections
        ? { location: place.location, label: place.name, icon: corrections.icon, category: corrections.category }
        : undefined,
    ),
  { immediate: true, deep: true },
)
onBeforeUnmount(() => setFocus(undefined))

/** Another saved place that looks like this one (name nearby, same OSM object). */
const lookalike = computed(() => {
  const place = current.value
  return place ? findDuplicate(place, places.items.filter((p) => p.id !== place.id)) : undefined
})

/** Tags of the selected category, plus the selected ones (even from the other category). */
const tagChoices = computed<Tag[]>(() => {
  const corrections = draft.value
  if (!corrections) return []
  const own = tags.forCategory(corrections.category)
  const carried = corrections.tagIds
    .map((id) => tags.byId.get(id))
    .filter((t): t is Tag => t !== undefined && t.category !== corrections.category)
  return [...carried, ...own]
})

// Card edits (functions rather than inline handlers, for type narrowing).
function setCategory(category: Category): void {
  if (draft.value) draft.value = withCategory(draft.value, category)
}

function setIcon(icon: string): void {
  if (draft.value) draft.value = { ...draft.value, icon }
}

function onToggleTag(tagId: string): void {
  if (draft.value) draft.value = toggleTag(draft.value, tagId)
}

async function startAddingTag(): Promise<void> {
  addingTag.value = true
  await nextTick()
  tagInput.value?.focus()
}

/** Creates the tag (or reuses one with the same name) and selects it. */
async function addTag(): Promise<void> {
  const name = newTagName.value.trim()
  const corrections = draft.value
  if (name && corrections) {
    const tag = await tags.create({
      category: corrections.category,
      name,
      color: nextTagColor(tags.items),
    })
    if (draft.value && !draft.value.tagIds.includes(tag.id)) {
      draft.value = toggleTag(draft.value, tag.id)
    }
  }
  newTagName.value = ''
  addingTag.value = false
}

async function openVisitForm(): Promise<void> {
  showVisitForm.value = true
  await nextTick()
  body.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

async function run(decision: ReviewDecision): Promise<void> {
  if (!draft.value || busy.value) return
  busy.value = true
  try {
    await decide(decision, draft.value, decision === 'visited' ? visit.value : {})
  } finally {
    busy.value = false
  }
}

async function mergeIntoLookalike(): Promise<void> {
  const target = lookalike.value
  if (!target || !draft.value || busy.value) return
  if (!window.confirm(`Fusionner dans « ${target.name} » et supprimer ce doublon ?`)) return
  busy.value = true
  try {
    await mergeInto(target, draft.value)
  } finally {
    busy.value = false
  }
}

const chip = (selected: boolean) =>
  selected
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-input bg-background text-foreground'
</script>

<template>
  <div class="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex max-h-[75%] flex-col">
    <section
      ref="sheet"
      aria-label="Passer en revue"
      :data-category="draft?.category"
      class="pointer-events-auto flex min-h-0 flex-col rounded-t-2xl bg-card shadow-[0_-8px_24px_rgb(0_0_0/0.12)]"
    >
      <header class="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <div>
          <h2 class="font-semibold">Passer en revue</h2>
          <p v-if="current" class="text-xs text-muted-foreground">
            {{ Math.min(reviewedCount + 1, total) }} / {{ total }}
            <span v-if="onlySkippedLeft"> · lieux passés</span>
          </p>
        </div>
        <Button variant="ghost" size="icon" class="rounded-full" aria-label="Fermer" @click="close">
          <X />
        </Button>
      </header>

      <!-- Progress bar -->
      <div class="h-1 shrink-0 bg-muted" aria-hidden="true">
        <div
          class="h-full bg-primary transition-[width]"
          :style="{ width: `${total ? (reviewedCount / total) * 100 : 100}%` }"
        />
      </div>

      <!-- Done -->
      <div v-if="!current" class="flex flex-col items-center gap-3 p-6 text-center">
        <CircleCheck class="size-10 text-primary" aria-hidden="true" />
        <p class="font-semibold">Aucun lieu à vérifier</p>
        <Button @click="close">Terminer</Button>
      </div>

      <template v-else-if="draft">
        <!-- Scrollable card -->
        <div ref="body" class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <p v-if="onlySkippedLeft" class="rounded-lg bg-muted p-3 text-sm">
            Il ne reste que des lieux passés ({{ remaining }}).
            <button type="button" class="font-medium text-primary underline" @click="retrySkipped">
              Recommencer depuis le premier
            </button>
            ou reprends plus tard.
          </p>

          <!-- Place -->
          <div class="flex items-start gap-3">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <AppIcon :name="draft.icon" class="size-5" />
            </span>
            <div class="min-w-0">
              <h3 class="text-lg leading-tight font-semibold">{{ current.name }}</h3>
              <p class="text-sm text-muted-foreground">{{ current.address }}</p>
              <p v-if="current.memo" class="mt-1 text-sm italic">« {{ current.memo }} »</p>
            </div>
          </div>

          <!-- Possible duplicate -->
          <div v-if="lookalike" class="space-y-2 rounded-lg border border-input bg-background p-3 text-sm">
            <p class="flex gap-2">
              <Copy class="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Ressemble à <strong>{{ lookalike.name }}</strong>, déjà enregistré
                <span class="text-muted-foreground">({{ lookalike.address }})</span>.
              </span>
            </p>
            <Button variant="outline" size="sm" :disabled="busy" @click="mergeIntoLookalike">
              C’est un doublon : fusionner
            </Button>
          </div>

          <!-- Quick visit, for "already tested": first, so it is visible right away -->
          <div v-if="showVisitForm" class="space-y-3 rounded-xl bg-muted/60 p-3">
            <p class="text-sm text-muted-foreground">Facultatif : une note et un souvenir de ta visite.</p>
            <div class="flex flex-wrap gap-x-6 gap-y-3">
              <RatingInput v-model="visit.quality" :label="CRITERION_LABELS.quality" />
              <RatingInput v-model="visit.value" :label="CRITERION_LABELS.value" />
            </div>
            <textarea
              v-model="visit.comment"
              rows="2"
              placeholder="Commentaire…"
              class="w-full rounded-lg border border-input bg-background p-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <!-- Quick fixes -->
          <div class="space-y-3">
            <div role="radiogroup" aria-label="Catégorie" class="flex gap-2">
              <button
                v-for="id in CATEGORIES"
                :key="id"
                type="button"
                role="radio"
                :aria-checked="draft.category === id"
                :data-category="id"
                class="flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
                :class="chip(draft.category === id)"
                @click="setCategory(id)"
              >
                <AppIcon :name="CATEGORY_DEFINITIONS[id].icon" class="size-4" />
                {{ CATEGORY_DEFINITIONS[id].label }}
              </button>
            </div>

            <div role="radiogroup" aria-label="Icône" class="flex gap-1 overflow-x-auto pb-1">
              <button
                v-for="option in PLACE_ICONS[draft.category]"
                :key="option.icon"
                type="button"
                role="radio"
                :aria-checked="draft.icon === option.icon"
                :aria-label="option.label"
                :title="option.label"
                class="flex size-10 shrink-0 items-center justify-center rounded-full border"
                :class="chip(draft.icon === option.icon)"
                @click="setIcon(option.icon)"
              >
                <AppIcon :name="option.icon" class="size-5" />
              </button>
            </div>

            <div class="flex flex-wrap items-center gap-1" aria-label="Tags">
              <button
                v-for="tag in tagChoices"
                :key="tag.id"
                type="button"
                :aria-pressed="draft.tagIds.includes(tag.id)"
                class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm"
                :class="chip(draft.tagIds.includes(tag.id))"
                @click="onToggleTag(tag.id)"
              >
                <span class="size-2.5 rounded-full" :style="{ backgroundColor: tag.color }" aria-hidden="true" />
                {{ tag.name }}
              </button>

              <!-- New tag -->
              <form
                v-if="addingTag"
                class="flex items-center gap-1 rounded-full border border-primary bg-background py-0.5 pr-0.5 pl-3"
                @submit.prevent="addTag"
              >
                <input
                  ref="tagInput"
                  v-model="newTagName"
                  type="text"
                  enterkeyhint="done"
                  placeholder="Nouveau tag"
                  aria-label="Nom du nouveau tag"
                  class="w-32 bg-transparent text-sm outline-none"
                  @keydown.esc="addingTag = false"
                />
                <button
                  type="submit"
                  class="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  aria-label="Ajouter le tag"
                >
                  <Check class="size-3.5" />
                </button>
              </form>
              <button
                v-else
                type="button"
                class="flex items-center gap-1 rounded-full border border-dashed border-input px-2.5 py-1 text-sm text-muted-foreground hover:text-foreground"
                @click="startAddingTag"
              >
                <Plus class="size-3.5" aria-hidden="true" />
                Tag
              </button>
            </div>
          </div>
        </div>

        <!-- Actions: always visible -->
        <footer class="shrink-0 border-t border-border p-3">
          <div v-if="showVisitForm" class="flex gap-2">
            <Button variant="ghost" class="flex-1" :disabled="busy" @click="showVisitForm = false">
              Annuler
            </Button>
            <Button class="flex-1" :disabled="busy" @click="run('visited')">Valider : déjà testé</Button>
          </div>
          <div v-else class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button :disabled="busy" @click="openVisitForm">Déjà testé</Button>
            <Button variant="secondary" :disabled="busy" @click="run('to-test')">À tester</Button>
            <Button variant="outline" :disabled="busy" @click="run('closed')">Fermé</Button>
            <Button variant="ghost" :disabled="busy" @click="run('skip')">Passer</Button>
          </div>
        </footer>
      </template>
    </section>
  </div>
</template>
