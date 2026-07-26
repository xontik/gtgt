<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useExercisesStore } from '../stores/exercises';
import { listLogEntries } from '../api/logEntries';
import { formatDuration } from '../lib/format';
import { periodRange, shiftPeriod, formatPeriodLabel, type Period } from '../lib/period';
import type { LogEntry } from '@gtg/shared';

const store = useExercisesStore();
const entries = ref<LogEntry[]>([]);
const loading = ref(false);

const period = ref<Period>('day');
const referenceDate = ref(new Date());

const label = computed(() => formatPeriodLabel(period.value, referenceDate.value));

async function load() {
  loading.value = true;
  try {
    await store.fetchAll();
    const { start, end } = periodRange(period.value, referenceDate.value);
    entries.value = await listLogEntries({ since: start, until: end });
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch([period, referenceDate], load);

function goPrev() {
  referenceDate.value = shiftPeriod(period.value, referenceDate.value, -1);
}

function goNext() {
  referenceDate.value = shiftPeriod(period.value, referenceDate.value, 1);
}

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
    <v-btn-toggle v-model="period" mandatory density="comfortable" class="mb-4" divided>
      <v-btn value="day">Day</v-btn>
      <v-btn value="week">Week</v-btn>
      <v-btn value="month">Month</v-btn>
      <v-btn value="year">Year</v-btn>
    </v-btn-toggle>

    <div class="d-flex align-center justify-space-between mb-4">
      <v-btn icon="mdi-chevron-left" variant="text" @click="goPrev" />
      <div class="text-subtitle-1">{{ label }}</div>
      <v-btn icon="mdi-chevron-right" variant="text" @click="goNext" />
    </div>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-alert v-else-if="summary.length === 0" type="info" variant="tonal">
      No sets logged in this period.
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
