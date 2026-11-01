<script setup lang="ts">
import { onMounted, watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import { useAppDataStore } from '@/stores/app-data'
import { usePreferencesStore } from '@/stores/preferences'

const appData = useAppDataStore()
const preferences = usePreferencesStore()

// Drives the accent color of the theme (see assets/theme.css).
watchEffect(() => {
  document.documentElement.dataset.category = preferences.activeCategory
})

onMounted(() => {
  appData.loadAll().catch((error: unknown) => console.error(error))
})
</script>

<template>
  <div
    v-if="appData.error"
    role="alert"
    class="flex h-dvh items-center justify-center p-6 text-center text-destructive"
  >
    Impossible de charger les données enregistrées sur cet appareil.
  </div>
  <RouterView v-else />
</template>
