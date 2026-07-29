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
  select: [variationId: number];
}>();

const selected = ref<number>();

watch(
  () => props.modelValue,
  (open) => {
    if (open) selected.value = undefined;
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
  emit('select', selected.value);
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-card>
      <v-card-title>Quick log</v-card-title>
      <v-card-text>
        <v-autocomplete
          v-model="selected"
          label="Search any exercise or variation"
          :items="options"
          item-title="title"
          item-value="value"
          autofocus
          clearable
          @update:model-value="save"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
