<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'
import { AttributionControl, Map as MapLibreMap, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { storeToRefs } from 'pinia'
import { computed, h, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useGeolocation } from '@/composables/useGeolocation'
import { isLockedRoute, useOverlay } from '@/composables/useOverlay'
import {
  CLUSTER_MAX_ZOOM,
  DEFAULT_MAP_ZOOM,
  FALLBACK_MAP_CENTER,
  FALLBACK_MAP_ZOOM,
  MAP_STYLE_URL,
} from '@/config/constants'
import type { GeoPoint, Home, Place } from '@/domain/models'
import { clusterPoints, type Clustered } from '@/domain/clustering'
import { isClosed, isToTest } from '@/domain/places'
import { useFiltersStore } from '@/stores/filters'
import { useHomeStore } from '@/stores/home'
import { usePreferencesStore } from '@/stores/preferences'
import ViewToolbar from '@/features/list/ViewToolbar.vue'
import RouteModeBanner from '@/features/routing/RouteModeBanner.vue'
import ClusterBubble from './ClusterBubble.vue'
import LocateButton from './LocateButton.vue'
import MapPin from './MapPin.vue'
import UserLocationDot from './UserLocationDot.vue'
import { useMapController, type MapFocus, type MapRoute } from './map-controller'
import { useMapMarkers } from './useMapMarkers'
import { hideSplash } from '@/utils/splash'

// MapLibre parses tiles in a Web Worker; Vite needs to know where it is.
setWorkerUrl(workerUrl)

const container = useTemplateRef<HTMLDivElement>('container')
const router = useRouter()
const overlay = useOverlay()

/** A marker opens its card in place of the current panel (one panel at a time). */
function openFromMap(to: RouteLocationRaw): void {
  if (!isLockedRoute(router.currentRoute.value.name)) overlay.open(to)
}
const controller = useMapController()
const preferences = usePreferencesStore()
const filters = useFiltersStore()
const { home } = storeToRefs(useHomeStore())
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
  zoomLevel.value = Math.floor(map.getZoom())
  map.on('zoomend', () => {
    zoomLevel.value = Math.floor(map.getZoom())
  })

  map.on('moveend', () => {
    const { lng, lat } = map.getCenter()
    preferences.saveMapView({ center: { lat, lng }, zoom: map.getZoom() })
  })

  // Route line, below the markers (which are HTML elements on top of the map).
  map.on('load', () => {
    // Data is loaded (the map waits for it) and the map is drawn: the app is ready.
    hideSplash()
    map.addSource(ROUTE_SOURCE, { type: 'geojson', data: routeData(controller.route.value) })
    map.addLayer({
      id: 'route-casing',
      type: 'line',
      source: ROUTE_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 },
    })
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: ROUTE_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 4.5 },
    })
  })

  controller.attach(map)
})

// --- Route -----------------------------------------------------------------

const ROUTE_SOURCE = 'route'

function routeData(route: MapRoute | undefined): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: route
      ? [
          {
            type: 'Feature',
            properties: { color: route.color },
            geometry: { type: 'LineString', coordinates: route.geometry },
          },
        ]
      : [],
  }
}

watch(controller.route, (route) => {
  const source = controller.map.value?.getSource<GeoJSONSource>(ROUTE_SOURCE)
  source?.setData(routeData(route))
})

onBeforeUnmount(() => {
  controller.map.value?.remove()
  controller.detach()
})

// --- Markers ---------------------------------------------------------------

// Markers follow the filters (shared with the list). When zoomed out, nearby
// places are grouped (grid per whole zoom level, recomputed after each zoom).
const zoomLevel = ref(0)

const grouped = computed(() => {
  if (controller.zen.value) return []
  // The open place has its own highlighted pin: keep it out of the clusters.
  const focusedId = controller.focus.value?.placeId
  const visible = focusedId
    ? filters.visiblePlaces.filter((p) => p.id !== focusedId)
    : filters.visiblePlaces
  return preferences.clusterMarkers
    ? clusterPoints(visible, (p) => p.location, zoomLevel.value, { maxZoom: CLUSTER_MAX_ZOOM })
    : visible.map((item) => ({ kind: 'single' as const, item }))
})
const singles = computed(() => grouped.value.flatMap((g) => (g.kind === 'single' ? [g.item] : [])))
const clusters = computed(() =>
  grouped.value.flatMap((g) => (g.kind === 'cluster' ? [g] : [])),
)

useMapMarkers<Place>(() => singles.value, {
  key: (p) => p.id,
  version: (p) => p.updatedAt,
  position: (p) => p.location,
  render: (p) =>
    h(MapPin, { icon: p.icon, label: p.name, toTest: !isClosed(p) && isToTest(p), closed: isClosed(p) }),
  onClick: (p) => openFromMap({ name: 'place', params: { id: p.id } }),
})

type Cluster = Extract<Clustered<Place>, { kind: 'cluster' }>
useMapMarkers<Cluster>(() => clusters.value, {
  key: (c) => c.key,
  version: (c) => String(c.items.length),
  position: (c) => c.location,
  render: (c) => h(ClusterBubble, { count: c.items.length }),
  anchor: 'center',
  // Zoom just enough to split the group.
  onClick: (c) => controller.fitPoints(c.items.map((p) => p.location), CLUSTER_MAX_ZOOM),
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
  <RouteModeBanner v-if="controller.zen.value" />
  <ViewToolbar v-else class="absolute top-3 right-3 z-10" />
  <LocateButton />
</template>
