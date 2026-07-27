<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Exercise } from '@gtg/shared';
import { useExercisesStore } from '../stores/exercises';
import { createLogEntry } from '../api/logEntries';
import ExerciseCard from '../components/ExerciseCard.vue';
import RepStepperSheet from '../components/RepStepperSheet.vue';
import TimerSheet from '../components/TimerSheet.vue';
import AddExerciseDialog from '../components/AddExerciseDialog.vue';

const store = useExercisesStore();
onMounted(() => store.fetchAll());

const sheetOpen = ref(false);
const selectedExercise = ref<Exercise>();
const snackbar = ref(false);
const snackbarText = ref('');

const selectedVariationName = computed(
  () => store.activeVariationFor(selectedExercise.value!)?.name ?? '',
);

function openSheet(exercise: Exercise) {
  selectedExercise.value = exercise;
  sheetOpen.value = true;
}

async function logSet(value: number) {
  const exercise = selectedExercise.value;
  const variationId = exercise?.activeVariationId;
  if (!variationId) return;

  await createLogEntry({ variationId, value });
  sheetOpen.value = false;
  const unit = exercise.metricType === 'time' ? 's' : 'reps';
  snackbarText.value = `Logged ${value}${unit === 's' ? 's' : ' reps'} for ${exercise.name}`;
  snackbar.value = true;
}

const addDialogOpen = ref(false);

async function addExercise(exercise: Parameters<typeof store.addExercise>[0]) {
  await store.addExercise(exercise);
  addDialogOpen.value = false;
}
</script>

<template>
  <v-container>
    <v-progress-linear v-if="store.loading" indeterminate class="mb-4" />

    <v-row>
      <v-col v-for="exercise in store.exercises" :key="exercise.id" cols="12" sm="6" md="4">
        <ExerciseCard
          :exercise="exercise"
          :variation-name="store.activeVariationFor(exercise)?.name"
          @log="openSheet(exercise)"
        />
      </v-col>
    </v-row>

    <v-btn block variant="tonal" prepend-icon="mdi-plus" class="mt-2" @click="addDialogOpen = true">
      Add exercise
    </v-btn>

    <template v-if="selectedExercise">
      <RepStepperSheet
        v-if="selectedExercise.metricType === 'reps'"
        v-model="sheetOpen"
        :exercise-name="selectedExercise.name"
        :variation-name="selectedVariationName"
        @confirm="logSet"
      />
      <TimerSheet
        v-else
        v-model="sheetOpen"
        :exercise-name="selectedExercise.name"
        :variation-name="selectedVariationName"
        @confirm="logSet"
      />
    </template>

    <v-snackbar v-model="snackbar" timeout="2500">{{ snackbarText }}</v-snackbar>

    <AddExerciseDialog v-model="addDialogOpen" @save="addExercise" />
  </v-container>
</template>
