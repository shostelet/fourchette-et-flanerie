import Dexie, { type Table } from 'dexie'
import type { Place, Tag, Visit } from '@/domain/models'

export const DATABASE_NAME = 'fourchette-et-flanerie'

export interface KeyValueRecord {
  key: string
  value: unknown
}

/**
 * IndexedDB schema, through Dexie.
 *
 * Only indexed fields are listed in `stores()`; every other field is still
 * stored. To change the schema, add a `this.version(2).stores(…)` call
 * (with an `upgrade()` migration if needed) — never edit version 1.
 */
export class AppDatabase extends Dexie {
  declare places: Table<Place, string>
  declare visits: Table<Visit, string>
  declare tags: Table<Tag, string>
  declare keyValues: Table<KeyValueRecord, string>

  constructor(name: string = DATABASE_NAME) {
    super(name)
    this.version(1).stores({
      places: 'id, category, updatedAt',
      visits: 'id, placeId, updatedAt',
      tags: 'id, category, updatedAt',
      keyValues: 'key',
    })
  }
}
