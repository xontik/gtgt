<script setup lang="ts">
import { computed } from 'vue';
import type { MetricType } from '@gtg/shared';
import { formatDuration } from '../lib/format';

const props = defineProps<{
  days: { date: Date; value: number }[];
  maxValue: number;
  metricType: MetricType;
}>();

const compact = computed(() => props.days.length > 10);

function heightPercent(value: number) {
  if (props.maxValue <= 0) return 0;
  return Math.max(4, Math.round((value / props.maxValue) * 100));
}

function valueLabel(value: number) {
  if (value <= 0) return 'No sets';
  return props.metricType === 'time' ? formatDuration(value) : `${value} reps`;
}

function dayLabel(date: Date) {
  if (props.days.length <= 7) return date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
  return `${date.getDate()}`;
}

function showDayLabel(index: number) {
  if (!compact.value) return true;
  return index % 5 === 0;
}

function tooltipText(day: { date: Date; value: number }) {
  const dateLabel = day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${dateLabel}: ${valueLabel(day.value)}`;
}
</script>

<template>
  <div class="d-flex align-end ga-1" style="height: 96px">
    <div v-for="(day, i) in days" :key="i" class="d-flex flex-column align-center flex-grow-1" style="min-width: 0">
      <v-tooltip :text="tooltipText(day)" location="top">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" class="bar-track">
            <div class="bar" :style="{ height: `${heightPercent(day.value)}%` }" />
          </div>
        </template>
      </v-tooltip>
      <div
        class="text-caption text-medium-emphasis mt-1 day-label"
        :style="{ visibility: showDayLabel(i) ? 'visible' : 'hidden' }"
      >
        {{ dayLabel(day.date) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.bar-track {
  width: 100%;
  max-width: 32px;
  height: 56px;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  min-height: 2px;
  border-radius: 4px;
  background-color: rgb(var(--v-theme-primary));
}

.day-label {
  min-height: 16px;
}
</style>
