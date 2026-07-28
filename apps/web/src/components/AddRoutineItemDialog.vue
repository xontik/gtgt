<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Exercise, ExerciseVariation } from '@gtg/shared';

const props = defineProps<{
  modelValue: boolean;
  exercises: Exercise[];
  variations: ExerciseVariation[];
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  select: [variationId: number, targetValue: number | null, setsCount: number];
}>();

const selected = ref<number>();
const targetValue = ref<number | null>(null);
const setsCount = ref(1);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      selected.value = undefined;
      targetValue.value = null;
      setsCount.value = 1;
    }
  },
);

const options = computed(() =>
  props.variations
    .filter((v) => v.deletedAt === null)
    .map((v) => {
      const exercise = props.exercises.find((e) => e.id === v.exerciseId);
      return {
        value: v.id,
        title: `${exercise?.name ?? 'Unknown exercise'} – ${v.name}`,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title)),
);

function save() {
  if (selected.value === undefined) return;
  emit('select', selected.value, targetValue.value, Math.max(1, setsCount.value || 1));
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-card>
      <v-card-title>Add to routine</v-card-title>
      <v-card-text>
        <v-autocomplete
          v-model="selected"
          label="Search exercises and variations"
          :items="options"
          item-title="title"
          item-value="value"
          autofocus
          clearable
          class="mb-2"
        />
        <div class="d-flex ga-2">
          <v-text-field
            v-model.number="setsCount"
            type="number"
            label="Sets"
            min="1"
            style="max-width: 120px"
          />
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
        <v-btn color="primary" :disabled="selected === undefined" @click="save">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
