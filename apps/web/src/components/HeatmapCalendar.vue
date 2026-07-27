<script setup lang="ts">
import type { MetricType } from '@gtg/shared';
import { dateKey, heatBucket } from '../lib/heatmap';
import { formatDuration } from '../lib/format';

const props = defineProps<{
  weeks: (Date | null)[][];
  dailyTotals: Map<string, number>;
  maxValue: number;
  metricType: MetricType;
}>();

function valueFor(day: Date) {
  return props.dailyTotals.get(dateKey(day)) ?? 0;
}

function bucketFor(day: Date) {
  return heatBucket(valueFor(day), props.maxValue);
}

function tooltipFor(day: Date) {
  const value = valueFor(day);
  const dateLabel = day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  if (value <= 0) return `${dateLabel}: no sets`;
  const valueLabel = props.metricType === 'time' ? formatDuration(value) : `${value} reps`;
  return `${dateLabel}: ${valueLabel}`;
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
