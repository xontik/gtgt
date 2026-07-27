<script setup lang="ts">
import type { Exercise } from '@gtg/shared';

defineProps<{
  exercise: Exercise;
  variationName: string | undefined;
  todayLabel: string;
  lastLoggedLabel: string;
}>();

const emit = defineEmits<{ log: [] }>();
</script>

<template>
  <v-card @click="emit('log')">
    <v-card-item>
      <v-card-title>{{ exercise.name }}</v-card-title>
      <v-card-subtitle>{{ variationName ?? 'No active variation' }}</v-card-subtitle>
      <template #append>
        <v-btn
          icon="mdi-chevron-right"
          variant="text"
          :to="`/exercises/${exercise.id}`"
          @click.stop
        />
      </template>
    </v-card-item>
    <v-card-text class="pt-0 text-caption text-medium-emphasis">
      {{ todayLabel }} · {{ lastLoggedLabel }}
    </v-card-text>
  </v-card>
</template>
