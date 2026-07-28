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
  <v-card :variant="goalMet ? 'tonal' : 'elevated'" :color="goalMet ? 'success' : undefined" @click="emit('log')">
    <v-card-item>
      <v-card-title class="d-flex align-center ga-1">
        {{ exercise.name }}
        <span v-if="exerciseStreak" class="text-caption text-medium-emphasis d-flex align-center">
          <v-icon icon="mdi-fire" size="14" color="orange" />{{ exerciseStreak }}
        </span>
      </v-card-title>
      <v-card-subtitle>{{ variation.name }}</v-card-subtitle>
      <template #append>
        <v-btn
          v-if="quickAddLabel"
          icon="mdi-plus"
          variant="tonal"
          size="small"
          :title="quickAddLabel"
          @click.stop="emit('quickAdd')"
        />
        <v-btn icon="mdi-chevron-right" variant="text" :to="`/exercises/${exercise.id}`" @click.stop />
      </template>
    </v-card-item>
    <v-card-text class="pt-0 text-caption text-medium-emphasis">
      {{ todayLabel }} · {{ lastLoggedLabel }}
      <div v-if="goalLabel" class="mt-1 d-flex align-center ga-1" :class="goalMet ? 'text-success' : 'text-primary'">
        <v-icon v-if="goalMet" icon="mdi-check-circle" size="14" />
        {{ goalLabel }}
      </div>
    </v-card-text>
  </v-card>
</template>
