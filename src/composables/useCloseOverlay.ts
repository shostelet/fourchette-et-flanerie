import { useOverlay } from './useOverlay'

/**
 * Closes the current panel. Going back in history, rather than pushing the
 * map route, keeps the Android back gesture consistent. When the panel was
 * opened directly from a URL there is no previous entry: back to the map.
 */
export function useCloseOverlay(): () => void {
  return useOverlay().close
}
