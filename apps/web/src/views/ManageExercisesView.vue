<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Exercise } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import AddExerciseDialog from '../components/AddExerciseDialog.vue';
import EditExerciseSheet from '../components/EditExerciseSheet.vue';

const store = useExercisesStore();

onMounted(() => store.fetchAll());

const addDialogOpen = ref(false);

async function addExercise(exercise: Parameters<typeof store.addExercise>[0]) {
  await store.addExercise(exercise);
  addDialogOpen.value = false;
}

const editSheetOpen = ref(false);
const editingExerciseId = ref<number>();
const editingExercise = computed(() => store.exercises.find((e) => e.id === editingExerciseId.value));

function openEdit(exercise: Exercise) {
  editingExerciseId.value = exercise.id;
  editSheetOpen.value = true;
}

async function saveExercise(name: string, category: Exercise['category'], metricType: Exercise['metricType']) {
  if (!editingExerciseId.value) return;
  await store.updateExerciseDetails(editingExerciseId.value, { name, category, metricType });
  editSheetOpen.value = false;
}

async function removeExercise() {
  if (!editingExerciseId.value) return;
  await store.removeExercise(editingExerciseId.value);
  editSheetOpen.value = false;
}
</script>

<template>
  <v-container>
    <div class="d-flex align-center justify-space-between mb-4">
      <h1 class="text-h5">Manage exercises</h1>
      <v-btn size="small" variant="tonal" prepend-icon="mdi-format-list-checks" to="/routines">
        Manage routines
      </v-btn>
    </div>

    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />

    <v-alert v-else-if="store.exercises.length === 0" type="info" variant="tonal" class="mb-4">
      No exercises yet. Add one below.
    </v-alert>

    <v-list v-else lines="two">
      <v-list-item
        v-for="exercise in store.exercises"
        :key="exercise.id"
        :title="exercise.name"
        :subtitle="`${exercise.category} · ${exercise.metricType}`"
        :to="`/exercises/${exercise.id}`"
      >
        <template #append>
          <v-btn
            icon="mdi-pencil"
            variant="text"
            size="small"
            :aria-label="`Edit ${exercise.name}`"
            @click.stop.prevent="openEdit(exercise)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-btn block variant="tonal" prepend-icon="mdi-plus" class="mt-4" @click="addDialogOpen = true">
      Add exercise
    </v-btn>

    <AddExerciseDialog v-model="addDialogOpen" @save="addExercise" />
    <EditExerciseSheet
      v-model="editSheetOpen"
      :exercise="editingExercise"
      @save="saveExercise"
      @delete="removeExercise"
    />
  </v-container>
</template>
