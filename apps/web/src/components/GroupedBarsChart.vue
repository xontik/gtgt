<script setup lang="ts">
import { computed } from 'vue';
import type { Exercise } from '@gtg/shared';
import { dateKey } from '../lib/heatmap';
import { formatDuration } from '../lib/format';

export interface GroupSeries {
  exercise: Exercise;
  color: string;
  dailyTotals: Map<string, number>;
  maxValue: number; // all-time max daily total for this exercise
}

const props = defineProps<{
  series: GroupSeries[];
  days: Date[];
}>();

const compact = computed(() => props.days.length > 10);

function heightPercent(value: number, maxValue: number) {
  if (maxValue <= 0) return 0;
  return Math.max(4, Math.round((value / maxValue) * 100));
}

function valueLabel(exercise: Exercise, value: number) {
  if (value <= 0) return 'No sets';
  return exercise.metricType === 'time' ? formatDuration(value) : `${value} reps`;
}

function dayLabel(date: Date) {
  if (props.days.length <= 7) return date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2);
  return `${date.getDate()}`;
}

function showDayLabel(index: number) {
  if (!compact.value) return true;
  return index % 5 === 0;
}

function tooltipText(exercise: Exercise, date: Date, value: number) {
  const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${exercise.name}, ${dateLabel}: ${valueLabel(exercise, value)}`;
}
</script>

<template>
  <div class="d-flex flex-wrap ga-3 mb-3">
    <div v-for="s in series" :key="s.exercise.id" class="d-flex align-center ga-1">
      <div class="legend-dot" :style="{ backgroundColor: s.color }" />
      <span class="text-caption text-medium-emphasis">{{ s.exercise.name }}</span>
    </div>
  </div>

  <div class="d-flex align-end ga-1" style="height: 96px">
    <div v-for="(day, i) in days" :key="i" class="d-flex flex-column align-center flex-grow-1" style="min-width: 0">
      <div class="day-group ga-px" style="height: 56px">
        <v-tooltip
          v-for="s in series"
          :key="s.exercise.id"
          :text="tooltipText(s.exercise, day, s.dailyTotals.get(dateKey(day)) ?? 0)"
          location="top"
        >
          <template #activator="{ props: tooltipProps }">
            <div v-bind="tooltipProps" class="group-bar-track">
              <div
                class="group-bar"
                :style="{
                  height: `${heightPercent(s.dailyTotals.get(dateKey(day)) ?? 0, s.maxValue)}%`,
                  backgroundColor: s.color,
                }"
              />
            </div>
          </template>
        </v-tooltip>
      </div>
      <div
        class="text-caption text-medium-emphasis mt-1 day-label"
        :style="{ visibility: showDayLabel(i) ? 'visible' : 'hidden' }"
      >
        {{ dayLabel(day) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.day-group {
  width: 100%;
  max-width: 32px;
  display: flex;
  align-items: flex-end;
}

.ga-px {
  gap: 1px;
}

.group-bar-track {
  flex: 1 1 0;
  min-width: 0;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.group-bar {
  width: 100%;
  min-height: 2px;
  border-radius: 2px;
}

.day-label {
  min-height: 16px;
}
</style>
