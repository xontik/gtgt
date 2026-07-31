<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MetricType } from '@gtg/shared';

export interface RoutineStep {
  routineItemId: number;
  variationId: number;
  exerciseName: string;
  variationName: string;
  metricType: MetricType;
  initialValue: number;
  plannedSets: number;
  plannedValue: number | null;
}

export interface RoutineStepResult {
  routineItemId: number;
  variationId: number;
  performedSets: number;
  lastValue: number | null;
  plannedSets: number;
  plannedValue: number | null;
}

const props = defineProps<{
  modelValue: boolean;
  routineName: string;
  steps: RoutineStep[];
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  logStep: [variationId: number, value: number];
  finished: [results: RoutineStepResult[]];
}>();

const stepIndex = ref(0);
const setNumber = ref(1);
const value = ref(0);
const minutes = ref(0);
const seconds = ref(0);

interface StepProgress {
  performedSets: number;
  lastValue: number | null;
}

const progress = ref<StepProgress[]>([]);

const currentStep = computed(() => props.steps[stepIndex.value]);
const isLastStep = computed(() => stepIndex.value === props.steps.length - 1);
const plannedSets = computed(() => currentStep.value?.plannedSets ?? 1);
const isFinalPlannedSet = computed(() => setNumber.value >= plannedSets.value);

function resetInputsForStep() {
  const step = currentStep.value;
  if (!step) return;
  setNumber.value = 1;
  if (step.metricType === 'time') {
    minutes.value = Math.floor(step.initialValue / 60);
    seconds.value = step.initialValue % 60;
  } else {
    value.value = step.initialValue;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      stepIndex.value = 0;
      progress.value = props.steps.map(() => ({ performedSets: 0, lastValue: null }));
      resetInputsForStep();
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

function currentValue() {
  const step = currentStep.value;
  if (!step) return 0;
  return step.metricType === 'time' ? minutes.value * 60 + seconds.value : value.value;
}

function recordProgress(loggedValue: number) {
  const entry = progress.value[stepIndex.value];
  if (!entry) return;
  entry.performedSets += 1;
  entry.lastValue = loggedValue;
}

function buildResults(): RoutineStepResult[] {
  return props.steps
    .map((step, i) => {
      const entry = progress.value[i];
      return {
        routineItemId: step.routineItemId,
        variationId: step.variationId,
        performedSets: entry?.performedSets ?? 0,
        lastValue: entry?.lastValue ?? null,
        plannedSets: step.plannedSets,
        plannedValue: step.plannedValue,
      };
    })
    .filter((r) => r.performedSets > 0);
}

function advanceToNextStepOrFinish() {
  if (isLastStep.value) {
    emit('finished', buildResults());
    close();
  } else {
    stepIndex.value += 1;
    resetInputsForStep();
  }
}

// Logs the current set. Stays on this exercise while more planned sets
// remain, otherwise moves on (or finishes on the last step).
function logSet() {
  const loggedValue = currentValue();
  if (loggedValue <= 0) return;

  emit('logStep', currentStep.value!.variationId, loggedValue);
  recordProgress(loggedValue);

  if (isFinalPlannedSet.value) {
    advanceToNextStepOrFinish();
  } else {
    setNumber.value += 1;
  }
}

// Logs a set but stays on this exercise regardless of the planned count -
// for doing an extra/bonus set beyond what the routine template says.
function logAndStay() {
  const loggedValue = currentValue();
  if (loggedValue <= 0) return;

  emit('logStep', currentStep.value!.variationId, loggedValue);
  recordProgress(loggedValue);
  setNumber.value += 1;
}

function skipStep() {
  advanceToNextStepOrFinish();
}

const hasLoggedThisStep = computed(() => (progress.value[stepIndex.value]?.performedSets ?? 0) > 0);
</script>

<template>
  <v-bottom-sheet :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-sheet v-if="currentStep" class="pa-4" rounded="t-lg">
      <div class="text-caption text-medium-emphasis mb-1">
        {{ routineName }} — exercise {{ stepIndex + 1 }} of {{ steps.length }} · set {{ setNumber }} of
        {{ plannedSets }}
      </div>
      <div class="text-h6">{{ currentStep.exerciseName }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ currentStep.variationName }}</div>

      <template v-if="currentStep.metricType === 'reps'">
        <div class="d-flex align-center justify-center ga-4 my-6">
          <v-btn icon="mdi-minus" size="large" :disabled="!value || value <= 0" aria-label="Decrease reps" @click="value--" />
          <v-text-field
            v-model.number="value"
            type="number"
            inputmode="numeric"
            variant="plain"
            density="compact"
            hide-details
            class="rep-stepper-input text-h3 text-center"
            style="max-width: 5rem"
            aria-label="Reps"
          />
          <v-btn icon="mdi-plus" size="large" aria-label="Increase reps" @click="value++" />
        </div>
      </template>
      <template v-else>
        <div class="d-flex align-center justify-center ga-2 my-4">
          <v-text-field v-model.number="minutes" type="number" label="Minutes" min="0" style="max-width: 120px" />
          <div class="text-h5">:</div>
          <v-text-field
            v-model.number="seconds"
            type="number"
            label="Seconds"
            min="0"
            max="59"
            style="max-width: 120px"
          />
        </div>
      </template>

      <v-btn block color="primary" size="large" class="mb-2" :disabled="!currentValue()" @click="logSet">
        <template v-if="!isFinalPlannedSet">Log set ({{ setNumber }}/{{ plannedSets }})</template>
        <template v-else-if="isLastStep">Log & finish</template>
        <template v-else>Log & next exercise</template>
      </v-btn>

      <v-btn block variant="tonal" class="mb-2" :disabled="!currentValue()" @click="logAndStay">
        Log & do another set here
      </v-btn>

      <v-btn block variant="text" @click="skipStep">
        {{ hasLoggedThisStep ? 'Next exercise' : 'Skip' }}
      </v-btn>
    </v-sheet>
  </v-bottom-sheet>
</template>

<style scoped>
.rep-stepper-input :deep(input) {
  text-align: center;
  -moz-appearance: textfield;
}
.rep-stepper-input :deep(input::-webkit-outer-spin-button),
.rep-stepper-input :deep(input::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}
</style>
