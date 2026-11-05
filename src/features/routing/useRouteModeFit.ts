import { nextTick, watch, type Ref } from 'vue'
import { useMapController } from '@/features/map/map-controller'

/**
 * Frames the route above `panel` once per activation of route mode: as soon
 * as the mode is on and the route is known. After that the user is in charge:
 * a route recomputed while walking (the GPS position moved) never moves the map.
 */
export function useRouteModeFit(panel: Ref<HTMLElement | null | undefined>): void {
  const { zen, route, fitRoute } = useMapController()
  let framed = false

  watch(zen, (on) => {
    if (on) framed = false
  })

  watch(
    [zen, route],
    async ([on, current]) => {
      if (!on || !current || framed) return
      framed = true
      await nextTick()
      const card = panel.value?.querySelector('article') ?? panel.value
      if (card) fitRoute(card.getBoundingClientRect().top)
    },
    { flush: 'post' },
  )
}
