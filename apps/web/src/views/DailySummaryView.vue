<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useExercisesStore } from '../stores/exercises';
import { listLogEntries } from '../api/logEntries';
import { formatDuration } from '../lib/format';
import type { LogEntry } from '@gtg/shared';

const store = useExercisesStore();
const entries = ref<LogEntry[]>([]);
const loading = ref(false);

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

async function load() {
  loading.value = true;
  try {
    await store.fetchAll();
    entries.value = await listLogEntries({ since: startOfToday(), until: endOfToday() });
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const summary = computed(() => {
  return store.exercises
    .map((exercise) => {
      const variationIds = new Set(store.variationsFor(exercise.id).map((v) => v.id));
      const exerciseEntries = entries.value.filter((e) => variationIds.has(e.variationId));
      const total = exerciseEntries.reduce((sum, e) => sum + e.value, 0);
      return {
        exercise,
        total,
        setCount: exerciseEntries.length,
      };
    })
    .filter((row) => row.setCount > 0);
});
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-4">Today</h1>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-alert v-else-if="summary.length === 0" type="info" variant="tonal">
      No sets logged yet today.
    </v-alert>

    <v-list v-else lines="two">
      <v-list-item v-for="row in summary" :key="row.exercise.id" :title="row.exercise.name">
        <template #subtitle>
          {{ row.setCount }} set{{ row.setCount === 1 ? '' : 's' }} ·
          {{ row.exercise.metricType === 'time' ? formatDuration(row.total) : `${row.total} reps` }}
        </template>
      </v-list-item>
    </v-list>
  </v-container>
</template>
