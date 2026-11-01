import type { Component } from 'vue'
import {
  Angry,
  Beer,
  CircleHelp,
  Coffee,
  Croissant,
  Disc3,
  Flower,
  Footprints,
  Frown,
  Gift,
  Hamburger,
  House,
  Lamp,
  Landmark,
  Laugh,
  Meh,
  Paintbrush,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smile,
  Utensils,
  UtensilsCrossed,
  Wine,
  Wrench,
} from '@lucide/vue'

/**
 * Maps the icon keys stored in the data (Lucide names, kebab-case) to Vue
 * components. Only registered icons are bundled, which keeps the app light.
 */
const ICONS: Record<string, Component> = {
  // Categories and map
  footprints: Footprints,
  house: House,
  'utensils-crossed': UtensilsCrossed,
  // Fourchette places
  beer: Beer,
  coffee: Coffee,
  croissant: Croissant,
  'disc-3': Disc3,
  hamburger: Hamburger,
  'shopping-basket': ShoppingBasket,
  utensils: Utensils,
  wine: Wine,
  // Flânerie places
  flower: Flower,
  gift: Gift,
  lamp: Lamp,
  landmark: Landmark,
  paintbrush: Paintbrush,
  shirt: Shirt,
  'shopping-bag': ShoppingBag,
  wrench: Wrench,
  // Rating faces
  angry: Angry,
  frown: Frown,
  meh: Meh,
  smile: Smile,
  laugh: Laugh,
}

export const FALLBACK_ICON: Component = CircleHelp

export function resolveIcon(name: string): Component {
  return ICONS[name] ?? FALLBACK_ICON
}
