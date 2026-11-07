import { isDeleted, nowIso } from '../entities'
import type {
  Category,
  Home,
  IsoDateTime,
  OsmRef,
  Place,
  PlaceLink,
  PlaceSource,
  Rating,
  Tag,
  Visit,
} from '../models'
import { CATEGORIES, RATING_VALUES } from '../models'
import { ImportError } from './errors'
import {
  isFiniteNumber,
  isHexColor,
  isRecord,
  isString,
  optionalString,
  readPointCoordinates,
  type JsonRecord,
} from './validation'

/**
 * Native export format: a valid GeoJSON FeatureCollection (readable by any
 * GIS tool), enriched with everything needed for a lossless round trip.
 */
export const EXPORT_APP_ID = 'fourchette-et-flanerie'
export const EXPORT_SCHEMA_VERSION = 1

export interface AppData {
  places: Place[]
  visits: Visit[]
  tags: Tag[]
  home?: Home
}

type ExportedVisit = Omit<Visit, 'placeId'>
type ExportedPlaceProperties = Omit<Place, 'id' | 'location'> & { visits: ExportedVisit[] }

export interface NativeExport {
  type: 'FeatureCollection'
  app: typeof EXPORT_APP_ID
  schemaVersion: number
  exportedAt: IsoDateTime
  home: Home | null
  tags: Tag[]
  features: {
    type: 'Feature'
    id: string
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: ExportedPlaceProperties
  }[]
}

// --- Export ------------------------------------------------------------------

/** Builds the export. Soft-deleted entities are left out; closed places are kept. */
export function buildNativeExport(data: AppData, now: IsoDateTime = nowIso()): NativeExport {
  const visitsByPlace = new Map<string, ExportedVisit[]>()
  for (const visit of data.visits) {
    if (isDeleted(visit)) continue
    const { placeId, ...rest } = visit
    const group = visitsByPlace.get(placeId)
    if (group) group.push(rest)
    else visitsByPlace.set(placeId, [rest])
  }

  return {
    type: 'FeatureCollection',
    app: EXPORT_APP_ID,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now,
    home: data.home ?? null,
    tags: data.tags.filter((t) => !isDeleted(t)),
    features: data.places
      .filter((p) => !isDeleted(p))
      .map(({ id, location, ...properties }) => ({
        type: 'Feature' as const,
        id,
        geometry: { type: 'Point' as const, coordinates: [location.lng, location.lat] },
        properties: { ...properties, visits: visitsByPlace.get(id) ?? [] },
      })),
  }
}

/** "fourchette-export-2026-11-01.json" */
export function exportFileName(date: Date = new Date()): string {
  const iso = date.toISOString().slice(0, 10)
  return `fourchette-export-${iso}.json`
}

// --- Format detection --------------------------------------------------------

export type ImportFormat = 'native' | 'mapstr' | 'unknown'

export function detectImportFormat(json: unknown): ImportFormat {
  if (!isRecord(json)) return 'unknown'
  if (json.app === EXPORT_APP_ID) return 'native'
  if (json.type === 'FeatureCollection' && Array.isArray(json.features)) return 'mapstr'
  return 'unknown'
}

// --- Import ------------------------------------------------------------------

const isCategory = (v: unknown): v is Category => (CATEGORIES as readonly unknown[]).includes(v)
const isRating = (v: unknown): v is Rating => (RATING_VALUES as readonly unknown[]).includes(v)
const optionalRating = (v: unknown): Rating | undefined => (isRating(v) ? v : undefined)
const PLACE_SOURCES: readonly PlaceSource[] = ['manual', 'search', 'mapstr']

function requireEntityFields(raw: JsonRecord, what: string) {
  if (!isString(raw.id) || !isString(raw.createdAt) || !isString(raw.updatedAt)) {
    throw new ImportError(`Fichier invalide : ${what} sans identifiant ou dates.`)
  }
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    deletedAt: optionalString(raw.deletedAt),
  }
}

function readTag(raw: unknown): Tag {
  if (!isRecord(raw) || !isCategory(raw.category) || !isString(raw.name)) {
    throw new ImportError('Fichier invalide : un tag est mal formé.')
  }
  return {
    ...requireEntityFields(raw, 'un tag'),
    category: raw.category,
    name: raw.name,
    color: isHexColor(raw.color) ? raw.color : '#8a7f72',
    icon: optionalString(raw.icon),
  }
}

function readLinks(raw: unknown): PlaceLink[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isRecord)
    .filter((l) => isString(l.url))
    .map((l) => ({
      kind: l.kind === 'website' || l.kind === 'instagram' ? l.kind : 'other',
      url: l.url as string,
    }))
}

function readOsmRef(raw: unknown): OsmRef | undefined {
  if (!isRecord(raw) || !isFiniteNumber(raw.id)) return undefined
  return raw.type === 'node' || raw.type === 'way' || raw.type === 'relation'
    ? { type: raw.type, id: raw.id }
    : undefined
}

function readVisit(raw: unknown, placeId: string): Visit {
  if (!isRecord(raw)) throw new ImportError('Fichier invalide : une visite est mal formée.')
  return {
    ...requireEntityFields(raw, 'une visite'),
    placeId,
    date: optionalString(raw.date),
    quality: optionalRating(raw.quality),
    value: optionalRating(raw.value),
    comment: optionalString(raw.comment),
  }
}

function readFeature(raw: unknown): { place: Place; visits: Visit[] } {
  const p = isRecord(raw) ? raw.properties : undefined
  const location = isRecord(raw) ? readPointCoordinates(raw.geometry) : undefined
  if (!isRecord(raw) || !isRecord(p) || !location || !isCategory(p.category) || !isString(p.name)) {
    throw new ImportError('Fichier invalide : un lieu est mal formé.')
  }
  const entity = requireEntityFields({ ...p, id: raw.id }, 'un lieu')
  const place: Place = {
    ...entity,
    category: p.category,
    name: p.name,
    address: isString(p.address) ? p.address : '',
    location,
    icon: isString(p.icon) ? p.icon : 'circle-help',
    tagIds: Array.isArray(p.tagIds) ? p.tagIds.filter(isString) : [],
    memo: optionalString(p.memo),
    links: readLinks(p.links),
    phone: optionalString(p.phone),
    openingHours: optionalString(p.openingHours),
    visited: p.visited === true,
    needsReview: p.needsReview === true,
    closedAt: optionalString(p.closedAt),
    osmRef: readOsmRef(p.osmRef),
    source: PLACE_SOURCES.includes(p.source as PlaceSource) ? (p.source as PlaceSource) : 'manual',
  }
  const visits = (Array.isArray(p.visits) ? p.visits : []).map((v) => readVisit(v, entity.id))
  return { place, visits }
}

function readHome(raw: unknown): Home | undefined {
  if (!isRecord(raw) || !isRecord(raw.location)) return undefined
  const { lat, lng } = raw.location
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return undefined
  return { address: isString(raw.address) ? raw.address : '', location: { lat, lng } }
}

/** Reads and validates a native export. Throws an ImportError when invalid. */
export function parseNativeExport(json: unknown): AppData {
  if (!isRecord(json) || json.app !== EXPORT_APP_ID) {
    throw new ImportError('Ce fichier n’est pas un export Fourchette & Flânerie.')
  }
  const version = json.schemaVersion
  if (!isFiniteNumber(version) || version > EXPORT_SCHEMA_VERSION) {
    throw new ImportError(
      'Cet export vient d’une version plus récente de l’appli : mets-la à jour avant d’importer.',
    )
  }
  if (!Array.isArray(json.features) || !Array.isArray(json.tags)) {
    throw new ImportError('Fichier invalide : lieux ou tags manquants.')
  }

  const read = json.features.map(readFeature)
  return {
    places: read.map((r) => r.place),
    visits: read.flatMap((r) => r.visits),
    tags: json.tags.map(readTag),
    home: readHome(json.home),
  }
}
