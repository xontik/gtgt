<script setup lang="ts">
import type { Exercise, ExerciseVariation } from '@gtg/shared';

defineProps<{
  exercise: Exercise;
  variation: ExerciseVariation;
  todayLabel: string;
  lastLoggedLabel: string;
  goalLabel?: string;
  goalMet?: boolean;
  quickAddLabel?: string;
  exerciseStreak?: number;
}>();

const emit = defineEmits<{ log: []; quickAdd: [] }>();
</script>

<template>
  <v-card
    class="h-100 w-100 d-flex flex-column"
    style="min-width: 0"
    :variant="goalMet ? 'tonal' : 'elevated'"
    :color="goalMet ? 'success' : undefined"
    @click="emit('log')"
  >
    <v-card-item>
      <v-card-title class="d-flex align-center ga-1" style="min-width: 0">
        <span class="text-truncate" style="min-width: 0; flex: 1 1 auto">{{ exercise.name }}</span>
        <span v-if="exerciseStreak" class="text-caption text-medium-emphasis d-flex align-center flex-shrink-0">
          <v-icon icon="mdi-fire" size="14" color="orange" />{{ exerciseStreak }}
        </span>
      </v-card-title>
      <v-card-subtitle class="text-truncate">{{ variation.name }}</v-card-subtitle>
      <template #append>
        <div class="d-flex flex-column align-center ga-1">
          <v-btn
            v-if="quickAddLabel"
            icon="mdi-plus"
            variant="tonal"
            size="small"
            :title="quickAddLabel"
            :aria-label="`Log ${quickAddLabel}`"
            @click.stop="emit('quickAdd')"
          />
          <v-btn
            icon="mdi-chevron-right"
            variant="text"
            size="small"
            :to="`/exercises/${exercise.id}`"
            :aria-label="`View ${exercise.name}`"
            @click.stop
          />
        </div>
      </template>
    </v-card-item>
    <v-card-text class="pt-0 text-caption text-medium-emphasis flex-grow-1 d-flex flex-column justify-end">
      {{ todayLabel }} · {{ lastLoggedLabel }}
      <div
        class="mt-1 d-flex align-center ga-1"
        style="min-height: 18px"
        :class="goalLabel && goalMet ? 'text-success' : 'text-primary'"
      >
        <template v-if="goalLabel">
          <v-icon v-if="goalMet" icon="mdi-check-circle" size="14" />
          {{ goalLabel }}
        </template>
      </div>
    </v-card-text>
  </v-card>
</template>
