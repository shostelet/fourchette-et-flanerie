import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { useGeolocation } from '@/composables/useGeolocation'
import type { GeoPoint } from '@/domain/models'
import { roundedKey, TRAVEL_MODES, type TravelMode, type TravelRoute } from '@/domain/routing'
import { useMapController } from '@/features/map/map-controller'
import { fetchRoute } from '@/services/osrm'
import { useHomeStore } from '@/stores/home'
import { usePreferencesStore } from '@/stores/preferences'

export type RouteState =
  | { status: 'loading' }
  | { status: 'done'; route: TravelRoute }
  | { status: 'none' }
  | { status: 'error' }

/**
 * Walking and cycling routes to a destination, from your position when
 * geolocation is on, otherwise from home. The selected mode's route is drawn
 * on the map while the component using this is mounted.
 */
export function useTravelRoutes(
  destination: Ref<GeoPoint | undefined>,
  options: { color: Ref<string>; allowHomeOrigin?: boolean },
) {
  const { position } = useGeolocation()
  const { home } = storeToRefs(useHomeStore())
  const { travelMode } = storeToRefs(usePreferencesStore())
  const { setRoute } = useMapController()

  const origin = computed<{ point: GeoPoint; label: string } | undefined>(() => {
    if (position.value) return { point: position.value, label: 'Depuis ta position' }
    if (options.allowHomeOrigin !== false && home.value) {
      return { point: home.value.location, label: 'Depuis la maison' }
    }
    return undefined
  })

  const states = ref<Partial<Record<TravelMode, RouteState>>>({})

  async function load(mode: TravelMode, from: GeoPoint, to: GeoPoint, isCurrent: () => boolean) {
    states.value = { ...states.value, [mode]: { status: 'loading' } }
    let state: RouteState
    try {
      const route = await fetchRoute(mode, from, to)
      state = route ? { status: 'done', route } : { status: 'none' }
    } catch {
      state = { status: 'error' }
    }
    if (isCurrent()) states.value = { ...states.value, [mode]: state }
  }

  // Recompute when the origin moves ~100 m or the destination changes.
  let generation = 0
  watch(
    () => {
      const from = origin.value?.point
      const to = destination.value
      return from && to ? `${roundedKey(from)}|${to.lat},${to.lng}` : ''
    },
    async (key) => {
      const current = ++generation
      states.value = {}
      const from = origin.value?.point
      const to = destination.value
      if (!key || !from || !to) return
      // Selected mode first: the other one waits for the 1 request/s limit.
      const modes = [travelMode.value, ...TRAVEL_MODES.filter((m) => m !== travelMode.value)]
      for (const mode of modes) await load(mode, from, to, () => current === generation)
    },
    { immediate: true },
  )

  const selected = computed(() => {
    const state = states.value[travelMode.value]
    return state?.status === 'done' ? state.route : undefined
  })

  watch(
    [selected, options.color],
    ([route, color]) => setRoute(route ? { geometry: route.geometry, color } : undefined),
    { immediate: true },
  )
  onBeforeUnmount(() => setRoute(undefined))

  return { origin, states, travelMode, selected }
}
