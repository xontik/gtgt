<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { LogEntry } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import { listLogEntries } from '../api/logEntries';
import LogEntryList from '../components/LogEntryList.vue';

const store = useExercisesStore();
const entries = ref<LogEntry[]>([]);
const loading = ref(false);
const search = ref('');

const filteredEntries = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return entries.value;
  return entries.value.filter((entry) => {
    const variation = store.variations.find((v) => v.id === entry.variationId);
    const exercise = variation && store.exercises.find((e) => e.id === variation.exerciseId);
    return (
      exercise?.name.toLowerCase().includes(q) || variation?.name.toLowerCase().includes(q)
    );
  });
});

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

function onUpdate(updated: LogEntry) {
  const index = entries.value.findIndex((e) => e.id === updated.id);
  if (index !== -1) entries.value[index] = updated;
}

function onRemove(id: number) {
  entries.value = entries.value.filter((e) => e.id !== id);
}

function onRestore(entry: LogEntry) {
  entries.value = [...entries.value, entry].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
</script>

<template>
  <v-container>
    <h1 class="text-h5 mb-4">Log</h1>

    <v-text-field
      v-model="search"
      label="Search exercise or variation"
      prepend-inner-icon="mdi-magnify"
      clearable
      density="compact"
      class="mb-4"
      hide-details
    />

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />

    <LogEntryList
      v-else
      :entries="filteredEntries"
      @update="onUpdate"
      @remove="onRemove"
      @restore="onRestore"
    />
  </v-container>
</template>
