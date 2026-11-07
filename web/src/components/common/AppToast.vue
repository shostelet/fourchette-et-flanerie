<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { message } = useToast()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
    <Transition
      enter-from-class="translate-y-2 opacity-0"
      leave-to-class="translate-y-2 opacity-0"
      enter-active-class="transition duration-200"
      leave-active-class="transition duration-200"
    >
      <p
        v-if="message"
        role="status"
        class="rounded-full bg-ink px-4 py-2 text-sm text-cream shadow-lg"
      >
        {{ message }}
      </p>
    </Transition>
  </div>
</template>
