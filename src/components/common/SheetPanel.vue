<script setup lang="ts">
import { X } from '@lucide/vue'
import { Button } from '@/components/ui/button'

/** Full-height panel over the map, with a title, a scrollable body and an optional footer. */
defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <section class="absolute inset-0 z-20 flex flex-col bg-background" :aria-label="title">
    <header class="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
      <h2 class="text-lg font-semibold">{{ title }}</h2>
      <Button variant="ghost" size="icon" class="rounded-full" aria-label="Fermer" @click="emit('close')">
        <X />
      </Button>
    </header>
    <div class="flex-1 overflow-y-auto p-4">
      <slot />
    </div>
    <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-border bg-card p-3">
      <slot name="footer" />
    </footer>
  </section>
</template>
