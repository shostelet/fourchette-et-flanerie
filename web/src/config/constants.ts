import type { GeoPoint } from '@/domain/models'

/** Two places closer than this (with similar names) are suspected duplicates. */
export const DUPLICATE_RADIUS_METERS = 200

/** Radius around the map center for "new addresses" search results. */
export const SEARCH_RADIUS_METERS = 10_000

/** How long the last map position is restored on startup. */
export const MAP_VIEW_MEMORY_MS = 48 * 60 * 60 * 1000

/** From this zoom level on, places are never grouped on the map. */
export const CLUSTER_MAX_ZOOM = 15

/** Zoom level used when centering on home, on a place or on the user. */
export const DEFAULT_MAP_ZOOM = 15

/** Fallback view when there is no saved view and no home yet (Lyon). */
export const FALLBACK_MAP_CENTER: GeoPoint = { lat: 45.764, lng: 4.8357 }
export const FALLBACK_MAP_ZOOM = 12

/**
 * OpenFreeMap vector style: free, no API key. "positron" is a light,
 * desaturated style that lets the markers stand out.
 * Other styles: "liberty", "bright".
 */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

/** OpenFreeMap's dark style, for the dark theme. */
export const MAP_STYLE_DARK_URL = 'https://tiles.openfreemap.org/styles/dark'
