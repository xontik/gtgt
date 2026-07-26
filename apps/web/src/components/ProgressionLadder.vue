<script setup lang="ts">
import type { ExerciseVariation } from '@gtg/shared';

const props = defineProps<{
  variations: ExerciseVariation[];
  activeVariationId: number | null;
}>();

const emit = defineEmits<{
  select: [variationId: number];
  reorder: [variationId: number, direction: 'up' | 'down'];
  edit: [variationId: number];
}>();

function isActive(variation: ExerciseVariation) {
  return variation.id === props.activeVariationId;
}
</script>

<template>
  <v-timeline align="start" side="end" density="compact" line-thickness="2">
    <v-timeline-item
      v-for="(variation, index) in props.variations"
      :key="variation.id"
      :dot-color="isActive(variation) ? 'primary' : 'grey-lighten-1'"
      :icon="isActive(variation) ? 'mdi-check' : undefined"
      size="small"
      fill-dot
    >
      <div class="d-flex align-center ga-2">
        <div class="flex-grow-1" style="cursor: pointer" @click="emit('select', variation.id)">
          <div :class="isActive(variation) ? 'font-weight-bold' : ''">{{ variation.name }}</div>
          <div v-if="isActive(variation)" class="text-caption text-primary">Active</div>
        </div>
        <v-btn
          icon="mdi-arrow-up"
          size="x-small"
          variant="text"
          :disabled="index === 0"
          @click="emit('reorder', variation.id, 'up')"
        />
        <v-btn
          icon="mdi-arrow-down"
          size="x-small"
          variant="text"
          :disabled="index === props.variations.length - 1"
          @click="emit('reorder', variation.id, 'down')"
        />
        <v-btn icon="mdi-pencil" size="x-small" variant="text" @click="emit('edit', variation.id)" />
      </div>
    </v-timeline-item>
  </v-timeline>
</template>
