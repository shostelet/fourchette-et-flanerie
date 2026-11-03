import { isDeleted } from './entities'
import type { Category, GeoPoint, Id, Place } from './models'
import { distanceMeters, isClosed } from './places'
import type { PlaceRatings } from './ratings'
import { compareText } from './text'

export type StatusFilter = 'all' | 'to-test' | 'visited'

export interface PlaceFilters {
  status: StatusFilter
  /** Places having at least one of these tags. Empty = no tag filter. */
  tagIds: Id[]
  /** Closed places are hidden unless asked for. */
  showClosed: boolean
}

export const DEFAULT_FILTERS: PlaceFilters = { status: 'all', tagIds: [], showClosed: false }

/** Number of active filters, for the badge on the filter button. */
export function countActiveFilters(filters: PlaceFilters): number {
  return (filters.status !== 'all' ? 1 : 0) + (filters.showClosed ? 1 : 0) + filters.tagIds.length
}

/** Places of a category matching the filters (deleted places never match). */
export function filterPlaces(
  places: readonly Place[],
  category: Category,
  filters: PlaceFilters,
): Place[] {
  const tagIds = new Set(filters.tagIds)
  return places.filter((place) => {
    if (place.category !== category || isDeleted(place)) return false
    if (isClosed(place) && !filters.showClosed) return false
    if (filters.status === 'to-test' && place.visited) return false
    if (filters.status === 'visited' && !place.visited) return false
    if (tagIds.size && !place.tagIds.some((id) => tagIds.has(id))) return false
    return true
  })
}

export type PlaceSort = 'distance' | 'name' | 'recent' | 'quality' | 'value'

export interface SortContext {
  /** Reference point for "nearest first". Without it, distance sorts by name. */
  origin?: GeoPoint
  ratings: (placeId: Id) => PlaceRatings
}

/**
 * Sorts places. Ties (and unrated places for rating sorts, which go last)
 * are ordered by name.
 */
export function sortPlaces(places: readonly Place[], sort: PlaceSort, context: SortContext): Place[] {
  const byName = (a: Place, b: Place) => compareText(a.name, b.name)
  const rating = (place: Place, criterion: 'quality' | 'value') =>
    context.ratings(place.id)[criterion]?.average ?? -1

  const compare: Record<PlaceSort, (a: Place, b: Place) => number> = {
    name: byName,
    recent: (a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b),
    distance: (a, b) =>
      context.origin
        ? distanceMeters(context.origin, a.location) - distanceMeters(context.origin, b.location)
        : byName(a, b),
    quality: (a, b) => rating(b, 'quality') - rating(a, 'quality') || byName(a, b),
    value: (a, b) => rating(b, 'value') - rating(a, 'value') || byName(a, b),
  }
  return [...places].sort(compare[sort])
}
