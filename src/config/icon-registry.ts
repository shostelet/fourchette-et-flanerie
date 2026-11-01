import type { Component } from 'vue'
import {
  Beer,
  CircleHelp,
  Coffee,
  Footprints,
  House,
  ShoppingBag,
  Utensils,
  UtensilsCrossed,
  Wine,
} from '@lucide/vue'

/**
 * Maps the icon keys stored in the data (Lucide names, kebab-case) to Vue
 * components. Only registered icons are bundled, which keeps the app light.
 * The full catalog for places and tags will be added with the place form.
 */
const ICONS: Record<string, Component> = {
  beer: Beer,
  coffee: Coffee,
  footprints: Footprints,
  house: House,
  'shopping-bag': ShoppingBag,
  utensils: Utensils,
  'utensils-crossed': UtensilsCrossed,
  wine: Wine,
}

export const FALLBACK_ICON: Component = CircleHelp

export function resolveIcon(name: string): Component {
  return ICONS[name] ?? FALLBACK_ICON
}
