<script setup lang="ts">
import { Settings } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import CategorySwitch from './CategorySwitch.vue'
</script>

<template>
  <header
    class="z-10 flex items-center gap-2 border-b border-border bg-card px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
  >
    <Button as-child variant="ghost" size="icon" class="shrink-0 rounded-full">
      <RouterLink :to="{ name: 'settings' }" aria-label="Ouvrir le menu">
        <Settings />
      </RouterLink>
    </Button>
    <CategorySwitch class="flex-1" />
  </header>
</template>
