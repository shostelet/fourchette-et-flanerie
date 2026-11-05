import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { isLockedRoute, useOverlay } from './useOverlay'

const FOCUSABLE =
  'h2, button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Keyboard and screen reader behavior of the panels shown over the map:
 * - when a panel opens, focus moves into it (its title first), so screen
 *   readers announce it and keyboard users start there;
 * - when it closes, focus returns to what opened it (when still on screen);
 * - Escape closes the panel, except forms and the review (no data lost by accident).
 */
export function usePanelFocus(panel: Ref<HTMLElement | null | undefined>, onEscape?: () => boolean): void {
  const route = useRoute()
  const overlay = useOverlay()
  let opener: HTMLElement | null = null

  watch(
    () => route.name,
    async (name, previous) => {
      const isPanel = name !== 'map' && name !== 'list'
      if (isPanel && (previous === 'map' || previous === 'list')) {
        opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      }
      await nextTick()
      if (isPanel) {
        const target = panel.value?.querySelector<HTMLElement>(FOCUSABLE)
        if (target?.tagName === 'H2') target.tabIndex = -1
        target?.focus({ preventScroll: true })
      } else if (opener?.isConnected) {
        opener.focus({ preventScroll: true })
        opener = null
      }
    },
  )

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    if (onEscape?.()) return
    if (route.name === 'map' || route.name === 'list' || isLockedRoute(route.name)) return
    event.preventDefault()
    overlay.close()
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
