<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  exerciseCategorySchema,
  metricTypeSchema,
  type Exercise,
  type ExerciseCategory,
  type MetricType,
} from '@gtg/shared';

const props = defineProps<{
  modelValue: boolean;
  exercise: Exercise | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  save: [name: string, category: ExerciseCategory, metricType: MetricType];
  delete: [];
}>();

const categories = exerciseCategorySchema.options;
const metricTypes = metricTypeSchema.options;

const name = ref('');
const category = ref<ExerciseCategory>('push');
const metricType = ref<MetricType>('reps');
const confirmingDelete = ref(false);

watch(
  () => props.exercise,
  (exercise) => {
    if (exercise) {
      name.value = exercise.name;
      category.value = exercise.category;
      metricType.value = exercise.metricType;
    }
    confirmingDelete.value = false;
  },
);

function close() {
  emit('update:modelValue', false);
}

function save() {
  if (!name.value.trim()) return;
  emit('save', name.value.trim(), category.value, metricType.value);
}
</script>

<template>
  <v-bottom-sheet :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-sheet class="pa-4" rounded="t-lg">
      <div class="text-h6 mb-4">Edit exercise</div>

      <v-text-field v-model="name" label="Name" class="mb-2" />
      <v-select v-model="category" label="Category" :items="categories" class="mb-2" />
      <v-select v-model="metricType" label="Metric type" :items="metricTypes" class="mb-4" />

      <v-btn block color="primary" size="large" class="mb-2" :disabled="!name.trim()" @click="save">
        Save
      </v-btn>

      <v-btn
        v-if="!confirmingDelete"
        block
        color="error"
        variant="tonal"
        size="large"
        @click="confirmingDelete = true"
      >
        Delete
      </v-btn>
      <template v-else>
        <div class="text-body-2 text-medium-emphasis mb-2">
          This permanently deletes every variation on this exercise's ladder and all their logged
          sets. Unlike deleting a single variation, this can't be undone.
        </div>
        <div class="d-flex ga-2">
          <v-btn class="flex-1-1" variant="tonal" @click="confirmingDelete = false">Cancel</v-btn>
          <v-btn class="flex-1-1" color="error" @click="emit('delete')">Confirm delete</v-btn>
        </div>
      </template>

      <v-btn block variant="text" class="mt-2" @click="close">Close</v-btn>
    </v-sheet>
  </v-bottom-sheet>
</template>
