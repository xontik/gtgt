<script setup lang="ts">
import { computed } from 'vue';
import type { MetricType } from '@gtg/shared';
import { formatDuration } from '../lib/format';

export interface SegmentedBarItem {
  label: string;
  color: string;
  values: number[]; // one entry per set logged, in order
  maxValue: number; // all-time max daily total, for height calibration
  metricType: MetricType;
}

const props = defineProps<{ items: SegmentedBarItem[] }>();

function total(item: SegmentedBarItem) {
  return item.values.reduce((sum, v) => sum + v, 0);
}

function heightPercent(item: SegmentedBarItem) {
  if (item.maxValue <= 0) return 0;
  const t = total(item);
  if (t <= 0) return 0;
  return Math.max(4, Math.round((t / item.maxValue) * 100));
}

function formatValue(item: SegmentedBarItem, value: number) {
  return item.metricType === 'time' ? formatDuration(value) : `${value} reps`;
}

function tooltipText(item: SegmentedBarItem) {
  const t = total(item);
  if (t <= 0) return `${item.label}: no sets`;
  const setCount = item.values.length;
  const breakdown = item.values.map((v) => formatValue(item, v)).join(', ');
  return `${item.label}: ${setCount} set${setCount === 1 ? '' : 's'} — ${formatValue(item, t)} (${breakdown})`;
}

const hasAnyValue = computed(() => props.items.some((item) => item.values.length > 0));
</script>

<template>
  <v-alert v-if="!hasAnyValue" type="info" variant="tonal" density="compact">
    No sets logged this day.
  </v-alert>
  <div v-else class="d-flex align-end ga-2" style="height: 96px">
    <div
      v-for="(item, i) in items"
      :key="i"
      class="d-flex flex-column align-center"
      :class="items.length <= 6 ? 'flex-grow-1' : ''"
      style="min-width: 0"
    >
      <v-tooltip :text="tooltipText(item)" location="top">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" class="bar-track">
            <div class="bar-fill" :style="{ height: `${heightPercent(item)}%` }">
              <div
                v-for="(value, si) in item.values"
                :key="si"
                class="bar-segment"
                :style="{ flexGrow: value, backgroundColor: item.color }"
              />
            </div>
          </div>
        </template>
      </v-tooltip>
      <div class="text-caption text-medium-emphasis mt-1 text-center label">{{ item.label }}</div>
    </div>
  </div>
</template>

<style scoped>
.bar-track {
  width: 100%;
  max-width: 40px;
  height: 56px;
  display: flex;
  align-items: flex-end;
}

.bar-fill {
  width: 100%;
  display: flex;
  flex-direction: column-reverse;
  gap: 1px;
}

.bar-segment {
  width: 100%;
  min-height: 2px;
  border-radius: 2px;
}

.label {
  max-width: 48px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
