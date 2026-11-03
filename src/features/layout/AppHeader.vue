<script setup lang="ts">
import { Settings } from '@lucide/vue'
import { useOverlay } from '@/composables/useOverlay'
import { Button } from '@/components/ui/button'
import CategorySwitch from './CategorySwitch.vue'

const { toggle } = useOverlay()
</script>

<template>
  <header
    class="z-10 flex items-center gap-2 border-b border-border bg-card px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
  >
    <Button
      variant="ghost"
      size="icon"
      class="shrink-0 rounded-full"
      aria-label="Menu"
      @click="toggle({ name: 'settings' })"
    >
      <Settings />
    </Button>
    <CategorySwitch class="flex-1" />
  </header>
</template>
