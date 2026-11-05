import type { Category } from '@/domain/models'

export interface CategoryDefinition {
  id: Category
  /** UI label (French). */
  label: string
  /** Icon of the category itself, shown in the header switch. */
  icon: string
  /** Icon given to a new place of this category. */
  defaultPlaceIcon: string
  /** Accent color as hex (map lines can't use CSS variables). */
  color: string
}

export const CATEGORY_DEFINITIONS: Record<Category, CategoryDefinition> = {
  food: {
    id: 'food',
    label: 'Fourchette',
    icon: 'utensils-crossed',
    defaultPlaceIcon: 'utensils',
    color: '#b5532f',
  },
  stroll: {
    id: 'stroll',
    label: 'Flânerie',
    icon: 'footprints',
    defaultPlaceIcon: 'shopping-bag',
    color: '#5f7244',
  },
}

/** Color of the home pin, as hex. */
export const HOME_COLOR = '#2b2a28'

export const DEFAULT_CATEGORY: Category = 'food'
