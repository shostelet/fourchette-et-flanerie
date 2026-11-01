import { isDeleted } from '@/domain/entities'
import type { Entity, Home, Id, Visit } from '@/domain/models'
import { toPlain } from '../plain'
import type {
  EntityRepository,
  Repositories,
  SettingsRepository,
  VisitRepository,
} from '../repositories'

/**
 * In-memory implementation of the repositories.
 * Used by unit tests; also handy to prototype without touching real data.
 */
export class MemoryEntityRepository<T extends Entity> implements EntityRepository<T> {
  protected readonly items = new Map<Id, T>()

  async list(options: { includeDeleted?: boolean } = {}): Promise<T[]> {
    const all = [...this.items.values()].map(toPlain)
    return options.includeDeleted ? all : all.filter((e) => !isDeleted(e))
  }

  async get(id: Id): Promise<T | undefined> {
    const item = this.items.get(id)
    return item ? toPlain(item) : undefined
  }

  async save(entity: T): Promise<void> {
    this.items.set(entity.id, toPlain(entity))
  }

  async saveMany(entities: readonly T[]): Promise<void> {
    for (const entity of entities) this.items.set(entity.id, toPlain(entity))
  }

  async purgeDeleted(): Promise<number> {
    let count = 0
    for (const [id, entity] of this.items) {
      if (isDeleted(entity)) {
        this.items.delete(id)
        count++
      }
    }
    return count
  }

  async clear(): Promise<void> {
    this.items.clear()
  }
}

export class MemoryVisitRepository
  extends MemoryEntityRepository<Visit>
  implements VisitRepository
{
  async listByPlace(placeId: Id): Promise<Visit[]> {
    return (await this.list()).filter((v) => v.placeId === placeId)
  }
}

export class MemorySettingsRepository implements SettingsRepository {
  private home: Home | undefined

  async getHome(): Promise<Home | undefined> {
    return this.home ? toPlain(this.home) : undefined
  }

  async saveHome(home: Home | undefined): Promise<void> {
    this.home = home ? toPlain(home) : undefined
  }

  async clear(): Promise<void> {
    this.home = undefined
  }
}

export function createMemoryRepositories(): Repositories {
  return {
    places: new MemoryEntityRepository(),
    visits: new MemoryVisitRepository(),
    tags: new MemoryEntityRepository(),
    settings: new MemorySettingsRepository(),
  }
}
