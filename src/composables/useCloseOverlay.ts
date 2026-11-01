import { useRouter } from 'vue-router'

/**
 * Closes an overlay (menu, place detail…) that has its own route.
 *
 * Going back in history, rather than pushing the map route, keeps the
 * Android back gesture consistent. When the overlay was opened directly
 * from a URL there is no previous entry, so we replace with the map.
 */
export function useCloseOverlay(): () => void {
  const router = useRouter()

  return () => {
    const hasPreviousEntry = Boolean(window.history.state?.back)
    if (hasPreviousEntry) router.back()
    else void router.replace({ name: 'map' })
  }
}
