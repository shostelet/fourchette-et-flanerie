<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { RATING_FACES } from '@/config/ratings'
import { pluralize } from '@/domain/format'
import { formatAverage, ratingGaugePosition, type RatingSummary } from '@/domain/ratings'

/**
 * Average of a criterion, as agreed ("option C"): the five faces with the
 * nearest one lit, and a thin gauge with a dot at the exact average.
 * `compact`: just the nearest face and the number.
 */
const props = withDefaults(
  defineProps<{
    label: string
    summary: RatingSummary | null
    compact?: boolean
  }>(),
  { compact: false },
)

const nearestFace = computed(() =>
  props.summary ? RATING_FACES.find((f) => f.value === props.summary!.nearest) : undefined,
)
const gaugeLeft = computed(() =>
  props.summary ? `${ratingGaugePosition(props.summary.average) * 100}%` : '0%',
)
const description = computed(() =>
  props.summary
    ? `${props.label} : ${formatAverage(props.summary.average)} sur 5, ${pluralize(props.summary.count, 'avis', 'avis')}`
    : `${props.label} : pas encore noté`,
)
</script>

<template>
  <!-- Compact: one face + number -->
  <span
    v-if="compact"
    class="inline-flex items-center gap-1 text-sm"
    :title="description"
    :aria-label="description"
  >
    <template v-if="summary && nearestFace">
      <AppIcon :name="nearestFace.icon" class="size-4 text-primary" />
      <span class="font-medium">{{ formatAverage(summary.average) }}</span>
    </template>
    <span v-else class="text-muted-foreground">–</span>
    <span class="text-muted-foreground">{{ label }}</span>
  </span>

  <!-- Full: faces + gauge -->
  <div v-else class="space-y-1" role="img" :aria-label="description">
    <div class="flex items-baseline justify-between gap-2">
      <span class="text-sm font-medium">{{ label }}</span>
      <span v-if="summary" class="text-sm text-muted-foreground">
        <strong class="text-foreground">{{ formatAverage(summary.average) }}</strong>
        · {{ pluralize(summary.count, 'avis', 'avis') }}
      </span>
      <span v-else class="text-sm text-muted-foreground">Pas encore noté</span>
    </div>
    <div class="w-fit">
      <div class="flex gap-1" aria-hidden="true">
        <AppIcon
          v-for="face in RATING_FACES"
          :key="face.value"
          :name="face.icon"
          class="size-7 transition-colors"
          :class="summary?.nearest === face.value ? 'text-primary' : 'text-muted-foreground/40'"
        />
      </div>
      <!-- Gauge: from the center of the first face to the center of the last one -->
      <div v-if="summary" class="relative mx-3.5 mt-1 h-1 rounded-full bg-muted" aria-hidden="true">
        <span
          class="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
          :style="{ left: gaugeLeft }"
        />
      </div>
    </div>
  </div>
</template>
