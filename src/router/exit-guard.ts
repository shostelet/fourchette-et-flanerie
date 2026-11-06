import type { Router } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useFiltersStore } from '@/stores/filters'

/**
 * Prevents the back gesture from closing the installed app.
 *
 * Closing an installed web app with "back" is unreliable (Firefox for
 * Android may keep an empty, black window). So in the installed app, an
 * invisible history entry sits below the map. Going back to it pushes the
 * map again on top of it, with a hint on how to leave the app: the guard
 * entry always stays in place, for every following "back".
 *
 * History: [exit-guard, map, (overlays…)]
 */
export const EXIT_GUARD_ROUTE = 'exit-guard'

const EXIT_HINT = 'Pour quitter l’appli, utilise le geste Accueil.'

/** Marker in the manifest's start_url: the app was launched from its icon. */
const LAUNCHED_AS_APP = new URLSearchParams(window.location.search).has('app')
const DISPLAY_STANDALONE = window.matchMedia?.('(display-mode: standalone)').matches ?? false

let guardInstalled = false

export function isStandalone(): boolean {
  return (
    LAUNCHED_AS_APP ||
    DISPLAY_STANDALONE ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** For the diagnostic line of the menu. */
export function launchInfo(): string {
  const mode = isStandalone() ? 'appli installée' : 'onglet'
  const details = [
    `marqueur ${LAUNCHED_AS_APP ? 'oui' : 'non'}`,
    `standalone ${DISPLAY_STANDALONE ? 'oui' : 'non'}`,
    `protection ${guardInstalled ? 'active' : 'inactive'}`,
  ]
  return `${mode} (${details.join(', ')})`
}

/** Call once the router is ready, before mounting the app. */
export async function installExitGuard(router: Router): Promise<void> {
  if (!isStandalone() || router.currentRoute.value.name !== 'map') return

  // Back on the guard entry: put the map back on top of it.
  router.afterEach((to, from) => {
    if (to.name !== EXIT_GUARD_ROUTE || !guardInstalled) return
    const filters = useFiltersStore()
    if (filters.panelOpen) {
      // Back with the filters open: close them, nothing else.
      filters.panelOpen = false
    } else if (from.matched.length > 0) {
      useToast().show(EXIT_HINT)
    }
    void router.push({ name: 'map' })
  })

  await router.replace({ name: EXIT_GUARD_ROUTE })
  await router.push({ name: 'map' })
  guardInstalled = true
}
