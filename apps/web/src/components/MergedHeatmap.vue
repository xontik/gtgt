<script setup lang="ts">
import { computed } from 'vue';
import type { Exercise } from '@gtg/shared';
import { dateKey, heatBucket } from '../lib/heatmap';
import { formatDuration } from '../lib/format';

export interface HeatmapSeries {
  exercise: Exercise;
  dailyTotals: Map<string, number>;
}

const props = defineProps<{
  series: HeatmapSeries[];
  weeks: (Date | null)[][];
}>();

const maxValue = computed(() => {
  let max = 0;
  for (const week of props.weeks) {
    for (const day of week) {
      if (!day) continue;
      const key = dateKey(day);
      const total = props.series.reduce((sum, s) => sum + (s.dailyTotals.get(key) ?? 0), 0);
      if (total > max) max = total;
    }
  }
  return max;
});

function totalFor(day: Date) {
  const key = dateKey(day);
  return props.series.reduce((sum, s) => sum + (s.dailyTotals.get(key) ?? 0), 0);
}

function bucketFor(day: Date) {
  return heatBucket(totalFor(day), maxValue.value);
}

function tooltipFor(day: Date) {
  const key = dateKey(day);
  const dateLabel = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const parts = props.series
    .map((s) => ({ exercise: s.exercise, value: s.dailyTotals.get(key) ?? 0 }))
    .filter((p) => p.value > 0)
    .map((p) =>
      p.exercise.metricType === 'time'
        ? `${p.exercise.name}: ${formatDuration(p.value)}`
        : `${p.exercise.name}: ${p.value} reps`,
    );
  if (parts.length === 0) return `${dateLabel}: no sets`;
  return `${dateLabel} — ${parts.join(', ')}`;
}
</script>

<template>
  <div class="d-flex ga-1">
    <div v-for="(week, wi) in weeks" :key="wi" class="d-flex flex-column ga-1 flex-grow-1" style="min-width: 0">
      <template v-for="(day, di) in week" :key="di">
        <div v-if="day === null" class="heat-cell heat-empty" />
        <v-tooltip v-else :text="tooltipFor(day)" location="top">
          <template #activator="{ props: tooltipProps }">
            <div v-bind="tooltipProps" class="heat-cell" :class="`heat-${bucketFor(day)}`" />
          </template>
        </v-tooltip>
      </template>
    </div>
  </div>
</template>

<style scoped>
.heat-cell {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 2px;
  background-color: rgb(var(--v-theme-primary));
}

.heat-empty {
  background-color: transparent;
}

.heat-0 {
  opacity: 0.12;
}

.heat-1 {
  opacity: 0.35;
}

.heat-2 {
  opacity: 0.55;
}

.heat-3 {
  opacity: 0.75;
}

.heat-4 {
  opacity: 1;
}
</style>
