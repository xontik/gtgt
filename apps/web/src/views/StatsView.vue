<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useExercisesStore } from '../stores/exercises';
import { listLogEntries } from '../api/logEntries';
import { dataVersion } from '../lib/offlineQueue';
import { periodRange, shiftPeriod, formatPeriodLabel, rollingPeriods, type Period } from '../lib/period';
import { dateKey, buildWeekColumns, eachDayOfRange } from '../lib/heatmap';
import { exerciseColorVar } from '../lib/colors';
import { formatDuration, formatRelativeTime } from '../lib/format';
import ExerciseStatsRow from '../components/ExerciseStatsRow.vue';
import SegmentedBarsChart from '../components/SegmentedBarsChart.vue';
import GroupedBarsChart from '../components/GroupedBarsChart.vue';
import MergedHeatmap from '../components/MergedHeatmap.vue';
import LogEntryList from '../components/LogEntryList.vue';
import type { Exercise, LogEntry } from '@gtg/shared';

const viewMode = ref<'trends' | 'records'>('trends');

const store = useExercisesStore();
const entries = ref<LogEntry[]>([]);
const loading = ref(false);

const period = ref<Period>('day');
const referenceDate = ref(new Date());

const label = computed(() => formatPeriodLabel(period.value, referenceDate.value));
const isRolling = computed(() => rollingPeriods.has(period.value));
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

const filterDrawerOpen = ref(false);

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

async function load(resetSelection = false) {
  loading.value = true;
  try {
    await store.fetchAll();
    entries.value = await listLogEntries();

    if (resetSelection) selected.value = store.favoriteVariations.map((v) => `var-${v.id}`);
  } finally {
    loading.value = false;
  }
}

onMounted(() => load(true));

// A discarded offline mutation (see System page) leaves whatever store it
// touched stale until the next real fetch - refetch here too so Stats
// doesn't keep showing an edit that got dropped from the sync queue.
watch(dataVersion, () => load());

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

interface VariationRecord {
  variationId: number;
  variationName: string;
  bestValue: number;
  bestDate: Date;
}

interface ExerciseRecords {
  exercise: Exercise;
  variations: VariationRecord[];
}

// All-time best per variation, independent of the period/exercise filter
// above - records are a "what have I ever achieved" view, not scoped to
// whatever's currently selected for the trend charts.
const recordsByExercise = computed<ExerciseRecords[]>(() => {
  const entriesByVariation = new Map<number, LogEntry[]>();
  for (const entry of entries.value) {
    const list = entriesByVariation.get(entry.variationId);
    if (list) list.push(entry);
    else entriesByVariation.set(entry.variationId, [entry]);
  }

  return store.exercises
    .map((exercise) => {
      const variations = store
        .activeVariationsFor(exercise.id)
        .map((variation) => {
          const variationEntries = entriesByVariation.get(variation.id);
          if (!variationEntries || variationEntries.length === 0) return null;
          const best = variationEntries.reduce((acc, e) => (e.value > acc.value ? e : acc));
          return {
            variationId: variation.id,
            variationName: variation.name,
            bestValue: best.value,
            bestDate: new Date(best.timestamp),
          };
        })
        .filter((v): v is VariationRecord => v !== null);
      return { exercise, variations };
    })
    .filter((e) => e.variations.length > 0);
});

function recordValueLabel(exercise: Exercise, value: number) {
  return exercise.metricType === 'time' ? formatDuration(value) : `${value} reps`;
}
</script>

<template>
  <v-container>
    <v-tabs v-model="viewMode" class="mb-4" density="comfortable">
      <v-tab value="trends">Trends</v-tab>
      <v-tab value="records">Records</v-tab>
    </v-tabs>

    <template v-if="viewMode === 'records'">
      <v-progress-linear v-if="loading" indeterminate class="mb-4" />
      <v-alert v-else-if="recordsByExercise.length === 0" type="info" variant="tonal">
        No sets logged yet - records show up here once you do.
      </v-alert>
      <v-expansion-panels v-else variant="accordion">
        <v-expansion-panel v-for="record in recordsByExercise" :key="record.exercise.id">
          <v-expansion-panel-title>{{ record.exercise.name }}</v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-list density="compact">
              <v-list-item
                v-for="variation in record.variations"
                :key="variation.variationId"
                :title="variation.variationName"
                :subtitle="`Best: ${recordValueLabel(record.exercise, variation.bestValue)} · ${formatRelativeTime(variation.bestDate)}`"
              >
                <template #prepend>
                  <v-icon icon="mdi-trophy-outline" color="warning" />
                </template>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>

    <template v-else>
      <div class="d-flex align-center ga-2 mb-2 flex-wrap">
        <v-btn-toggle v-model="period" mandatory density="comfortable" divided>
          <v-btn value="day">Day</v-btn>
          <v-btn value="week">Week</v-btn>
          <v-btn value="month">Month</v-btn>
          <v-btn value="year">Year</v-btn>
        </v-btn-toggle>
        <v-btn-toggle v-model="period" mandatory density="comfortable" divided>
          <v-btn value="last7">7d</v-btn>
          <v-btn value="last30">30d</v-btn>
        </v-btn-toggle>
        <v-spacer />
        <v-btn icon variant="tonal" aria-label="Filter exercises" @click="filterDrawerOpen = true">
          <v-badge :content="selectedExercises.length" :model-value="selectedExercises.length > 0" color="primary">
            <v-icon icon="mdi-filter-variant" />
          </v-badge>
        </v-btn>
      </div>

      <div class="d-flex align-center justify-space-between mb-4">
        <v-btn icon="mdi-chevron-left" variant="text" :disabled="isRolling" aria-label="Previous period" @click="goPrev" />
        <div class="text-subtitle-1">{{ label }}</div>
        <v-btn icon="mdi-chevron-right" variant="text" :disabled="isRolling" aria-label="Next period" @click="goNext" />
      </div>

      <v-progress-linear v-if="loading" indeterminate class="mb-4" />

      <template v-else>
      <div style="min-width: 0">
        <v-alert v-if="selectedExercises.length === 0" type="info" variant="tonal">
          Tap the filter icon above to pick which exercises to show.
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
              v-if="period === 'week' || period === 'month' || isRolling"
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
    </template>
    </template>

    <v-navigation-drawer v-model="filterDrawerOpen" location="end" temporary width="280">
      <div class="d-flex align-center justify-space-between pa-4 pb-2">
        <div class="text-subtitle-1">Filter exercises</div>
        <v-btn icon="mdi-close" variant="text" size="small" aria-label="Close filter" @click="filterDrawerOpen = false" />
      </div>
      <v-treeview
        v-model:selected="selected"
        :items="treeItems"
        item-value="id"
        select-strategy="classic"
        selectable
        density="compact"
        open-all
        slim
        class="px-2"
      >
        <template #title="{ item: rawItem }">
          <div v-for="item in [asPickerNode(rawItem)]" :key="item.id" class="d-flex align-center ga-2">
            <v-avatar size="10" :color="item.color" class="flex-shrink-0" />
            <span class="text-body-2">{{ item.title }}</span>
          </div>
        </template>
      </v-treeview>
    </v-navigation-drawer>
  </v-container>
</template>
