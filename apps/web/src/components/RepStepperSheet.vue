<script setup lang="ts">
import { ref, watch } from 'vue';
import VariationInfoPanel from './VariationInfoPanel.vue';

const props = defineProps<{
  modelValue: boolean;
  exerciseName: string;
  variationName: string;
  imageUrl?: string | null;
  notes?: string | null;
  videoUrl?: string | null;
  initialValue?: number;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  confirm: [reps: number, forYesterday: boolean];
}>();

const reps = ref(5);
const forYesterday = ref(false);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      reps.value = props.initialValue ?? 5;
      forYesterday.value = false;
    }
  },
);

function confirm() {
  emit('confirm', reps.value, forYesterday.value);
}
</script>

<template>
  <v-bottom-sheet
    :model-value="modelValue"
    @update:model-value="(v) => emit('update:modelValue', v)"
  >
    <v-sheet class="pa-4" rounded="t-lg">
      <div class="text-h6">{{ exerciseName }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ variationName }}</div>

      <VariationInfoPanel :image-url="imageUrl" :notes="notes" :video-url="videoUrl" />

      <div class="d-flex align-center justify-center ga-4 my-6">
        <v-btn icon="mdi-minus" size="large" :disabled="!reps || reps <= 0" aria-label="Decrease reps" @click="reps--" />
        <v-text-field
          v-model.number="reps"
          type="number"
          inputmode="numeric"
          variant="plain"
          density="compact"
          hide-details
          class="rep-stepper-input text-h3 text-center"
          style="max-width: 5rem"
          aria-label="Reps"
        />
        <v-btn icon="mdi-plus" size="large" aria-label="Increase reps" @click="reps++" />
      </div>

      <v-chip
        class="mb-3"
        :color="forYesterday ? 'primary' : undefined"
        :variant="forYesterday ? 'flat' : 'tonal'"
        prepend-icon="mdi-clock-outline"
        @click="forYesterday = !forYesterday"
      >
        {{ forYesterday ? 'Logging for yesterday' : 'Log for yesterday' }}
      </v-chip>

      <v-btn block color="primary" size="large" :disabled="!reps || reps <= 0" @click="confirm">
        Log {{ reps || 0 }} reps
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
