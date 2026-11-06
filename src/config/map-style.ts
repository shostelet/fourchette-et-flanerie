import type { Map as MapLibreMap } from 'maplibre-gl'

/**
 * Warms up the OpenFreeMap "positron" style (cold grey) to match the app's
 * cream palette. Layers are recolored by type and by name pattern rather than
 * exact ids, so a style update upstream doesn't break it.
 * Set WARM_MAP_STYLE to false to compare with the original.
 */
export const WARM_MAP_STYLE = true

const WARM = {
  land: '#f3ede4',
  landuse: '#ece5da',
  green: '#e1e6d2',
  water: '#cddce2',
  building: '#e4dccf',
}

/** The only paint properties recolored (MapLibre checks property names). */
type ColorProperty = 'background-color' | 'fill-color' | 'line-color' | 'text-color' | 'text-halo-color'
type Paint = { layer: string; property: ColorProperty; value: string }

/** Only for the light "positron" style: the dark style is used as is. */
export function warmUpMapStyle(map: MapLibreMap): void {
  if (!WARM_MAP_STYLE) return
  const changes: Paint[] = []
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase()
    if (layer.type === 'background') {
      changes.push({ layer: layer.id, property: 'background-color', value: WARM.land })
    } else if (layer.type === 'fill') {
      const color = /water|ocean|lake|river/.test(id)
        ? WARM.water
        : /park|wood|forest|grass|green|garden|cemetery|pitch/.test(id)
          ? WARM.green
          : /building/.test(id)
            ? WARM.building
            : /landuse|landcover|residential|industrial|commercial/.test(id)
              ? WARM.landuse
              : undefined
      if (color) changes.push({ layer: layer.id, property: 'fill-color', value: color })
    } else if (layer.type === 'line' && /waterway|river|canal/.test(id)) {
      changes.push({ layer: layer.id, property: 'line-color', value: WARM.water })
    }
  }
  for (const { layer, property, value } of changes) {
    try {
      map.setPaintProperty(layer, property, value)
    } catch {
      // A layer refusing a color keeps the original one: purely cosmetic.
    }
  }
}

/**
 * Softens OpenFreeMap's "dark" style (near black, barely visible streets)
 * into warm dark tones matching the app's dark theme: streets clearly
 * readable, water, parks and labels distinguishable at a glance.
 */
const WARM_DARK = {
  land: '#24211e',
  landuse: '#2a2622',
  green: '#2c3324',
  water: '#1f2b31',
  building: '#332e29',
  road: '#4b443c',
  majorRoad: '#5d544a',
  label: '#d8cfc2',
  labelHalo: '#1c1a18',
}

export function warmUpDarkMapStyle(map: MapLibreMap): void {
  if (!WARM_MAP_STYLE) return
  const changes: Paint[] = []
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase()
    if (layer.type === 'background') {
      changes.push({ layer: layer.id, property: 'background-color', value: WARM_DARK.land })
    } else if (layer.type === 'fill') {
      const color = /water|ocean|lake|river/.test(id)
        ? WARM_DARK.water
        : /park|wood|forest|grass|green|garden|cemetery|pitch/.test(id)
          ? WARM_DARK.green
          : /building/.test(id)
            ? WARM_DARK.building
            : /landuse|landcover|residential|industrial|commercial/.test(id)
              ? WARM_DARK.landuse
              : undefined
      if (color) changes.push({ layer: layer.id, property: 'fill-color', value: color })
    } else if (layer.type === 'line') {
      if (/waterway|river|canal/.test(id)) {
        changes.push({ layer: layer.id, property: 'line-color', value: WARM_DARK.water })
      } else if (/motorway|trunk|primary|major/.test(id)) {
        changes.push({ layer: layer.id, property: 'line-color', value: WARM_DARK.majorRoad })
      } else if (/highway|road|street|minor|secondary|tertiary|service|path|track|tunnel|bridge/.test(id)) {
        changes.push({ layer: layer.id, property: 'line-color', value: WARM_DARK.road })
      }
    } else if (layer.type === 'symbol') {
      changes.push({ layer: layer.id, property: 'text-color', value: WARM_DARK.label })
      changes.push({ layer: layer.id, property: 'text-halo-color', value: WARM_DARK.labelHalo })
    }
  }
  for (const { layer, property, value } of changes) {
    try {
      map.setPaintProperty(layer, property, value)
    } catch {
      // A layer refusing a color keeps the original one: purely cosmetic.
    }
  }
}
