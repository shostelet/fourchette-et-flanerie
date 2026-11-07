<script setup lang="ts">
import { ref } from 'vue'
import RatingInput from '@/components/common/RatingInput.vue'
import { Button } from '@/components/ui/button'
import { CRITERION_LABELS } from '@/config/ratings'
import { cleanText, todayIsoDate, type VisitPatch } from '@/domain/entities'
import type { Visit } from '@/domain/models'

/** Visit fields, for adding (defaults: today, no rating) or editing a visit. */
const props = defineProps<{
  initial?: Visit
  submitLabel: string
  busy?: boolean
}>()

const emit = defineEmits<{
  save: [fields: VisitPatch]
  cancel: []
}>()

// Empty string = unknown date (the native date input uses '' for "no value").
const date = ref(props.initial ? (props.initial.date ?? '') : todayIsoDate())
const quality = ref(props.initial?.quality)
const value = ref(props.initial?.value)
const comment = ref(props.initial?.comment ?? '')

function submit(): void {
  emit('save', {
    date: date.value || undefined,
    quality: quality.value,
    value: value.value,
    comment: cleanText(comment.value),
  })
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="submit">
    <div class="flex flex-wrap items-end gap-2">
      <label class="space-y-1">
        <span class="block text-sm font-medium">Date</span>
        <input
          v-model="date"
          type="date"
          :max="todayIsoDate()"
          class="h-10 rounded-lg border border-input bg-background px-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <button
        v-if="date"
        type="button"
        class="h-10 text-sm text-muted-foreground underline hover:text-foreground"
        @click="date = ''"
      >
        Date inconnue
      </button>
      <span v-else class="h-10 content-center text-sm text-muted-foreground">Date inconnue</span>
    </div>

    <div class="flex flex-wrap gap-x-6 gap-y-3">
      <RatingInput v-model="quality" :label="CRITERION_LABELS.quality" />
      <RatingInput v-model="value" :label="CRITERION_LABELS.value" />
    </div>

    <textarea
      v-model="comment"
      rows="2"
      placeholder="Commentaire…"
      class="w-full rounded-lg border border-input bg-background p-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />

    <div class="flex justify-end gap-2">
      <Button type="button" variant="ghost" :disabled="busy" @click="emit('cancel')">Annuler</Button>
      <Button type="submit" :disabled="busy">{{ submitLabel }}</Button>
    </div>
  </form>
</template>
