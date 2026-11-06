import type { Router } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useFiltersStore } from '@/stores/filters'

/**
 * Prevents the back gesture from closing the installed app (see installExitGuard).
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
    `protection ${guardInstalled ? 'active' : isStandalone() ? 'au premier toucher' : 'inactive'}`,
  ]
  return `${mode} (${details.join(', ')})`
}

/**
 * Call once the router is ready.
 *
 * Browsers skip, on "back", history entries the user never interacted with
 * (protection against back-button hijacking). So the guard can't be created
 * at startup: it waits for the first touch or key press on the map. The entry
 * the user just interacted with becomes the guard, and the map is pushed on
 * top of it; that entry is then never skipped.
 */
export function installExitGuard(router: Router): void {
  if (!isStandalone()) return

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

  let installing = false
  const events = ['pointerdown', 'keydown'] as const

  async function onFirstInteraction(): Promise<void> {
    if (installing || guardInstalled || router.currentRoute.value.name !== 'map') return
    installing = true
    try {
      // Same history slot (the one just interacted with), now the guard…
      await router.replace({ name: EXIT_GUARD_ROUTE })
      // …and the map on top of it.
      await router.push({ name: 'map' })
      guardInstalled = true
      events.forEach((type) => window.removeEventListener(type, onFirstInteraction, true))
    } finally {
      installing = false
    }
  }

  events.forEach((type) => window.addEventListener(type, onFirstInteraction, true))
}
