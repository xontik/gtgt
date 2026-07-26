<script setup lang="ts">
import type { Exercise } from '@gtg/shared';

defineProps<{
  exercise: Exercise;
  variationName: string | undefined;
}>();

const emit = defineEmits<{ log: [] }>();
</script>

<template>
  <v-card @click="emit('log')">
    <v-card-item>
      <v-card-title>{{ exercise.name }}</v-card-title>
      <v-card-subtitle>{{ variationName ?? 'No active variation' }}</v-card-subtitle>
    </v-card-item>
  </v-card>
</template>
