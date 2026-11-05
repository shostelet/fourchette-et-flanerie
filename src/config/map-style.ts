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

type Paint = { layer: string; property: string; value: string }

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
