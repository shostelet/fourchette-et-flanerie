import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getRepositories } from '@/data'
import type { Home } from '@/domain/models'

export const useHomeStore = defineStore('home', () => {
  const repositories = getRepositories()

  const home = ref<Home | undefined>()
  const loaded = ref(false)

  async function load(): Promise<void> {
    home.value = await repositories.settings.getHome()
    loaded.value = true
  }

  async function save(value: Home | undefined): Promise<void> {
    await repositories.settings.saveHome(value)
    home.value = value
  }

  function $reset(): void {
    home.value = undefined
    loaded.value = false
  }

  return { home, loaded, load, save, $reset }
})
