import { ImportError } from '@/domain/import-export/errors'
import {
  planMapstrImport,
  resolveMapstrPlan,
  type DuplicateDecision,
  type MapstrImportPlan,
  type MapstrImportResult,
} from '@/domain/import-export/mapstr'
import {
  buildNativeExport,
  detectImportFormat,
  exportFileName,
  parseNativeExport,
  type AppData,
} from '@/domain/import-export/native'
import type { Id } from '@/domain/models'
import { useAppDataStore } from '@/stores/app-data'
import { useHomeStore } from '@/stores/home'
import { usePlacesStore } from '@/stores/places'
import { useTagsStore } from '@/stores/tags'
import { useVisitsStore } from '@/stores/visits'
import { downloadJson, readJsonFile } from '@/utils/download'

export type LoadedImport =
  | { format: 'mapstr'; plan: MapstrImportPlan }
  | { format: 'native'; data: AppData }

/** Glue between the import/export domain functions and the stores. */
export function useImportExport() {
  const places = usePlacesStore()
  const visits = useVisitsStore()
  const tags = useTagsStore()
  const home = useHomeStore()
  const appData = useAppDataStore()

  /** Reads a file and prepares the import, without saving anything yet. */
  async function load(file: File): Promise<LoadedImport> {
    let json: unknown
    try {
      json = await readJsonFile(file)
    } catch {
      throw new ImportError('Fichier illisible : ce n’est pas un fichier JSON valide.')
    }

    switch (detectImportFormat(json)) {
      case 'native':
        return { format: 'native', data: parseNativeExport(json) }
      case 'mapstr':
        return {
          format: 'mapstr',
          plan: planMapstrImport(json, { places: places.items, tags: tags.items }),
        }
      default:
        throw new ImportError('Format non reconnu : il faut un export Mapstr ou Fourchette.')
    }
  }

  /** Adds the Mapstr places to the current data. */
  async function applyMapstr(
    plan: MapstrImportPlan,
    decisions: ReadonlyMap<Id, DuplicateDecision>,
    options: { useHome: boolean },
  ): Promise<MapstrImportResult> {
    const result = resolveMapstrPlan(plan, decisions)
    await tags.saveMany(result.tags)
    await places.saveMany(result.places)
    if (options.useHome && plan.home) await home.save(plan.home)
    return result
  }

  /** Replaces every piece of data on this device with the export's content. */
  async function replaceAll(data: AppData): Promise<void> {
    await appData.wipeAll()
    await tags.saveMany(data.tags)
    await places.saveMany(data.places)
    await visits.saveMany(data.visits)
    await home.save(data.home)
  }

  function exportAll(): void {
    const data: AppData = {
      places: places.items,
      visits: visits.items,
      tags: tags.items,
      home: home.home,
    }
    downloadJson(exportFileName(), buildNativeExport(data))
  }

  return { load, applyMapstr, replaceAll, exportAll }
}
