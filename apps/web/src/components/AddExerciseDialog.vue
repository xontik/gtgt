<script setup lang="ts">
import { ref, watch } from 'vue';
import { exerciseCategorySchema, metricTypeSchema, type ExerciseInsert } from '@gtg/shared';

const props = defineProps<{ modelValue: boolean }>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  save: [exercise: ExerciseInsert];
}>();

const categories = exerciseCategorySchema.options;
const metricTypes = metricTypeSchema.options;

const name = ref('');
const category = ref<(typeof categories)[number]>('push');
const metricType = ref<(typeof metricTypes)[number]>('reps');

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      name.value = '';
      category.value = 'push';
      metricType.value = 'reps';
    }
  },
);

function save() {
  if (!name.value.trim()) return;
  emit('save', {
    name: name.value.trim(),
    category: category.value,
    metricType: metricType.value,
  });
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-card>
      <v-card-title>Add exercise</v-card-title>
      <v-card-text>
        <v-text-field v-model="name" label="Name" autofocus class="mb-2" />
        <v-select v-model="category" label="Category" :items="categories" class="mb-2" />
        <v-select v-model="metricType" label="Metric type" :items="metricTypes" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" :disabled="!name.trim()" @click="save">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
