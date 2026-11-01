/**
 * Core data model of the app.
 *
 * These types are the contract shared by the UI, the stores, the local
 * database and (later) the HTTP API. Keep them framework-agnostic.
 */

export type Id = string
/** ISO 8601 date-time, e.g. "2026-11-01T14:52:00.000Z" */
export type IsoDateTime = string
/** ISO 8601 calendar date, e.g. "2026-11-01" */
export type IsoDate = string

export const CATEGORIES = ['food', 'stroll'] as const
/** `food` = « Fourchette », `stroll` = « Flânerie » in the UI. */
export type Category = (typeof CATEGORIES)[number]

export const RATING_VALUES = [1, 2, 3, 4, 5] as const
/** 1 = angry face … 5 = beaming face */
export type Rating = (typeof RATING_VALUES)[number]

export const RATING_CRITERIA = ['quality', 'value'] as const
/** `quality` = is it good? `value` = is it worth the price? */
export type RatingCriterion = (typeof RATING_CRITERIA)[number]

export interface GeoPoint {
  lat: number
  lng: number
}

/** Fields shared by every persisted entity, designed for future API sync. */
export interface Entity {
  id: Id
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  /** Set on soft delete. Deleted entities stay in storage as tombstones. */
  deletedAt?: IsoDateTime
}

export type PlaceLinkKind = 'website' | 'instagram' | 'other'

export interface PlaceLink {
  kind: PlaceLinkKind
  url: string
}

export interface OsmRef {
  type: 'node' | 'way' | 'relation'
  id: number
}

export type PlaceSource = 'manual' | 'search' | 'mapstr'

export interface Place extends Entity {
  category: Category
  name: string
  address: string
  location: GeoPoint
  /** Key of the icon catalog (Lucide icon name), e.g. "utensils". */
  icon: string
  tagIds: Id[]
  /** Free note written before any visit ("recommended by Julie"). */
  memo?: string
  links: PlaceLink[]
  phone?: string
  /** Raw OSM opening_hours value, e.g. "Mo-Fr 12:00-14:00". */
  openingHours?: string
  /** Explicit "already been there" flag. `false` = to test. */
  visited: boolean
  /** Flagged for the review screen (e.g. uncertain status after import). */
  needsReview: boolean
  /** Set when the place has permanently closed. */
  closedAt?: IsoDateTime
  osmRef?: OsmRef
  source: PlaceSource
}

export interface Visit extends Entity {
  placeId: Id
  /** Missing = unknown date (e.g. old visits recorded during review). */
  date?: IsoDate
  quality?: Rating
  value?: Rating
  comment?: string
}

export interface Tag extends Entity {
  /** Tags are separate between the two categories. */
  category: Category
  name: string
  /** Hex color, e.g. "#995d2e" */
  color: string
  /** Optional icon key (Lucide icon name). */
  icon?: string
}

export interface Home {
  address: string
  location: GeoPoint
}
