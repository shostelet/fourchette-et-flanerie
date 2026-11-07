import { useRouter, type RouteLocationRaw } from 'vue-router'

/**
 * Panels with unsaved input (form, pin placement, review…): a tap on a map
 * marker or typing in the search bar must not navigate away from them.
 */
const LOCKED_ROUTES = new Set(['place-new', 'place-edit', 'home-edit', 'review', 'import'])

export function isLockedRoute(name: unknown): boolean {
  return LOCKED_ROUTES.has(String(name ?? ''))
}

/**
 * Navigation between the panels shown over the map (menu, place, review, tags…).
 *
 * Rule: one panel at a time, and closing it always returns to the map.
 * - `open` from the map adds a history entry (back = close);
 * - `open` from another panel replaces it, so panels never pile up.
 * - `openChild` is for sub-views of a panel (edit a place from its card, add a
 *   place from a search result): back returns to the parent panel.
 */
export function useOverlay() {
  const router = useRouter()

  function isOnMap(): boolean {
    return router.currentRoute.value.name === 'map'
  }

  function open(to: RouteLocationRaw): void {
    if (isOnMap()) void router.push(to)
    else void router.replace(to)
  }

  function openChild(to: RouteLocationRaw): void {
    void router.push(to)
  }

  /**
   * Leaves a sub-view for `to`, replacing its parent too: after saving a place
   * added from the search, the history is [map, place], not [map, search, place].
   */
  async function finishChild(to: RouteLocationRaw): Promise<void> {
    if (window.history.state?.back) {
      await new Promise<void>((resolve) => {
        const stop = router.afterEach(() => {
          stop()
          resolve()
        })
        router.back()
      })
    }
    await router.replace(to)
  }

  /** Back to the previous view (the map, or the parent of a sub-view). */
  function close(): void {
    if (isOnMap()) return
    if (window.history.state?.back) router.back()
    else void router.replace({ name: 'map' })
  }

  /** Opens `to`, or closes it when it is already the current panel (e.g. the menu button). */
  function toggle(to: { name: string }): void {
    if (router.currentRoute.value.name === to.name) close()
    else open(to)
  }

  return { open, openChild, finishChild, close, toggle }
}
