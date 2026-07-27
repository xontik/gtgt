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
import LogEntryList from '../components/LogEntryList.vue';
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

interface PickerNode {
  id: string;
  title: string;
  color: string;
  children?: PickerNode[];
}

const treeItems = computed<PickerNode[]>(() =>
  store.exercises.map((exercise, index) => {
    const color = exerciseColorVar(index);
    return {
      id: `ex-${exercise.id}`,
      title: exercise.name,
      color,
      children: store.variationsFor(exercise.id).map((v) => ({
        id: `var-${v.id}`,
        title: v.deletedAt ? `${v.name} (deleted)` : v.name,
        color,
      })),
    };
  }),
);

function asPickerNode(item: unknown) {
  return item as PickerNode;
}

const selected = ref<string[]>([]);

const selectedVariationIds = computed(
  () =>
    new Set(
      selected.value.filter((id) => id.startsWith('var-')).map((id) => Number(id.slice(4))),
    ),
);

const selectedExerciseIds = computed(() => {
  const ids = new Set<number>();
  for (const variationId of selectedVariationIds.value) {
    const variation = store.variations.find((v) => v.id === variationId);
    if (variation) ids.add(variation.exerciseId);
  }
  return [...ids];
});

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

    selected.value = store.favoriteVariations.map((v) => `var-${v.id}`);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function entriesForExercise(exerciseId: number) {
  return entries.value.filter((e) => {
    if (!selectedVariationIds.value.has(e.variationId)) return false;
    const variation = store.variations.find((v) => v.id === e.variationId);
    return variation?.exerciseId === exerciseId;
  });
}

function periodEntriesForExercise(exerciseId: number) {
  return entriesForExercise(exerciseId).filter((e) => {
    const t = new Date(e.timestamp);
    return t >= periodStart.value && t <= periodEnd.value;
  });
}

function onEntryUpdate(updated: LogEntry) {
  const index = entries.value.findIndex((e) => e.id === updated.id);
  if (index !== -1) entries.value[index] = updated;
}

function onEntryRemove(id: number) {
  entries.value = entries.value.filter((e) => e.id !== id);
}

function onEntryRestore(entry: LogEntry) {
  entries.value = [...entries.value, entry].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function colorFor(exercise: Exercise) {
  const index = store.exercises.findIndex((e) => e.id === exercise.id);
  return exerciseColorVar(index);
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
        <v-treeview
          v-model:selected="selected"
          :items="treeItems"
          item-value="id"
          select-strategy="classic"
          selectable
          density="compact"
          open-all
          slim
        >
          <template #title="{ item: rawItem }">
            <div v-for="item in [asPickerNode(rawItem)]" :key="item.id" class="d-flex align-center ga-2">
              <v-avatar size="10" :color="item.color" class="flex-shrink-0" />
              <span class="text-body-2">{{ item.title }}</span>
            </div>
          </template>
        </v-treeview>
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

          <v-expansion-panels v-for="exercise in selectedExercises" :key="exercise.id" class="mb-4" variant="accordion">
            <v-expansion-panel>
              <v-expansion-panel-title>
                {{ exercise.name }} — {{ periodEntriesForExercise(exercise.id).length }} set{{
                  periodEntriesForExercise(exercise.id).length === 1 ? '' : 's'
                }}
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <LogEntryList
                  :entries="periodEntriesForExercise(exercise.id)"
                  empty-text="No sets in this period."
                  @update="onEntryUpdate"
                  @remove="onEntryRemove"
                  @restore="onEntryRestore"
                />
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
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
            @update="onEntryUpdate"
            @remove="onEntryRemove"
            @restore="onEntryRestore"
          />
        </template>
      </div>
    </div>
  </v-container>
</template>

<style scoped>
.exercise-picker {
  width: 200px;
  flex-shrink: 0;
}
</style>
