<script setup lang="ts">
import { Settings } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useOverlay } from '@/composables/useOverlay'
import { Button } from '@/components/ui/button'
import CategorySwitch from './CategorySwitch.vue'

const { toggle } = useOverlay()
const route = useRoute()
const menuOpen = computed(() => route.name === 'settings')
</script>

<template>
  <header
    class="z-10 flex items-center gap-2 border-b border-border bg-card px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
  >
    <Button
      variant="ghost"
      size="icon"
      class="shrink-0 rounded-full"
      :class="{ 'bg-accent text-primary': menuOpen }"
      aria-label="Menu"
      :aria-expanded="menuOpen"
      @click="toggle({ name: 'settings' })"
    >
      <Settings />
    </Button>
    <CategorySwitch class="flex-1" />
  </header>
</template>
