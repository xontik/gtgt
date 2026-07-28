<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MetricType } from '@gtg/shared';

export interface RoutineStep {
  variationId: number;
  exerciseName: string;
  variationName: string;
  metricType: MetricType;
  initialValue: number;
}

const props = defineProps<{
  modelValue: boolean;
  routineName: string;
  steps: RoutineStep[];
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  logStep: [variationId: number, value: number];
  finished: [];
}>();

const stepIndex = ref(0);
const value = ref(0);
const minutes = ref(0);
const seconds = ref(0);

const currentStep = computed(() => props.steps[stepIndex.value]);
const isLastStep = computed(() => stepIndex.value === props.steps.length - 1);

function resetInputsForStep() {
  const step = currentStep.value;
  if (!step) return;
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
      resetInputsForStep();
    }
  },
);

function close() {
  emit('update:modelValue', false);
}

function confirmStep() {
  const step = currentStep.value;
  if (!step) return;
  const loggedValue = step.metricType === 'time' ? minutes.value * 60 + seconds.value : value.value;
  if (loggedValue <= 0) return;

  emit('logStep', step.variationId, loggedValue);

  if (isLastStep.value) {
    emit('finished');
    close();
  } else {
    stepIndex.value += 1;
    resetInputsForStep();
  }
}

function skipStep() {
  if (isLastStep.value) {
    emit('finished');
    close();
  } else {
    stepIndex.value += 1;
    resetInputsForStep();
  }
}
</script>

<template>
  <v-bottom-sheet :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-sheet v-if="currentStep" class="pa-4" rounded="t-lg">
      <div class="text-caption text-medium-emphasis mb-1">
        {{ routineName }} — step {{ stepIndex + 1 }} of {{ steps.length }}
      </div>
      <div class="text-h6">{{ currentStep.exerciseName }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ currentStep.variationName }}</div>

      <template v-if="currentStep.metricType === 'reps'">
        <div class="d-flex align-center justify-center ga-4 my-6">
          <v-btn icon="mdi-minus" size="large" :disabled="value <= 0" @click="value--" />
          <div class="text-h3" style="min-width: 4rem; text-align: center">{{ value }}</div>
          <v-btn icon="mdi-plus" size="large" @click="value++" />
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

      <v-btn block color="primary" size="large" class="mb-2" @click="confirmStep">
        {{ isLastStep ? 'Log & finish' : 'Log & next' }}
      </v-btn>
      <v-btn block variant="text" @click="skipStep">{{ isLastStep ? 'Skip & finish' : 'Skip' }}</v-btn>
    </v-sheet>
  </v-bottom-sheet>
</template>
