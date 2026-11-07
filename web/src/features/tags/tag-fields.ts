import type { Tag } from '@/domain/models'

/** What the tag editor lets the user change. */
export type TagFields = Pick<Tag, 'name' | 'color' | 'icon'>
