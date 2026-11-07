import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { createId } from './ids'
import type {
  Category,
  Entity,
  GeoPoint,
  Id,
  IsoDate,
  IsoDateTime,
  OsmRef,
  Place,
  PlaceLink,
  PlaceSource,
  Rating,
  Tag,
  Visit,
} from './models'

export function nowIso(): IsoDateTime {
  return new Date().toISOString()
}

export function createEntityBase(now: IsoDateTime = nowIso()): Entity {
  return { id: createId(), createdAt: now, updatedAt: now }
}

/** Returns a copy with a fresh `updatedAt`. */
export function touch<T extends Entity>(entity: T, now: IsoDateTime = nowIso()): T {
  return { ...entity, updatedAt: now }
}

/** Returns a soft-deleted copy (tombstone). */
export function softDelete<T extends Entity>(entity: T, now: IsoDateTime = nowIso()): T {
  return { ...entity, deletedAt: now, updatedAt: now }
}

export function isDeleted(entity: Entity): boolean {
  return entity.deletedAt !== undefined
}

/** Trims a free text; an empty result becomes `undefined`. */
export function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

// --- Place -----------------------------------------------------------------

export interface PlaceDraft {
  category: Category
  name: string
  address: string
  location: GeoPoint
  icon?: string
  tagIds?: Id[]
  memo?: string
  links?: PlaceLink[]
  phone?: string
  openingHours?: string
  visited?: boolean
  needsReview?: boolean
  osmRef?: OsmRef
  source?: PlaceSource
}

/** Editable fields of a place. */
export type PlacePatch = Partial<Omit<Place, keyof Entity | 'source'>>

export function createPlace(draft: PlaceDraft, now?: IsoDateTime): Place {
  return {
    ...createEntityBase(now),
    category: draft.category,
    name: draft.name.trim(),
    address: draft.address.trim(),
    location: { ...draft.location },
    icon: draft.icon ?? CATEGORY_DEFINITIONS[draft.category].defaultPlaceIcon,
    tagIds: [...new Set(draft.tagIds ?? [])],
    memo: cleanText(draft.memo),
    links: draft.links ?? [],
    phone: cleanText(draft.phone),
    openingHours: cleanText(draft.openingHours),
    visited: draft.visited ?? false,
    needsReview: draft.needsReview ?? false,
    osmRef: draft.osmRef,
    source: draft.source ?? 'manual',
  }
}

// --- Visit -----------------------------------------------------------------

export interface VisitDraft {
  placeId: Id
  date?: IsoDate
  quality?: Rating
  value?: Rating
  comment?: string
}

export type VisitPatch = Partial<Omit<Visit, keyof Entity | 'placeId'>>

export function createVisit(draft: VisitDraft, now?: IsoDateTime): Visit {
  return {
    ...createEntityBase(now),
    placeId: draft.placeId,
    date: draft.date,
    quality: draft.quality,
    value: draft.value,
    comment: cleanText(draft.comment),
  }
}

/** Today's date as an ISO calendar date, in local time. */
export function todayIsoDate(date: Date = new Date()): IsoDate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// --- Tag -------------------------------------------------------------------

export interface TagDraft {
  category: Category
  name: string
  color: string
  icon?: string
}

export type TagPatch = Partial<Omit<Tag, keyof Entity | 'category'>>

export function createTag(draft: TagDraft, now?: IsoDateTime): Tag {
  return {
    ...createEntityBase(now),
    category: draft.category,
    name: draft.name.trim(),
    color: draft.color,
    icon: draft.icon,
  }
}
