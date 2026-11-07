import type { Entity, Home, Id, Place, Tag, Visit } from '@/domain/models'

/**
 * Persistence contracts. Stores only talk to these interfaces, never to
 * IndexedDB directly: switching to the HTTP API later means writing new
 * implementations, without touching stores or components.
 *
 * Repositories only persist. Business rules (soft delete, timestamps…) are
 * applied before, by domain functions.
 */
export interface EntityRepository<T extends Entity> {
  /** Soft-deleted entities are excluded unless asked for. */
  list(options?: { includeDeleted?: boolean }): Promise<T[]>
  get(id: Id): Promise<T | undefined>
  /** Insert or replace. */
  save(entity: T): Promise<void>
  saveMany(entities: readonly T[]): Promise<void>
  /** Physically removes soft-deleted entities. Returns how many. */
  purgeDeleted(): Promise<number>
  clear(): Promise<void>
}

export interface VisitRepository extends EntityRepository<Visit> {
  listByPlace(placeId: Id): Promise<Visit[]>
}

export interface SettingsRepository {
  getHome(): Promise<Home | undefined>
  saveHome(home: Home | undefined): Promise<void>
  clear(): Promise<void>
}

export interface Repositories {
  places: EntityRepository<Place>
  visits: VisitRepository
  tags: EntityRepository<Tag>
  settings: SettingsRepository
}

/** Dev action: wipes every stored piece of data. */
export async function clearAllData(repositories: Repositories): Promise<void> {
  await Promise.all([
    repositories.places.clear(),
    repositories.visits.clear(),
    repositories.tags.clear(),
    repositories.settings.clear(),
  ])
}
