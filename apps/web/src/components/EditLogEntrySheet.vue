<script setup lang="ts">
import { ref, watch } from 'vue';
import type { LogEntry, MetricType } from '@gtg/shared';

const props = defineProps<{
  modelValue: boolean;
  entry: LogEntry | undefined;
  exerciseName: string;
  variationName: string;
  metricType: MetricType;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  save: [value: number, timestamp: Date];
  delete: [];
}>();

const value = ref(0);
const timestampLocal = ref('');
const confirmingDelete = ref(false);

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

watch(
  () => props.entry,
  (entry) => {
    if (entry) {
      value.value = entry.value;
      timestampLocal.value = toLocalInputValue(new Date(entry.timestamp));
    }
    confirmingDelete.value = false;
  },
);

function close() {
  emit('update:modelValue', false);
}

function save() {
  emit('save', value.value, new Date(timestampLocal.value));
}
</script>

<template>
  <v-bottom-sheet :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-sheet class="pa-4" rounded="t-lg">
      <div class="text-h6">{{ exerciseName }}</div>
      <div class="text-body-2 text-medium-emphasis mb-4">{{ variationName }}</div>

      <v-text-field
        v-model.number="value"
        type="number"
        :label="metricType === 'time' ? 'Seconds' : 'Reps'"
        min="0"
      />

      <v-text-field v-model="timestampLocal" type="datetime-local" label="Logged at" class="mb-2" />

      <v-btn block color="primary" size="large" class="mb-2" @click="save">Save</v-btn>

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
      <div v-else class="d-flex ga-2">
        <v-btn class="flex-1-1" variant="tonal" @click="confirmingDelete = false">Cancel</v-btn>
        <v-btn class="flex-1-1" color="error" @click="emit('delete')">Confirm delete</v-btn>
      </div>

      <v-btn block variant="text" class="mt-2" @click="close">Close</v-btn>
    </v-sheet>
  </v-bottom-sheet>
</template>
