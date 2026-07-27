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
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  confirm: [reps: number];
}>();

const reps = ref(5);

watch(
  () => props.modelValue,
  (open) => {
    if (open) reps.value = 5;
  },
);

function confirm() {
  emit('confirm', reps.value);
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
        <v-btn icon="mdi-minus" size="large" :disabled="reps <= 0" @click="reps--" />
        <div class="text-h3" style="min-width: 4rem; text-align: center">{{ reps }}</div>
        <v-btn icon="mdi-plus" size="large" @click="reps++" />
      </div>

      <v-btn block color="primary" size="large" :disabled="reps <= 0" @click="confirm">
        Log {{ reps }} reps
      </v-btn>
    </v-sheet>
  </v-bottom-sheet>
</template>
