<script setup lang="ts">
import { computed } from 'vue'
import { resolveIcon } from '@/config/icon-registry'

const props = defineProps<{
  /** Icon key, e.g. "utensils". Unknown keys show a question mark. */
  name: string
}>()

const icon = computed(() => resolveIcon(props.name))
</script>

<template>
  <component :is="icon" aria-hidden="true" />
</template>
