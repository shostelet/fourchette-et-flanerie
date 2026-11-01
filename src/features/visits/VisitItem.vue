<script setup lang="ts">
import { Pencil } from '@lucide/vue'
import { computed, ref } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { Button } from '@/components/ui/button'
import { CRITERION_LABELS, RATING_FACES } from '@/config/ratings'
import type { VisitPatch } from '@/domain/entities'
import { formatVisitDate } from '@/domain/format'
import { RATING_CRITERIA, type Visit } from '@/domain/models'
import { useVisitsStore } from '@/stores/visits'
import VisitForm from './VisitForm.vue'

const props = defineProps<{ visit: Visit }>()

const visits = useVisitsStore()
const editing = ref(false)
const busy = ref(false)

const ratings = computed(() =>
  RATING_CRITERIA.flatMap((criterion) => {
    const face = RATING_FACES.find((f) => f.value === props.visit[criterion])
    return face ? [{ criterion, label: CRITERION_LABELS[criterion], face }] : []
  }),
)

async function save(fields: VisitPatch): Promise<void> {
  busy.value = true
  try {
    await visits.update(props.visit.id, fields)
    editing.value = false
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <li class="rounded-lg bg-background p-3">
    <VisitForm
      v-if="editing"
      :initial="visit"
      submit-label="Enregistrer"
      :busy="busy"
      @save="save"
      @cancel="editing = false"
    />
    <template v-else>
      <div class="flex items-start justify-between gap-2">
        <div class="space-y-1">
          <p class="text-sm font-medium" :class="{ 'text-muted-foreground italic': !visit.date }">
            {{ formatVisitDate(visit.date) }}
          </p>
          <p v-if="ratings.length" class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span
              v-for="rating in ratings"
              :key="rating.criterion"
              class="inline-flex items-center gap-1"
              :title="`${rating.label} : ${rating.face.label}`"
            >
              <AppIcon :name="rating.face.icon" class="size-4 text-primary" />
              <span class="text-muted-foreground">{{ rating.label }}</span>
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="-mt-1 -mr-1 size-8 rounded-full"
          aria-label="Modifier la visite"
          @click="editing = true"
        >
          <Pencil />
        </Button>
      </div>
      <p v-if="visit.comment" class="mt-1 text-sm whitespace-pre-line">{{ visit.comment }}</p>
    </template>
  </li>
</template>
