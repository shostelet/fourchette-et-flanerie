import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { DEFAULT_CATEGORY } from '@/config/categories'
import { isMapViewFresh, type MapView } from '@/domain/map-view'
import { CATEGORIES, type Category } from '@/domain/models'
import { TRAVEL_MODES, type TravelMode } from '@/domain/routing'
import { readJson, writeJson } from '@/utils/local-storage'

export type PlaceViewMode = 'compact' | 'expanded'

/**
 * Device-only preferences, kept in localStorage and never exported:
 * they describe this phone or this computer, not the user's data.
 */
export const usePreferencesStore = defineStore('preferences', () => {
  const storedCategory = readJson<string>('activeCategory', DEFAULT_CATEGORY)
  const activeCategory = ref<Category>(
    (CATEGORIES as readonly string[]).includes(storedCategory)
      ? (storedCategory as Category)
      : DEFAULT_CATEGORY,
  )
  watch(activeCategory, (value) => writeJson('activeCategory', value))

  /** Last mode chosen for the place detail: it opens the same way next time. */
  const placeView = ref<PlaceViewMode>(
    readJson<string>('placeView', 'expanded') === 'compact' ? 'compact' : 'expanded',
  )
  watch(placeView, (value) => writeJson('placeView', value))

  /** Last travel mode chosen for routes. */
  const storedMode = readJson<string>('travelMode', 'foot')
  const travelMode = ref<TravelMode>(
    (TRAVEL_MODES as readonly string[]).includes(storedMode) ? (storedMode as TravelMode) : 'foot',
  )
  watch(travelMode, (value) => writeJson('travelMode', value))

  /** Group nearby places into clusters when zoomed out. */
  const clusterMarkers = ref(readJson<boolean>('clusterMarkers', true) !== false)
  watch(clusterMarkers, (value) => writeJson('clusterMarkers', value))

  const lastMapView = ref<MapView | undefined>(readJson<MapView | undefined>('lastMapView', undefined))

  function saveMapView(view: Omit<MapView, 'savedAt'>): void {
    lastMapView.value = { ...view, savedAt: Date.now() }
    writeJson('lastMapView', lastMapView.value)
  }

  /** Last view if less than 48 h old, otherwise undefined (center on home). */
  function restorableMapView(now: number = Date.now()): MapView | undefined {
    return isMapViewFresh(lastMapView.value, now) ? lastMapView.value : undefined
  }

  return {
    activeCategory,
    placeView,
    travelMode,
    clusterMarkers,
    lastMapView,
    saveMapView,
    restorableMapView,
  }
})
