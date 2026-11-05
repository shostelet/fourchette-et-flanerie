import { isRecord } from '@/domain/import-export/validation'
import type { OsmRef } from '@/domain/models'

/**
 * Reads one object from the OpenStreetMap API, for its tags (website, phone,
 * opening hours…). One request per tap on "Compléter depuis OSM": light use,
 * as the API's policy asks. https://wiki.openstreetmap.org/wiki/API_v0.6
 */
const API_URL = 'https://api.openstreetmap.org/api/0.6'

export class OsmApiError extends Error {
  constructor() {
    super('OpenStreetMap ne répond pas pour le moment.')
    this.name = 'OsmApiError'
  }
}

/** Tags of an OSM object; undefined when it no longer exists (deleted, merged…). */
export async function fetchOsmTags(ref: OsmRef): Promise<Record<string, unknown> | undefined> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/${ref.type}/${ref.id}.json`)
  } catch {
    throw new OsmApiError()
  }
  if (response.status === 404 || response.status === 410) return undefined
  if (!response.ok) throw new OsmApiError()
  const json: unknown = await response.json()
  const element = isRecord(json) && Array.isArray(json.elements) ? json.elements[0] : undefined
  return isRecord(element) && isRecord(element.tags) ? element.tags : undefined
}
