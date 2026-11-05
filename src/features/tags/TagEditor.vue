<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import IconPicker from '@/components/common/IconPicker.vue'
import TagChip from '@/components/common/TagChip.vue'
import { Button } from '@/components/ui/button'
import { TAG_COLORS } from '@/config/tag-colors'
import { TAG_ICONS } from '@/config/tag-icons'
import type { TagFields } from './tag-fields'

/**
 * Name, color and icon of a tag, with a live preview.
 * For a new tag (`isNew`), nothing exists until "Créer": cancel discards it,
 * and there is nothing to delete.
 */
const props = withDefaults(defineProps<{ initial: TagFields; isNew?: boolean; busy?: boolean }>(), {
  isNew: false,
  busy: false,
})
const emit = defineEmits<{ save: [fields: TagFields]; delete: []; cancel: [] }>()

const name = ref(props.initial.name)
const color = ref(props.initial.color)
const icon = ref(props.initial.icon)
const nameInput = useTemplateRef<HTMLInputElement>('nameInput')

onMounted(() => {
  nameInput.value?.focus()
  if (props.isNew) nameInput.value?.select()
})

function submit(): void {
  if (name.value.trim()) emit('save', { name: name.value.trim(), color: color.value, icon: icon.value })
}
</script>

<template>
  <form class="space-y-4 rounded-xl border border-primary bg-background p-3" @submit.prevent="submit">
    <div class="flex items-center gap-3">
      <span class="rounded-full border border-input bg-card px-2.5 py-1 text-sm">
        <TagChip :tag="{ name: name || '…', color, icon }" />
      </span>
      <input
        ref="nameInput"
        v-model="name"
        type="text"
        required
        :placeholder="isNew ? 'Nom du nouveau tag' : undefined"
        aria-label="Nom du tag"
        class="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        @keydown.esc="emit('cancel')"
      />
    </div>

    <div class="space-y-1">
      <span class="text-sm font-medium">Couleur</span>
      <div role="group" aria-label="Couleur" class="flex flex-wrap items-center gap-2">
        <button
          v-for="value in TAG_COLORS"
          :key="value"
          type="button"
          :aria-pressed="color.toLowerCase() === value"
          :aria-label="value"
          class="size-8 rounded-full border-2 transition-transform"
          :class="color.toLowerCase() === value ? 'scale-110 border-foreground' : 'border-card'"
          :style="{ backgroundColor: value }"
          @click="color = value"
        />
        <!-- Any other color -->
        <label
          class="relative flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-input text-xs text-muted-foreground"
          title="Autre couleur"
        >
          +
          <input v-model="color" type="color" class="absolute inset-0 cursor-pointer opacity-0" aria-label="Autre couleur" />
        </label>
      </div>
    </div>

    <div class="space-y-1">
      <span class="text-sm font-medium">Icône (facultative)</span>
      <IconPicker v-model="icon" :options="TAG_ICONS" label="Icône du tag" allow-none wrap />
    </div>

    <div class="flex flex-wrap justify-between gap-2">
      <Button
        v-if="!isNew"
        type="button"
        variant="ghost"
        class="text-destructive"
        :disabled="busy"
        @click="emit('delete')"
      >
        Supprimer
      </Button>
      <div class="ml-auto flex gap-2">
        <Button type="button" variant="ghost" :disabled="busy" @click="emit('cancel')">Annuler</Button>
        <Button type="submit" :disabled="busy || !name.trim()">{{ isNew ? 'Créer' : 'Enregistrer' }}</Button>
      </div>
    </div>
  </form>
</template>
