<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'
import { AttributionControl, Map as MapLibreMap, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { storeToRefs } from 'pinia'
import { h, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useGeolocation } from '@/composables/useGeolocation'
import { useOverlay } from '@/composables/useOverlay'
import {
  DEFAULT_MAP_ZOOM,
  FALLBACK_MAP_CENTER,
  FALLBACK_MAP_ZOOM,
  MAP_STYLE_URL,
} from '@/config/constants'
import type { GeoPoint, Home, Place } from '@/domain/models'
import { isToTest } from '@/domain/places'
import { useHomeStore } from '@/stores/home'
import { usePlacesStore } from '@/stores/places'
import { usePreferencesStore } from '@/stores/preferences'
import LocateButton from './LocateButton.vue'
import MapPin from './MapPin.vue'
import UserLocationDot from './UserLocationDot.vue'
import { useMapController, type MapFocus } from './map-controller'
import { useMapMarkers } from './useMapMarkers'

// MapLibre parses tiles in a Web Worker; Vite needs to know where it is.
setWorkerUrl(workerUrl)

const container = useTemplateRef<HTMLDivElement>('container')
const router = useRouter()
const overlay = useOverlay()

/** Panels where a tap on a marker must not navigate away (unsaved form, pin placement…). */
const LOCKED_ROUTES = new Set(['place-new', 'place-edit', 'review', 'import'])

/** A marker opens its card in place of the current panel (one panel at a time). */
function openFromMap(to: RouteLocationRaw): void {
  const current = String(router.currentRoute.value.name ?? '')
  if (!LOCKED_ROUTES.has(current)) overlay.open(to)
}
const controller = useMapController()
const preferences = usePreferencesStore()
const places = usePlacesStore()
const { home } = storeToRefs(useHomeStore())
const { activeCategory } = storeToRefs(preferences)
const { position } = useGeolocation()

/** Last view if less than 48 h old, otherwise home, otherwise Lyon. */
function initialView(): { center: GeoPoint; zoom: number } {
  const saved = preferences.restorableMapView()
  if (saved) return saved
  if (home.value) return { center: home.value.location, zoom: DEFAULT_MAP_ZOOM }
  return { center: FALLBACK_MAP_CENTER, zoom: FALLBACK_MAP_ZOOM }
}

onMounted(() => {
  const view = initialView()
  const map = new MapLibreMap({
    container: container.value!,
    style: MAP_STYLE_URL,
    center: [view.center.lng, view.center.lat],
    zoom: view.zoom,
    attributionControl: false,
    // A flat, north-up map: simpler on a phone.
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  })
  map.touchZoomRotate.disableRotation()
  map.addControl(new AttributionControl({ compact: true }), 'bottom-left')

  // The camera only moves when the user moves it (or taps a button):
  // we just remember where they left it.
  map.on('moveend', () => {
    const { lng, lat } = map.getCenter()
    preferences.saveMapView({ center: { lat, lng }, zoom: map.getZoom() })
  })

  controller.attach(map)
})

onBeforeUnmount(() => {
  controller.map.value?.remove()
  controller.detach()
})

// --- Markers ---------------------------------------------------------------

useMapMarkers<Place>(() => places.activeIn(activeCategory.value), {
  key: (p) => p.id,
  version: (p) => p.updatedAt,
  position: (p) => p.location,
  render: (p) => h(MapPin, { icon: p.icon, label: p.name, toTest: isToTest(p) }),
  onClick: (p) => openFromMap({ name: 'place', params: { id: p.id } }),
})

useMapMarkers<Home>(() => (home.value ? [home.value] : []), {
  key: () => 'home',
  version: (value) => `${value.location.lat},${value.location.lng}`,
  position: (value) => value.location,
  render: () => h(MapPin, { icon: 'house', label: 'Maison', variant: 'home' }),
  onClick: () => openFromMap({ name: 'home' }),
})

// Place highlighted by a panel (review…), drawn on top with its own category color.
useMapMarkers<MapFocus>(() => (controller.focus.value ? [controller.focus.value] : []), {
  key: () => 'focus',
  version: (f) => `${f.location.lat},${f.location.lng},${f.icon},${f.category},${f.variant}`,
  position: (f) => f.location,
  render: (f) =>
    h('div', { 'data-category': f.category }, [
      h(MapPin, { icon: f.icon, label: f.label, variant: f.variant, highlighted: true }),
    ]),
})

useMapMarkers<GeoPoint>(() => (position.value ? [position.value] : []), {
  key: () => 'me',
  version: (p) => `${p.lat},${p.lng}`,
  position: (p) => p,
  render: () => h(UserLocationDot),
  anchor: 'center',
})
</script>

<template>
  <!-- Positioning lives on a wrapper: MapLibre forces `position: relative`
       on its own container, which would override Tailwind classes. -->
  <div class="absolute inset-0">
    <div ref="container" class="size-full" />
  </div>
  <LocateButton />
</template>
