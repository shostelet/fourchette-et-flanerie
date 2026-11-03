import type { Category } from '@/domain/models'

export interface OsmMapping {
  category: Category
  icon: string
}

const food = (icon: string): OsmMapping => ({ category: 'food', icon })
const stroll = (icon: string): OsmMapping => ({ category: 'stroll', icon })

/**
 * OSM tags (key → value → mapping) used to guess the category and icon of a
 * new place found by the search. `*` is the fallback for a key.
 */
const MAPPINGS: Record<string, Record<string, OsmMapping>> = {
  amenity: {
    restaurant: food('utensils'),
    fast_food: food('hamburger'),
    food_court: food('utensils'),
    cafe: food('coffee'),
    ice_cream: food('ice-cream-cone'),
    bar: food('wine'),
    pub: food('beer'),
    biergarten: food('beer'),
    nightclub: food('disc-3'),
    arts_centre: stroll('paintbrush'),
    theatre: stroll('landmark'),
    cinema: stroll('landmark'),
    library: stroll('book-open'),
    marketplace: food('shopping-basket'),
  },
  shop: {
    bakery: food('croissant'),
    pastry: food('croissant'),
    deli: food('shopping-basket'),
    cheese: food('shopping-basket'),
    chocolate: food('shopping-basket'),
    confectionery: food('shopping-basket'),
    coffee: food('coffee'),
    tea: food('coffee'),
    wine: food('wine'),
    alcohol: food('wine'),
    beverages: food('beer'),
    butcher: food('shopping-basket'),
    seafood: food('shopping-basket'),
    greengrocer: food('shopping-basket'),
    farm: food('shopping-basket'),
    clothes: stroll('shirt'),
    shoes: stroll('shirt'),
    boutique: stroll('shirt'),
    fashion_accessories: stroll('shirt'),
    furniture: stroll('lamp'),
    interior_decoration: stroll('lamp'),
    houseware: stroll('lamp'),
    lighting: stroll('lamp'),
    antiques: stroll('lamp'),
    gift: stroll('gift'),
    toys: stroll('gift'),
    hardware: stroll('wrench'),
    doityourself: stroll('wrench'),
    florist: stroll('flower'),
    garden_centre: stroll('flower'),
    art: stroll('paintbrush'),
    craft: stroll('paintbrush'),
    books: stroll('book-open'),
    music: stroll('music'),
    jewelry: stroll('gem'),
    '*': stroll('shopping-bag'),
  },
  tourism: {
    museum: stroll('landmark'),
    gallery: stroll('paintbrush'),
    attraction: stroll('landmark'),
  },
  craft: {
    brewery: food('beer'),
    winery: food('wine'),
  },
}

/** Category and icon for an OSM tag, when it describes a place we can save. */
export function mapOsmTag(key: string, value: string): OsmMapping | undefined {
  const byValue = MAPPINGS[key]
  return byValue?.[value] ?? byValue?.['*']
}
