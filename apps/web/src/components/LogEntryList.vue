<script setup lang="ts">
import { ref, computed } from 'vue';
import type { LogEntry } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import { createLogEntry, updateLogEntry, deleteLogEntry } from '../api/logEntries';
import { formatDuration, formatTimestamp } from '../lib/format';
import { notify } from '../lib/snackbarQueue';
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

// Entries created offline get a negative client-side id until they sync
// (see api/logEntries.ts) - editing/deleting those before the real id
// exists isn't supported, so they're shown read-only with a chip instead.
function isPending(entry: LogEntry) {
  return entry.id < 0;
}

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

const visibleEntries = computed(() =>
  props.entries.filter((entry) => !pendingDeleteIds.value.has(entry.id)),
);

async function undoQuickDelete(entry: LogEntry) {
  const restored = await createLogEntry({
    variationId: entry.variationId,
    timestamp: entry.timestamp,
    value: entry.value,
    notes: entry.notes ?? undefined,
  });
  emit('restore', restored);
}

async function quickDelete(entry: LogEntry) {
  if (isPending(entry)) return;
  pendingDeleteIds.value.add(entry.id);

  notify(`Deleted ${valueLabel(entry)} set for ${exerciseFor(entry)?.name ?? 'exercise'}`, {
    timeout: 4000,
    actionLabel: 'Undo',
    onAction: () => undoQuickDelete(entry),
  });

  await deleteLogEntry(entry);
  emit('remove', entry.id);
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
  if (isPending(entry)) return;
  selectedEntry.value = entry;
  sheetOpen.value = true;
}

async function saveEntry(value: number, timestamp: Date) {
  if (!selectedEntry.value) return;
  const updated = await updateLogEntry(selectedEntry.value, { value, timestamp });
  emit('update', updated);
  sheetOpen.value = false;
}

async function removeEntry() {
  if (!selectedEntry.value) return;
  await deleteLogEntry(selectedEntry.value);
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
        <v-chip v-if="isPending(entry)" size="x-small" variant="tonal" color="warning" class="mr-1">
          <v-icon start size="12">mdi-cloud-sync-outline</v-icon>
          Syncing
        </v-chip>
        <span v-else class="text-caption text-medium-emphasis mr-1">{{
          formatTimestamp(new Date(entry.timestamp))
        }}</span>
        <v-btn
          v-if="!isPending(entry)"
          icon="mdi-delete-outline"
          size="small"
          variant="text"
          aria-label="Delete set"
          @click.stop="quickDelete(entry)"
        />
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
</template>
