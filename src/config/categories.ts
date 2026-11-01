import type { Category } from '@/domain/models'

export interface CategoryDefinition {
  id: Category
  /** UI label (French). */
  label: string
  /** Icon of the category itself, shown in the header switch. */
  icon: string
  /** Icon given to a new place of this category. */
  defaultPlaceIcon: string
}

export const CATEGORY_DEFINITIONS: Record<Category, CategoryDefinition> = {
  food: {
    id: 'food',
    label: 'Fourchette',
    icon: 'utensils-crossed',
    defaultPlaceIcon: 'utensils',
  },
  stroll: {
    id: 'stroll',
    label: 'Flânerie',
    icon: 'footprints',
    defaultPlaceIcon: 'shopping-bag',
  },
}

export const DEFAULT_CATEGORY: Category = 'food'
