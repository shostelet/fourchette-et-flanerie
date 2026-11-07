import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getRepositories } from '@/data'
import { clearAllData } from '@/data/repositories'
import { removeAllPreferences } from '@/utils/local-storage'
import { useHomeStore } from './home'
import { usePlacesStore } from './places'
import { useTagsStore } from './tags'
import { useVisitsStore } from './visits'

/** Loads every data store at startup, and hosts the dev "wipe" action. */
export const useAppDataStore = defineStore('appData', () => {
  const ready = ref(false)
  const error = ref<unknown>()

  async function loadAll(): Promise<void> {
    error.value = undefined
    try {
      await Promise.all([
        usePlacesStore().load(),
        useVisitsStore().load(),
        useTagsStore().load(),
        useHomeStore().load(),
      ])
      ready.value = true
    } catch (e) {
      error.value = e
      throw e
    }
  }

  /** Dev action: wipes all local data. Ask for confirmation in the UI first. */
  async function wipeAll(options: { includePreferences?: boolean } = {}): Promise<void> {
    await clearAllData(getRepositories())
    if (options.includePreferences) removeAllPreferences()
    usePlacesStore().$reset()
    useVisitsStore().$reset()
    useTagsStore().$reset()
    useHomeStore().$reset()
    await loadAll()
  }

  return { ready, error, loadAll, wipeAll }
})
