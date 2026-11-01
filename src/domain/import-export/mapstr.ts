import { CATEGORY_DEFINITIONS } from '@/config/categories'
import { cleanText, createPlace, createTag, touch } from '../entities'
import type { Category, Home, Id, IsoDateTime, Place, Tag } from '../models'
import { findDuplicate } from '../places'
import { normalizeText } from '../text'
import { ImportError } from './errors'
import { isHexColor, isRecord, isString, readPointCoordinates } from './validation'

/**
 * One-shot import of a Mapstr export (GeoJSON FeatureCollection).
 *
 * Rules agreed on:
 * - the place with the "home" icon becomes the home address;
 * - the Mapstr icon decides the category (unknown icons → Fourchette, to review);
 * - the "Restaurant" tag confirms Fourchette, then is dropped;
 * - the "À essayer" tag means "to test" (confirmed), then is dropped;
 *   without it, the status is unknown and the place is flagged for review;
 * - other tags keep their Mapstr color, deduplicated by name per category;
 * - `userComment` becomes the memo.
 */

interface IconRule {
  category: Category
  icon: string
  /** False when the category is a guess worth reviewing. */
  certain: boolean
}

const ICON_RULES: Record<string, IconRule> = {
  restaurant: { category: 'food', icon: 'utensils', certain: true },
  bar: { category: 'food', icon: 'beer', certain: true },
  beer: { category: 'food', icon: 'beer', certain: true },
  cafe: { category: 'food', icon: 'coffee', certain: true },
  coffee: { category: 'food', icon: 'coffee', certain: true },
  bakery: { category: 'food', icon: 'croissant', certain: true },
  fastfood: { category: 'food', icon: 'hamburger', certain: true },
  // Often outdated icons (bars, sandwich shops…): Fourchette, to check.
  nightclub: { category: 'food', icon: 'disc-3', certain: false },
  // Usually a fine grocery: Fourchette, to check.
  supermarket: { category: 'food', icon: 'shopping-basket', certain: false },
  shopping: { category: 'stroll', icon: 'shopping-bag', certain: false },
}

/**
 * Any other icon (generic, geocode, business…): mostly restaurants and bars
 * in practice, so Fourchette with the default icon, flagged for review.
 */
const UNKNOWN_ICON_RULE: IconRule = {
  category: 'food',
  icon: CATEGORY_DEFINITIONS.food.defaultPlaceIcon,
  certain: false,
}

const HOME_ICON = 'home'
const TO_TEST_TAG = normalizeText('À essayer')
const FOOD_TAG = normalizeText('Restaurant')
const DROPPED_TAGS = new Set([TO_TEST_TAG, FOOD_TAG, normalizeText('Maison')])
const DEFAULT_TAG_COLOR = '#8a7f72'

export interface ImportCandidate {
  place: Place
  /** Existing place that looks like this one (same OSM object or name nearby). */
  duplicateOf?: Place
}

export interface MapstrImportPlan {
  home?: Home
  candidates: ImportCandidate[]
  /** Tags that don't exist yet; only those used by saved places are created. */
  newTags: Tag[]
  /** Features that could not be read, in plain French. */
  warnings: string[]
}

export interface ExistingData {
  places: readonly Place[]
  tags: readonly Tag[]
}

const tagKey = (category: Category, name: string) => `${category}|${normalizeText(name)}`

export function planMapstrImport(
  json: unknown,
  existing: ExistingData,
  now?: IsoDateTime,
): MapstrImportPlan {
  if (!isRecord(json) || json.type !== 'FeatureCollection' || !Array.isArray(json.features)) {
    throw new ImportError('Ce fichier ne ressemble pas à un export Mapstr (GeoJSON attendu).')
  }

  const tagsByKey = new Map(existing.tags.map((t) => [tagKey(t.category, t.name), t]))
  const newTags: Tag[] = []
  const candidates: ImportCandidate[] = []
  const warnings: string[] = []
  let home: Home | undefined

  function resolveTag(category: Category, name: string, color: unknown): Id {
    const key = tagKey(category, name)
    let tag = tagsByKey.get(key)
    if (!tag) {
      tag = createTag(
        { category, name, color: isHexColor(color) ? color.toLowerCase() : DEFAULT_TAG_COLOR },
        now,
      )
      tagsByKey.set(key, tag)
      newTags.push(tag)
    }
    return tag.id
  }

  json.features.forEach((feature, index) => {
    const properties = isRecord(feature) ? feature.properties : undefined
    const location = isRecord(feature) ? readPointCoordinates(feature.geometry) : undefined
    const name = isRecord(properties) && isString(properties.name) ? properties.name.trim() : ''
    if (!isRecord(properties) || !location || !name) {
      warnings.push(`Lieu n°${index + 1} ignoré : nom ou position manquant.`)
      return
    }

    const address = isString(properties.address) ? properties.address.trim() : ''
    const mapstrIcon = isString(properties.icon) ? properties.icon : ''

    if (mapstrIcon === HOME_ICON) {
      if (!home) home = { address, location }
      return
    }

    const rawTags = (Array.isArray(properties.tags) ? properties.tags : [])
      .filter(isRecord)
      .filter((t): t is { name: string; color?: unknown } => isString(t.name) && t.name.trim() !== '')
    const tagNames = new Set(rawTags.map((t) => normalizeText(t.name)))

    const hasFoodTag = tagNames.has(FOOD_TAG)
    const rule = ICON_RULES[mapstrIcon] ?? UNKNOWN_ICON_RULE
    // The "Restaurant" tag always wins: Fourchette, for sure.
    const category: Category = hasFoodTag ? 'food' : rule.category
    const categoryIsCertain = hasFoodTag || rule.certain
    const icon =
      category === rule.category ? rule.icon : CATEGORY_DEFINITIONS[category].defaultPlaceIcon
    const markedToTest = tagNames.has(TO_TEST_TAG)

    // Deduplicate tags by normalized name, keeping the first spelling.
    const seen = new Set<string>()
    const tagIds: Id[] = []
    for (const tag of rawTags) {
      const normalized = normalizeText(tag.name)
      if (DROPPED_TAGS.has(normalized) || seen.has(normalized)) continue
      seen.add(normalized)
      tagIds.push(resolveTag(category, tag.name.trim(), tag.color))
    }

    const place = createPlace(
      {
        category,
        name,
        address,
        location,
        icon,
        tagIds,
        memo: isString(properties.userComment) ? properties.userComment : undefined,
        visited: false,
        // Unknown visit status, or guessed category: to check during review.
        needsReview: !markedToTest || !categoryIsCertain,
        source: 'mapstr',
      },
      now,
    )

    candidates.push({ place, duplicateOf: findDuplicate(place, existing.places) })
  })

  return { home, candidates, newTags, warnings }
}

// --- Resolution --------------------------------------------------------------

/** What to do with an incoming place that looks like an existing one. */
export type DuplicateDecision = 'skip' | 'merge' | 'keep-both'

export interface MapstrImportResult {
  places: Place[]
  tags: Tag[]
}

/** Adds the incoming tags and memo to the existing place. */
export function mergeIntoExisting(existing: Place, incoming: Place, now?: IsoDateTime): Place {
  const memo =
    existing.memo && incoming.memo && existing.memo !== incoming.memo
      ? `${existing.memo}\n${incoming.memo}`
      : (existing.memo ?? incoming.memo)
  return touch(
    {
      ...existing,
      tagIds: [...new Set([...existing.tagIds, ...incoming.tagIds])],
      memo: cleanText(memo),
    },
    now,
  )
}

/**
 * Applies the user's decisions on duplicates (default: skip) and returns
 * what must be saved. New tags only used by skipped places are dropped.
 */
export function resolveMapstrPlan(
  plan: MapstrImportPlan,
  decisions: ReadonlyMap<Id, DuplicateDecision> = new Map(),
  now?: IsoDateTime,
): MapstrImportResult {
  const places: Place[] = []
  for (const { place, duplicateOf } of plan.candidates) {
    if (!duplicateOf) {
      places.push(place)
      continue
    }
    const decision = decisions.get(place.id) ?? 'skip'
    if (decision === 'keep-both') places.push(place)
    else if (decision === 'merge') places.push(mergeIntoExisting(duplicateOf, place, now))
  }

  const usedTagIds = new Set(places.flatMap((p) => p.tagIds))
  return { places, tags: plan.newTags.filter((t) => usedTagIds.has(t.id)) }
}
