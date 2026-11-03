import { useRouter, type RouteLocationRaw } from 'vue-router'

/**
 * Navigation between the panels shown over the map (menu, place, review, tags…).
 *
 * Rule: one panel at a time, and closing it always returns to the map.
 * - `open` from the map adds a history entry (back = close);
 * - `open` from another panel replaces it, so panels never pile up.
 * - `openChild` is for sub-views of a panel (edit a place from its card):
 *   back returns to the parent panel, which is expected there.
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

  /** Back to the map (back in history when possible, see useCloseOverlay). */
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

  return { open, openChild, close, toggle }
}
