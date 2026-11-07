import type { Table } from 'dexie'
import { isDeleted } from '@/domain/entities'
import type { Entity, Home, Id, Visit } from '@/domain/models'
import { toPlain } from '../plain'
import type {
  EntityRepository,
  Repositories,
  SettingsRepository,
  VisitRepository,
} from '../repositories'
import type { AppDatabase, KeyValueRecord } from './database'

class DexieEntityRepository<T extends Entity> implements EntityRepository<T> {
  constructor(protected readonly table: Table<T, string>) {}

  async list(options: { includeDeleted?: boolean } = {}): Promise<T[]> {
    const all = await this.table.toArray()
    return options.includeDeleted ? all : all.filter((e) => !isDeleted(e))
  }

  async get(id: Id): Promise<T | undefined> {
    return this.table.get(id)
  }

  async save(entity: T): Promise<void> {
    await this.table.put(toPlain(entity))
  }

  async saveMany(entities: readonly T[]): Promise<void> {
    await this.table.bulkPut(entities.map(toPlain))
  }

  async purgeDeleted(): Promise<number> {
    const ids = (await this.table.toArray()).filter(isDeleted).map((e) => e.id)
    await this.table.bulkDelete(ids)
    return ids.length
  }

  async clear(): Promise<void> {
    await this.table.clear()
  }
}

class DexieVisitRepository extends DexieEntityRepository<Visit> implements VisitRepository {
  async listByPlace(placeId: Id): Promise<Visit[]> {
    const visits = await this.table.where('placeId').equals(placeId).toArray()
    return visits.filter((v) => !isDeleted(v))
  }
}

const HOME_KEY = 'home'

class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly table: Table<KeyValueRecord, string>) {}

  async getHome(): Promise<Home | undefined> {
    const record = await this.table.get(HOME_KEY)
    return record?.value as Home | undefined
  }

  async saveHome(home: Home | undefined): Promise<void> {
    if (home) await this.table.put({ key: HOME_KEY, value: toPlain(home) })
    else await this.table.delete(HOME_KEY)
  }

  async clear(): Promise<void> {
    await this.table.clear()
  }
}

export function createLocalRepositories(db: AppDatabase): Repositories {
  return {
    places: new DexieEntityRepository(db.places),
    visits: new DexieVisitRepository(db.visits),
    tags: new DexieEntityRepository(db.tags),
    settings: new DexieSettingsRepository(db.keyValues),
  }
}
