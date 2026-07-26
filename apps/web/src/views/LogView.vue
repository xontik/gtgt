<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { LogEntry } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import { listLogEntries, updateLogEntry, deleteLogEntry } from '../api/logEntries';
import { formatDuration, formatTimestamp } from '../lib/format';
import EditLogEntrySheet from '../components/EditLogEntrySheet.vue';

const store = useExercisesStore();
const entries = ref<LogEntry[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    await store.fetchAll();
    entries.value = await listLogEntries();
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function variationFor(entry: LogEntry) {
  return store.variations.find((v) => v.id === entry.variationId);
}

function exerciseFor(entry: LogEntry) {
  const variation = variationFor(entry);
  return variation && store.exercises.find((e) => e.id === variation.exerciseId);
}

function valueLabel(entry: LogEntry) {
  const exercise = exerciseFor(entry);
  if (exercise?.metricType === 'time') return formatDuration(entry.value);
  return `${entry.value} reps`;
}

const sheetOpen = ref(false);
const selectedEntry = ref<LogEntry>();

const selectedExerciseName = computed(
  () => (selectedEntry.value && exerciseFor(selectedEntry.value)?.name) ?? '',
);
const selectedVariationName = computed(
  () => (selectedEntry.value && variationFor(selectedEntry.value)?.name) ?? '',
);
const selectedMetricType = computed(
  () => (selectedEntry.value && exerciseFor(selectedEntry.value)?.metricType) ?? 'reps',
);

function openEntry(entry: LogEntry) {
  selectedEntry.value = entry;
  sheetOpen.value = true;
}

async function saveEntry(value: number) {
  if (!selectedEntry.value) return;
  const updated = await updateLogEntry(selectedEntry.value.id, { value });
  const index = entries.value.findIndex((e) => e.id === updated.id);
  if (index !== -1) entries.value[index] = updated;
  sheetOpen.value = false;
}

async function removeEntry() {
  if (!selectedEntry.value) return;
  await deleteLogEntry(selectedEntry.value.id);
  entries.value = entries.value.filter((e) => e.id !== selectedEntry.value!.id);
  sheetOpen.value = false;
}
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-4">Log</h1>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <v-alert v-else-if="entries.length === 0" type="info" variant="tonal">
      No log entries yet.
    </v-alert>

    <v-list v-else lines="two">
      <v-list-item
        v-for="entry in entries"
        :key="entry.id"
        :title="exerciseFor(entry)?.name ?? 'Unknown exercise'"
        @click="openEntry(entry)"
      >
        <template #subtitle>
          {{ variationFor(entry)?.name }} · {{ valueLabel(entry) }}
        </template>
        <template #append>
          <span class="text-caption text-medium-emphasis">{{
            formatTimestamp(new Date(entry.timestamp))
          }}</span>
        </template>
      </v-list-item>
    </v-list>

    <EditLogEntrySheet
      v-model="sheetOpen"
      :entry="selectedEntry"
      :exercise-name="selectedExerciseName"
      :variation-name="selectedVariationName"
      :metric-type="selectedMetricType"
      @save="saveEntry"
      @delete="removeEntry"
    />
  </v-container>
</template>
