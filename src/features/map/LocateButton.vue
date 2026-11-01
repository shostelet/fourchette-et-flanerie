<script setup lang="ts">
import { Locate, LocateFixed, LocateOff } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useGeolocation, type GeolocationStatus } from '@/composables/useGeolocation'
import { useMapController } from './map-controller'

const { status, locate } = useGeolocation()
const { flyTo } = useMapController()

const message = ref<string>()
const busy = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | undefined

const MESSAGES = {
  denied:
    'La localisation est bloquée pour ce site. Dans Chrome : touche l’icône à gauche de l’adresse, puis Autorisations › Position.',
  unavailable:
    'Impossible d’obtenir ta position : vérifie que la localisation du téléphone est activée.',
  unsupported: 'La localisation n’est pas disponible ici (elle nécessite une connexion HTTPS).',
  timeout: 'La position met trop de temps à arriver, réessaie dans un instant.',
} as const

const icon = computed(() => {
  if (status.value === 'granted') return LocateFixed
  if (status.value === 'prompt') return Locate
  return LocateOff
})

/** Greyed out until allowed, as requested; still clickable to explain or prompt. */
const isActive = computed(() => status.value === 'granted')

function showMessage(text: string): void {
  message.value = text
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => (message.value = undefined), 6000)
}

async function onClick(): Promise<void> {
  if (status.value === 'denied' || status.value === 'unsupported') {
    showMessage(MESSAGES[status.value])
    return
  }
  busy.value = true
  try {
    flyTo(await locate())
    message.value = undefined
  } catch {
    // locate() may have changed the status: read it again.
    const current = status.value as GeolocationStatus
    if (current === 'denied') showMessage(MESSAGES.denied)
    else if (current === 'unavailable') showMessage(MESSAGES.unavailable)
    else if (current !== 'prompt') showMessage(MESSAGES.timeout)
  } finally {
    busy.value = false
  }
}

onBeforeUnmount(() => clearTimeout(hideTimer))
</script>

<template>
  <div class="absolute right-3 bottom-3 z-10 flex flex-col items-end gap-2">
    <p v-if="message" role="status" class="max-w-64 rounded-lg bg-card px-3 py-2 text-sm shadow-lg">
      {{ message }}
    </p>
    <button
      type="button"
      aria-label="Me localiser"
      :aria-busy="busy"
      class="flex size-11 items-center justify-center rounded-full border border-border bg-card shadow-md transition-colors"
      :class="isActive ? 'text-primary' : 'text-muted-foreground opacity-80'"
      @click="onClick"
    >
      <component :is="icon" class="size-5" :class="{ 'animate-pulse': busy }" />
    </button>
  </div>
</template>
