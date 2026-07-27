<script setup lang="ts">
import { ref, computed } from 'vue';
import type { LogEntry } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import { createLogEntry, updateLogEntry, deleteLogEntry } from '../api/logEntries';
import { formatDuration, formatTimestamp } from '../lib/format';
import EditLogEntrySheet from './EditLogEntrySheet.vue';

const props = defineProps<{
  entries: LogEntry[];
  emptyText?: string;
}>();

const emit = defineEmits<{
  update: [entry: LogEntry];
  remove: [id: number];
  restore: [entry: LogEntry];
}>();

const store = useExercisesStore();

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

const pendingDeleteIds = ref(new Set<number>());
const undoSnackbar = ref(false);
const undoSnackbarText = ref('');
const lastDeletedEntry = ref<LogEntry>();

const visibleEntries = computed(() =>
  props.entries.filter((entry) => !pendingDeleteIds.value.has(entry.id)),
);

async function quickDelete(entry: LogEntry) {
  pendingDeleteIds.value.add(entry.id);
  lastDeletedEntry.value = entry;
  undoSnackbarText.value = `Deleted ${valueLabel(entry)} set for ${exerciseFor(entry)?.name ?? 'exercise'}`;
  undoSnackbar.value = true;

  await deleteLogEntry(entry.id);
  emit('remove', entry.id);
}

async function undoQuickDelete() {
  const entry = lastDeletedEntry.value;
  if (!entry) return;
  undoSnackbar.value = false;

  const restored = await createLogEntry({
    variationId: entry.variationId,
    timestamp: entry.timestamp,
    value: entry.value,
    notes: entry.notes ?? undefined,
  });
  emit('restore', restored);
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
  emit('update', updated);
  sheetOpen.value = false;
}

async function removeEntry() {
  if (!selectedEntry.value) return;
  await deleteLogEntry(selectedEntry.value.id);
  emit('remove', selectedEntry.value.id);
  sheetOpen.value = false;
}
</script>

<template>
  <v-alert v-if="visibleEntries.length === 0" type="info" variant="tonal">
    {{ props.emptyText ?? 'No log entries yet.' }}
  </v-alert>

  <v-list v-else lines="two">
    <v-list-item
      v-for="entry in visibleEntries"
      :key="entry.id"
      :title="exerciseFor(entry)?.name ?? 'Unknown exercise'"
      @click="openEntry(entry)"
    >
      <template #subtitle> {{ variationFor(entry)?.name }} · {{ valueLabel(entry) }} </template>
      <template #append>
        <span class="text-caption text-medium-emphasis mr-1">{{
          formatTimestamp(new Date(entry.timestamp))
        }}</span>
        <v-btn
          icon="mdi-delete-outline"
          size="small"
          variant="text"
          @click.stop="quickDelete(entry)"
        />
      </template>
    </v-list-item>
  </v-list>

  <v-snackbar v-model="undoSnackbar" timeout="4000">
    {{ undoSnackbarText }}
    <template #actions>
      <v-btn color="primary" variant="text" @click="undoQuickDelete">Undo</v-btn>
    </template>
  </v-snackbar>

  <EditLogEntrySheet
    v-model="sheetOpen"
    :entry="selectedEntry"
    :exercise-name="selectedExerciseName"
    :variation-name="selectedVariationName"
    :metric-type="selectedMetricType"
    @save="saveEntry"
    @delete="removeEntry"
  />
</template>
