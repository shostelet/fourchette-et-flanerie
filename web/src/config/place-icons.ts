import type { Category } from '@/domain/models'

export interface PlaceIconOption {
  icon: string
  label: string
}

/**
 * Icons offered for places, per category (the first one is the default).
 * Every icon here must be registered in icon-registry.ts.
 */
export const PLACE_ICONS: Record<Category, readonly PlaceIconOption[]> = {
  food: [
    { icon: 'utensils', label: 'Restaurant' },
    { icon: 'hamburger', label: 'Burger' },
    { icon: 'coffee', label: 'Café' },
    { icon: 'beer', label: 'Bar à bière' },
    { icon: 'wine', label: 'Bar à vin' },
    { icon: 'croissant', label: 'Boulangerie' },
    { icon: 'shopping-basket', label: 'Épicerie' },
    { icon: 'disc-3', label: 'Bar musical' },
  ],
  stroll: [
    { icon: 'shopping-bag', label: 'Boutique' },
    { icon: 'shirt', label: 'Vêtements' },
    { icon: 'lamp', label: 'Déco' },
    { icon: 'gift', label: 'Cadeaux' },
    { icon: 'wrench', label: 'Bricolage' },
    { icon: 'flower', label: 'Fleurs' },
    { icon: 'paintbrush', label: 'Art' },
    { icon: 'landmark', label: 'Musée' },
  ],
}
