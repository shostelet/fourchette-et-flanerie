<script setup lang="ts">
import { Crosshair, LoaderCircle, MapPin, Plus, Trash2 } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import IconPicker from '@/components/common/IconPicker.vue'
import SheetPanel from '@/components/common/SheetPanel.vue'
import { Button } from '@/components/ui/button'
import { useCloseOverlay } from '@/composables/useCloseOverlay'
import { useToast } from '@/composables/useToast'
import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { DEFAULT_MAP_ZOOM } from '@/config/constants'
import { PLACE_ICONS } from '@/config/place-icons'
import { cleanText } from '@/domain/entities'
import { cleanLinks } from '@/domain/links'
import { CATEGORIES, type Category, type GeoPoint, type Id, type OsmRef, type PlaceSource } from '@/domain/models'
import { findDuplicate } from '@/domain/places'
import { useMapController } from '@/features/map/map-controller'
import TagPicker from '@/features/tags/TagPicker.vue'
import { useAppDataStore } from '@/stores/app-data'
import { usePlacesStore } from '@/stores/places'
import { usePreferencesStore } from '@/stores/preferences'
import { excludeKnown, type GeoResult } from '@/domain/geocoding'
import { useOverlay } from '@/composables/useOverlay'
import { useSearchStore } from '@/stores/search'
import { useTagsStore } from '@/stores/tags'
import { nearbyPlaces, reverseGeocode } from '@/services/photon'

/**
 * Add (no id) or edit (id) a place.
 * Two modes: "locate" (move the map under a crosshair to set the position)
 * and "form" (all the fields). A new place starts by locating it.
 */
const props = defineProps<{ id?: string }>()

const close = useCloseOverlay()
const router = useRouter()
const toast = useToast()
const appData = useAppDataStore()
const places = usePlacesStore()
const tags = useTagsStore()
const preferences = usePreferencesStore()
const { activeCategory } = storeToRefs(preferences)
const { flyTo, center, setFocus } = useMapController()

const existing = computed(() => (props.id ? places.get(props.id) : undefined))
const isNew = computed(() => !props.id)
const mode = ref<'locate' | 'form'>(props.id ? 'form' : 'locate')

// --- Form state --------------------------------------------------------------

const name = ref('')
const address = ref('')
const category = ref<Category>(activeCategory.value)
const icon = ref<string | undefined>(CATEGORY_DEFINITIONS[activeCategory.value].defaultPlaceIcon)
const tagIds = ref<Id[]>([])
const links = ref<string[]>([''])
const memo = ref('')
const location = ref<GeoPoint>()
// Kept from a search result, not edited in the form.
const osmRef = ref<OsmRef>()
const phone = ref<string>()
const openingHours = ref<string>()
const source = ref<PlaceSource>('manual')
const lookingUpAddress = ref(false)
/** Establishments found around a pin placed by hand, to pick from. */
const nearby = ref<GeoResult[]>([])
const nearbyStatus = ref<'idle' | 'loading' | 'done'>('idle')
const appliedResultKey = ref<string>()
const error = ref<string>()
const busy = ref(false)

// Fill the form once the place is known (edit mode).
watch(
  existing,
  (place, previous) => {
    if (!place || previous) return
    name.value = place.name
    address.value = place.address
    category.value = place.category
    icon.value = place.icon
    tagIds.value = [...place.tagIds]
    links.value = place.links.length ? place.links.map((l) => l.url) : ['']
    memo.value = place.memo ?? ''
    location.value = { ...place.location }
  },
  { immediate: true },
)

/** Pre-fills the form with an OSM result (from the search, or picked near the pin). */
function applyResult(result: GeoResult): void {
  const resultCategory = result.category ?? category.value
  name.value = result.kind === 'place' ? result.name : name.value
  address.value = result.kind === 'place' ? result.address : result.name
  category.value = resultCategory
  icon.value = result.icon ?? CATEGORY_DEFINITIONS[resultCategory].defaultPlaceIcon
  if (result.links.length) links.value = result.links.map((l) => l.url)
  location.value = result.location
  osmRef.value = result.osmRef
  phone.value = result.phone
  openingHours.value = result.openingHours
  source.value = 'search'
  activeCategory.value = resultCategory
  appliedResultKey.value = result.key
}

// A new address picked in the search results: everything is pre-filled.
const fromSearch = isNew.value ? useSearchStore().takePendingResult() : undefined
if (fromSearch) {
  applyResult(fromSearch)
  mode.value = 'form'
}
// Nothing found in the search: the typed text becomes the name, the pin is
// placed by hand (the address then comes from the pin).
if (isNew.value && !fromSearch) name.value = useSearchStore().takePendingName() ?? ''
const { finishChild } = useOverlay()

// Unknown place (wrong URL, deleted…): back to the map.
watch(
  () => appData.ready && props.id !== undefined && !existing.value,
  (missing) => missing && close(),
  { immediate: true },
)

function setCategory(value: Category): void {
  if (value === category.value) return
  category.value = value
  icon.value = CATEGORY_DEFINITIONS[value].defaultPlaceIcon
}

// Show the place being edited on the map, with its current look.
watch(
  [location, icon, category, name],
  () =>
    setFocus(
      location.value && mode.value === 'form'
        ? {
            location: location.value,
            icon: icon.value ?? CATEGORY_DEFINITIONS[category.value].defaultPlaceIcon,
            label: name.value || 'Nouveau lieu',
            category: category.value,
          }
        : undefined,
    ),
  { immediate: true },
)
watch(mode, (value) => {
  if (value === 'locate') setFocus(undefined)
})
onBeforeUnmount(() => setFocus(undefined))

// --- Locate mode -------------------------------------------------------------

function startLocating(): void {
  if (location.value) flyTo(location.value, DEFAULT_MAP_ZOOM)
  // Show the markers of the place's own category while placing it.
  activeCategory.value = category.value
  mode.value = 'locate'
}

// While placing the pin, switching category in the header means
// "oops, it's actually a restaurant / a shop": the place follows.
watch(activeCategory, (value) => {
  if (mode.value === 'locate') setCategory(value)
})

function confirmLocation(): void {
  const point = center()
  if (!point) return
  location.value = point
  mode.value = 'form'
  if (!address.value.trim()) void fillAddressFrom(point)
  if (isNew.value && !fromSearch) void findNearby(point)
}

/** Lists the establishments under the pin (not already saved). */
async function findNearby(point: GeoPoint): Promise<void> {
  nearbyStatus.value = 'loading'
  nearby.value = []
  try {
    nearby.value = excludeKnown(await nearbyPlaces(point), places.items).slice(0, 6)
  } catch {
    nearby.value = []
  } finally {
    nearbyStatus.value = 'done'
  }
}

/** Suggests the address of a pin placed by hand (reverse geocoding). */
async function fillAddressFrom(point: GeoPoint): Promise<void> {
  lookingUpAddress.value = true
  try {
    const found = await reverseGeocode(point)
    // Don't overwrite what the user typed meanwhile.
    if (found && !address.value.trim()) address.value = found.kind === 'address' ? found.name : found.address
  } catch {
    // No suggestion: the address stays to be typed.
  } finally {
    lookingUpAddress.value = false
  }
}

function cancelLocating(): void {
  if (location.value) mode.value = 'form'
  else close()
}

// --- Save --------------------------------------------------------------------

async function save(): Promise<void> {
  error.value = undefined
  const trimmedName = name.value.trim()
  if (!trimmedName) {
    error.value = 'Le nom est obligatoire.'
    return
  }
  if (!location.value) {
    error.value = 'Place le lieu sur la carte.'
    return
  }
  const { links: cleanedLinks, invalid } = cleanLinks(links.value)
  if (invalid.length) {
    error.value = `Lien invalide : ${invalid.join(', ')}`
    return
  }

  if (isNew.value) {
    const duplicate = findDuplicate(
      { name: trimmedName, location: location.value, osmRef: osmRef.value },
      places.items,
    )
    if (duplicate && !window.confirm(`« ${duplicate.name} » est déjà enregistré tout près. Créer quand même ?`)) {
      return
    }
  }

  busy.value = true
  try {
    const fields = {
      category: category.value,
      name: trimmedName,
      address: address.value.trim(),
      location: location.value,
      icon: icon.value ?? CATEGORY_DEFINITIONS[category.value].defaultPlaceIcon,
      tagIds: await tags.moveToCategory(tagIds.value, category.value),
      links: cleanedLinks,
      memo: cleanText(memo.value),
    }
    const searchFields = {
      osmRef: osmRef.value,
      phone: phone.value,
      openingHours: openingHours.value,
    }

    if (existing.value) {
      await places.update(existing.value.id, fields)
      toast.show('Lieu enregistré')
      close()
    } else {
      const place = await places.create({ ...fields, ...searchFields, source: source.value })
      // Show it right away, as a compact card centered on the map.
      activeCategory.value = place.category
      preferences.placeView = 'compact'
      toast.show('Lieu ajouté')
      // The card keeps the pin visible. From the search, the results are left
      // behind: closing the card returns to the map.
      const target = { name: 'place', params: { id: place.id } }
      if (fromSearch) await finishChild(target)
      else await router.replace(target)
    }
  } finally {
    busy.value = false
  }
}

const inputClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring'
</script>

<template>
  <!-- Locate: crosshair over the map, which stays usable -->
  <div v-if="mode === 'locate'" class="pointer-events-none absolute inset-0 z-20" :data-category="category">
    <p class="pointer-events-auto mx-auto mt-3 w-fit max-w-[90%] rounded-full bg-card px-4 py-2 text-center text-sm shadow-lg">
      Déplace la carte pour placer le lieu sous le repère
    </p>
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-primary drop-shadow-md" aria-hidden="true">
      <MapPin class="size-10 fill-card" />
    </div>
    <div class="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center gap-2 p-3">
      <Button variant="secondary" class="shadow-lg" @click="cancelLocating">Annuler</Button>
      <Button class="shadow-lg" @click="confirmLocation">
        <Crosshair />
        Valider la position
      </Button>
    </div>
  </div>

  <!-- Form -->
  <SheetPanel
    v-else
    :title="isNew ? 'Ajouter un lieu' : 'Modifier le lieu'"
    :data-category="category"
    @close="close"
  >
    <form id="place-form" class="mx-auto max-w-xl space-y-5" @submit.prevent="save">
      <!-- Establishments under a pin placed by hand -->
      <section v-if="nearbyStatus !== 'idle'" class="space-y-2" aria-live="polite">
        <p v-if="nearbyStatus === 'loading'" class="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle class="size-4 animate-spin" aria-hidden="true" />
          Recherche des établissements à cet endroit…
        </p>
        <p v-else-if="!nearby.length" class="text-sm text-muted-foreground">
          Aucun établissement connu à cet endroit.
        </p>
        <h3 v-else class="text-sm font-medium">Établissements à cet endroit</h3>
        <div v-if="nearby.length" class="flex flex-wrap gap-1">
          <button
            v-for="result in nearby"
            :key="result.key"
            type="button"
            :data-category="result.category ?? category"
            :aria-pressed="appliedResultKey === result.key"
            class="flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-sm"
            :class="
              appliedResultKey === result.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input bg-background hover:bg-accent'
            "
            @click="applyResult(result)"
          >
            <AppIcon v-if="result.icon" :name="result.icon" class="size-3.5 shrink-0" />
            <span class="truncate">{{ result.name }}</span>
          </button>
        </div>
      </section>

      <div role="group" aria-label="Catégorie" class="flex gap-2">
        <button
          v-for="id in CATEGORIES"
          :key="id"
          type="button"
          :aria-pressed="category === id"
          :data-category="id"
          class="flex flex-1 items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium"
          :class="
            category === id
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background text-foreground'
          "
          @click="setCategory(id)"
        >
          <AppIcon :name="CATEGORY_DEFINITIONS[id].icon" class="size-4" />
          {{ CATEGORY_DEFINITIONS[id].label }}
        </button>
      </div>

      <label class="block space-y-1">
        <span class="text-sm font-medium">Nom</span>
        <input v-model="name" type="text" required autocomplete="off" :class="inputClass" />
      </label>

      <label class="block space-y-1">
        <span class="text-sm font-medium">Adresse</span>
        <input
          v-model="address"
          type="text"
          autocomplete="off"
          :placeholder="lookingUpAddress ? 'Recherche de l’adresse…' : undefined"
          :class="inputClass"
        />
      </label>

      <div class="space-y-1">
        <span class="text-sm font-medium">Position</span>
        <div class="flex items-center gap-2">
          <span class="flex-1 text-sm text-muted-foreground">
            {{ location ? 'Placé sur la carte' : 'Pas encore placé' }}
          </span>
          <Button type="button" variant="outline" size="sm" @click="startLocating">
            <Crosshair />
            {{ location ? 'Déplacer' : 'Placer sur la carte' }}
          </Button>
        </div>
      </div>

      <div class="space-y-1">
        <span class="text-sm font-medium">Icône</span>
        <IconPicker v-model="icon" :options="PLACE_ICONS[category]" label="Icône du lieu" wrap />
      </div>

      <div class="space-y-1">
        <span class="text-sm font-medium">Tags</span>
        <TagPicker v-model="tagIds" :category="category" />
      </div>

      <div class="space-y-2">
        <span class="text-sm font-medium">Liens (site, Instagram…)</span>
        <div v-for="(_, index) in links" :key="index" class="flex gap-2">
          <input
            v-model="links[index]"
            type="text"
            inputmode="url"
            autocapitalize="off"
            spellcheck="false"
            autocomplete="off"
            placeholder="lemusee.fr, instagram.com/…"
            :aria-label="`Lien ${index + 1}`"
            :class="inputClass"
          />
          <Button
            v-if="links.length > 1 || links[0]"
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0 rounded-full"
            aria-label="Retirer ce lien"
            @click="links.length > 1 ? links.splice(index, 1) : (links[0] = '')"
          >
            <Trash2 />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          :disabled="links.some((link) => !link.trim())"
          @click="links.push('')"
        >
          <Plus />
          Ajouter un lien
        </Button>
      </div>

      <label class="block space-y-1">
        <span class="text-sm font-medium">Mémo</span>
        <textarea
          v-model="memo"
          rows="3"
          placeholder="Conseillé par…, à essayer : …"
          class="w-full rounded-lg border border-input bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <p v-if="error" role="alert" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        {{ error }}
      </p>
    </form>

    <template #footer>
      <Button variant="ghost" :disabled="busy" @click="close">Annuler</Button>
      <Button type="submit" form="place-form" :disabled="busy">
        {{ isNew ? 'Ajouter' : 'Enregistrer' }}
      </Button>
    </template>
  </SheetPanel>
</template>
