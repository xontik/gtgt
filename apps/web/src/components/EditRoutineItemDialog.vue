<script setup lang="ts">
import { ref, watch } from 'vue';
import type { RoutineItem } from '@gtg/shared';

const props = defineProps<{
  modelValue: boolean;
  item: RoutineItem | undefined;
  exerciseName: string;
  variationName: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  save: [details: { targetValue: number | null; setsCount: number }];
}>();

const targetValue = ref<number | null>(null);
const setsCount = ref(1);

watch(
  () => props.item,
  (item) => {
    if (item) {
      targetValue.value = item.targetValue;
      setsCount.value = item.setsCount;
    }
  },
);

function save() {
  emit('save', { targetValue: targetValue.value, setsCount: Math.max(1, setsCount.value || 1) });
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-card>
      <v-card-title>Edit routine exercise</v-card-title>
      <v-card-text>
        <div class="text-subtitle-2">{{ exerciseName }}</div>
        <div class="text-body-2 text-medium-emphasis mb-4">{{ variationName }}</div>

        <div class="d-flex ga-2">
          <v-text-field v-model.number="setsCount" type="number" label="Sets" min="1" style="max-width: 120px" />
          <v-text-field
            v-model.number="targetValue"
            type="number"
            label="Target reps/seconds per set (optional)"
            min="0"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
