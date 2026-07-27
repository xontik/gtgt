<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Exercise, LogEntry } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import { listLogEntries } from '../api/logEntries';
import { formatDuration } from '../lib/format';
import LogEntryList from '../components/LogEntryList.vue';
import ProgressionLadder from '../components/ProgressionLadder.vue';
import EditVariationSheet from '../components/EditVariationSheet.vue';
import AddVariationDialog from '../components/AddVariationDialog.vue';
import EditExerciseSheet from '../components/EditExerciseSheet.vue';

const route = useRoute();
const router = useRouter();
const exerciseId = Number(route.params.id);

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

const exercise = computed(() => store.exercises.find((e) => e.id === exerciseId));
const variations = computed(() => store.variationsFor(exerciseId));
const activeVariations = computed(() => store.activeVariationsFor(exerciseId));
const variationIds = computed(() => new Set(variations.value.map((v) => v.id)));

const exerciseEntries = computed(() =>
  entries.value.filter((e) => variationIds.value.has(e.variationId)),
);

const recentEntries = computed(() => exerciseEntries.value.slice(0, 10));

const todayTotal = computed(() => {
  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
  const todays = exerciseEntries.value.filter((e) => isToday(new Date(e.timestamp)));
  return {
    setCount: todays.length,
    total: todays.reduce((sum, e) => sum + e.value, 0),
  };
});

async function reorderVariation(variationId: number, direction: 'up' | 'down') {
  await store.moveVariation(variationId, direction);
}

async function toggleFavorite(variationId: number, isFavorite: boolean) {
  await store.setFavorite(variationId, isFavorite);
}

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

const editSheetOpen = ref(false);
const editingVariation = computed(() => variations.value.find((v) => v.id === editingVariationId.value));
const editingVariationId = ref<number>();

function descendantIds(variationId: number): Set<number> {
  const ids = new Set<number>();
  const stack = [variationId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const v of activeVariations.value) {
      if (v.parentVariationId === current && !ids.has(v.id)) {
        ids.add(v.id);
        stack.push(v.id);
      }
    }
  }
  return ids;
}

const editingParentOptions = computed(() => {
  if (!editingVariationId.value) return [];
  const excluded = descendantIds(editingVariationId.value);
  excluded.add(editingVariationId.value);
  return activeVariations.value
    .filter((v) => !excluded.has(v.id))
    .map((v) => ({ id: v.id, name: v.name }));
});

function openEdit(variationId: number) {
  editingVariationId.value = variationId;
  editSheetOpen.value = true;
}

async function saveVariationName(name: string, parentVariationId: number | null) {
  if (!editingVariationId.value) return;
  await store.updateVariationDetails(editingVariationId.value, name, parentVariationId);
  editSheetOpen.value = false;
}

async function removeVariation() {
  if (!editingVariationId.value) return;
  await store.removeVariation(editingVariationId.value);
  editSheetOpen.value = false;
}

const addDialogOpen = ref(false);
const branchFromId = ref<number>();
const branchFromName = computed(
  () => variations.value.find((v) => v.id === branchFromId.value)?.name,
);

function openAddDialog(parentVariationId?: number) {
  branchFromId.value = parentVariationId;
  addDialogOpen.value = true;
}

async function addVariation(name: string) {
  await store.addVariation(exerciseId, name, branchFromId.value ?? null);
  addDialogOpen.value = false;
}

const editExerciseSheetOpen = ref(false);

async function saveExerciseDetails(
  name: string,
  category: Exercise['category'],
  metricType: Exercise['metricType'],
) {
  await store.updateExerciseDetails(exerciseId, { name, category, metricType });
  editExerciseSheetOpen.value = false;
}

async function removeExercise() {
  await store.removeExercise(exerciseId);
  editExerciseSheetOpen.value = false;
  router.push('/');
}
</script>

<template>
  <v-container v-if="exercise">
    <div class="d-flex align-center justify-space-between mb-1">
      <h1 class="text-h5">{{ exercise.name }}</h1>
      <v-btn icon="mdi-pencil" variant="text" size="small" @click="editExerciseSheetOpen = true" />
    </div>
    <div class="text-body-2 text-medium-emphasis mb-4">
      Today: {{ todayTotal.setCount }} set{{ todayTotal.setCount === 1 ? '' : 's' }} ·
      {{ exercise.metricType === 'time' ? formatDuration(todayTotal.total) : `${todayTotal.total} reps` }}
    </div>

    <div class="d-flex align-center justify-space-between mb-2">
      <div class="text-subtitle-2">Progression</div>
      <v-btn size="small" variant="text" prepend-icon="mdi-plus" @click="openAddDialog()">
        Add variation
      </v-btn>
    </div>
    <ProgressionLadder
      class="mb-6"
      :variations="activeVariations"
      @reorder="reorderVariation"
      @edit="openEdit"
      @branch="openAddDialog"
      @favorite="toggleFavorite"
    />

    <div class="text-subtitle-2 mb-2">Recent entries</div>
    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <LogEntryList
      v-else
      :entries="recentEntries"
      @update="onUpdate"
      @remove="onRemove"
      @restore="onRestore"
    />

    <EditVariationSheet
      v-model="editSheetOpen"
      :variation="editingVariation"
      :parent-options="editingParentOptions"
      @save="saveVariationName"
      @delete="removeVariation"
    />
    <AddVariationDialog v-model="addDialogOpen" :parent-name="branchFromName" @save="addVariation" />
    <EditExerciseSheet
      v-model="editExerciseSheetOpen"
      :exercise="exercise"
      @save="saveExerciseDetails"
      @delete="removeExercise"
    />
  </v-container>
</template>
