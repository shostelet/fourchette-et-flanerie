import type { RouteLocationNormalized, RouteLocationRaw, Router } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useFiltersStore } from '@/stores/filters'

/**
 * Prevents the back gesture from closing the installed app.
 *
 * Closing an installed web app with "back" is unreliable (Firefox for
 * Android may keep an empty, black window). So in standalone mode, an
 * invisible history entry sits below the map: going back to it sends the
 * user straight back to the map, with a hint on how to leave the app.
 *
 * History: [exit-guard, map, (overlays…)]
 */
export const EXIT_GUARD_ROUTE = 'exit-guard'

const EXIT_HINT = 'Pour quitter l’appli, utilise le geste Accueil.'

let installing = false

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** `beforeEnter` of the guard route. */
export function exitGuardBeforeEnter(
  _to: RouteLocationNormalized,
  from: RouteLocationNormalized,
): RouteLocationRaw | true {
  if (installing) return true
  const filters = useFiltersStore()
  if (filters.panelOpen) {
    // Back with the filters open: close them, nothing else.
    filters.panelOpen = false
  } else if (from.matched.length > 0) {
    // `from` has no match on the very first navigation (e.g. reload on the guard URL).
    useToast().show(EXIT_HINT)
  }
  return { name: 'map' }
}

/** Call once the router is ready, before mounting the app. */
export async function installExitGuard(router: Router): Promise<void> {
  if (!isStandalone() || router.currentRoute.value.name !== 'map') return
  installing = true
  try {
    await router.replace({ name: EXIT_GUARD_ROUTE })
  } finally {
    installing = false
  }
  await router.push({ name: 'map' })
}
