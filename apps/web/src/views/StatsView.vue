<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useExercisesStore } from '../stores/exercises';
import { listLogEntries } from '../api/logEntries';
import { periodRange, shiftPeriod, formatPeriodLabel, type Period } from '../lib/period';
import { dateKey, buildWeekColumns, eachDayOfRange } from '../lib/heatmap';
import { exerciseColorVar } from '../lib/colors';
import ExerciseStatsRow from '../components/ExerciseStatsRow.vue';
import SegmentedBarsChart from '../components/SegmentedBarsChart.vue';
import GroupedBarsChart from '../components/GroupedBarsChart.vue';
import MergedHeatmap from '../components/MergedHeatmap.vue';
import type { Exercise, LogEntry } from '@gtg/shared';

const store = useExercisesStore();
const entries = ref<LogEntry[]>([]);
const loading = ref(false);

const period = ref<Period>('day');
const referenceDate = ref(new Date());

const label = computed(() => formatPeriodLabel(period.value, referenceDate.value));
const periodStart = computed(() => periodRange(period.value, referenceDate.value).start);
const periodEnd = computed(() => periodRange(period.value, referenceDate.value).end);
const periodDays = computed(() => eachDayOfRange(periodStart.value, periodEnd.value));
const weeks = computed(() => buildWeekColumns(periodStart.value, periodEnd.value));

function goPrev() {
  referenceDate.value = shiftPeriod(period.value, referenceDate.value, -1);
}

function goNext() {
  referenceDate.value = shiftPeriod(period.value, referenceDate.value, 1);
}

const selectedExerciseIds = ref<number[]>([]);

// The year heatmap renders hundreds of per-day tooltips, which blocks the
// main thread synchronously. Briefly show a spinner (across two animation
// frames, so the browser actually paints it) before doing that heavy render,
// instead of freezing with no feedback.
const viewLoading = ref(false);

watch(
  [period, selectedExerciseIds],
  () => {
    viewLoading.value = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        viewLoading.value = false;
      });
    });
  },
  { deep: true },
);

async function load() {
  loading.value = true;
  try {
    await store.fetchAll();
    entries.value = await listLogEntries();

    const mostRecent = entries.value.reduce<LogEntry | undefined>(
      (latest, e) => (!latest || new Date(e.timestamp) > new Date(latest.timestamp) ? e : latest),
      undefined,
    );
    if (mostRecent) {
      const variation = store.variations.find((v) => v.id === mostRecent.variationId);
      if (variation) selectedExerciseIds.value = [variation.exerciseId];
    }
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function entriesForExercise(exerciseId: number) {
  const variationIds = new Set(store.variationsFor(exerciseId).map((v) => v.id));
  return entries.value.filter((e) => variationIds.has(e.variationId));
}

function colorFor(exercise: Exercise) {
  const index = store.exercises.findIndex((e) => e.id === exercise.id);
  return exerciseColorVar(index);
}

function toggleExercise(id: number) {
  const i = selectedExerciseIds.value.indexOf(id);
  if (i === -1) selectedExerciseIds.value.push(id);
  else selectedExerciseIds.value.splice(i, 1);
}

const selectedExercises = computed(() =>
  store.exercises.filter((e) => selectedExerciseIds.value.includes(e.id)),
);

function dailyTotalsFor(exerciseId: number) {
  const map = new Map<string, number>();
  for (const entry of entriesForExercise(exerciseId)) {
    const key = dateKey(new Date(entry.timestamp));
    map.set(key, (map.get(key) ?? 0) + entry.value);
  }
  return map;
}

const mergedDayItems = computed(() =>
  selectedExercises.value.map((exercise) => {
    const dailyTotals = dailyTotalsFor(exercise.id);
    const dayEntries = entriesForExercise(exercise.id).filter((e) => {
      const t = new Date(e.timestamp);
      return t >= periodStart.value && t <= periodEnd.value;
    });
    return {
      label: exercise.name,
      color: colorFor(exercise),
      values: dayEntries.map((e) => e.value),
      maxValue: Math.max(0, ...dailyTotals.values()),
      metricType: exercise.metricType,
    };
  }),
);

const mergedGroupSeries = computed(() =>
  selectedExercises.value.map((exercise) => {
    const dailyTotals = dailyTotalsFor(exercise.id);
    return {
      exercise,
      color: colorFor(exercise),
      dailyTotals,
      maxValue: Math.max(0, ...dailyTotals.values()),
    };
  }),
);

const mergedHeatmapSeries = computed(() =>
  selectedExercises.value.map((exercise) => ({
    exercise,
    dailyTotals: dailyTotalsFor(exercise.id),
  })),
);
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

    <div v-else class="d-flex ga-4">
      <div class="exercise-picker">
        <div
          v-for="exercise in store.exercises"
          :key="exercise.id"
          class="d-flex align-center ga-2 py-1"
          style="cursor: pointer"
          @click="toggleExercise(exercise.id)"
        >
          <v-icon
            :icon="selectedExerciseIds.includes(exercise.id) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline'"
            size="small"
            :style="selectedExerciseIds.includes(exercise.id) ? { color: colorFor(exercise) } : {}"
          />
          <span class="text-body-2">{{ exercise.name }}</span>
        </div>
      </div>

      <div class="flex-grow-1" style="min-width: 0">
        <v-alert v-if="selectedExercises.length === 0" type="info" variant="tonal">
          Select an exercise on the left to see its stats.
        </v-alert>

        <div v-else-if="viewLoading" class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <template v-else-if="period === 'day'">
          <SegmentedBarsChart :items="mergedDayItems" />
        </template>

        <template v-else>
          <div v-if="selectedExercises.length > 1" class="mb-6">
            <div class="text-subtitle-1 mb-2">Combined</div>
            <GroupedBarsChart
              v-if="period === 'week' || period === 'month'"
              :series="mergedGroupSeries"
              :days="periodDays"
            />
            <MergedHeatmap v-else :series="mergedHeatmapSeries" :weeks="weeks" />
          </div>

          <ExerciseStatsRow
            v-for="exercise in selectedExercises"
            :key="exercise.id"
            :exercise="exercise"
            :period="period"
            :entries="entriesForExercise(exercise.id)"
            :period-start="periodStart"
            :period-end="periodEnd"
          />
        </template>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.exercise-picker {
  width: 130px;
  flex-shrink: 0;
}
</style>
