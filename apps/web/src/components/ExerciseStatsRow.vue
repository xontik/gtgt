<script setup lang="ts">
import { computed } from 'vue';
import type { Exercise, LogEntry } from '@gtg/shared';
import type { Period } from '../lib/period';
import { dateKey, buildWeekColumns, eachDayOfRange } from '../lib/heatmap';
import { formatDuration } from '../lib/format';
import HeatmapCalendar from './HeatmapCalendar.vue';
import BarsChart from './BarsChart.vue';

const props = defineProps<{
  exercise: Exercise;
  period: Exclude<Period, 'day'>;
  entries: LogEntry[]; // all-time entries for this exercise
  periodStart: Date;
  periodEnd: Date;
}>();

const dailyTotals = computed(() => {
  const map = new Map<string, number>();
  for (const entry of props.entries) {
    const key = dateKey(new Date(entry.timestamp));
    map.set(key, (map.get(key) ?? 0) + entry.value);
  }
  return map;
});

const allTimeMaxDailyTotal = computed(() => Math.max(0, ...dailyTotals.value.values()));

const periodEntries = computed(() =>
  props.entries.filter((e) => {
    const t = new Date(e.timestamp);
    return t >= props.periodStart && t <= props.periodEnd;
  }),
);

const periodTotal = computed(() => periodEntries.value.reduce((sum, e) => sum + e.value, 0));

const weeks = computed(() => buildWeekColumns(props.periodStart, props.periodEnd));

const periodDays = computed(() =>
  eachDayOfRange(props.periodStart, props.periodEnd).map((date) => ({
    date,
    value: dailyTotals.value.get(dateKey(date)) ?? 0,
  })),
);

const totalLabel = computed(() =>
  props.exercise.metricType === 'time' ? formatDuration(periodTotal.value) : `${periodTotal.value} reps`,
);
</script>

<template>
  <div class="mb-6">
    <div class="d-flex align-baseline justify-space-between mb-2">
      <div class="text-subtitle-1">{{ exercise.name }}</div>
      <div class="text-caption text-medium-emphasis">
        {{ periodEntries.length }} set{{ periodEntries.length === 1 ? '' : 's' }} · {{ totalLabel }}
      </div>
    </div>

    <BarsChart
      v-if="period === 'week' || period === 'month'"
      :days="periodDays"
      :max-value="allTimeMaxDailyTotal"
      :metric-type="exercise.metricType"
    />
    <HeatmapCalendar
      v-else
      :weeks="weeks"
      :daily-totals="dailyTotals"
      :max-value="allTimeMaxDailyTotal"
      :metric-type="exercise.metricType"
    />
  </div>
</template>
