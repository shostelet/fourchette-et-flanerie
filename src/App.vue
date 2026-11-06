<script setup lang="ts">
import { onMounted, watchEffect } from 'vue'
import { RouterView } from 'vue-router'
import AppToast from '@/components/common/AppToast.vue'
import { useAppDataStore } from '@/stores/app-data'
import { usePreferencesStore } from '@/stores/preferences'
import { hideSplash } from '@/utils/splash'

const appData = useAppDataStore()
const preferences = usePreferencesStore()

// Drives the accent color and the light/dark theme (see assets/theme.css).
watchEffect(() => {
  const root = document.documentElement
  root.dataset.category = preferences.activeCategory
  root.classList.toggle('dark', preferences.isDark)
  // Status bar color of the phone, in tune with the header.
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    preferences.isDark ? '#262320' : '#fffdf9',
  )
})

onMounted(() => {
  appData.loadAll().catch((error: unknown) => {
    console.error(error)
    // No map will come: show the error message right away.
    hideSplash()
  })
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
  <AppToast />
</template>
