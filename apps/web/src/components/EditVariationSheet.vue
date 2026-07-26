<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ExerciseVariation } from '@gtg/shared';

const props = defineProps<{
  modelValue: boolean;
  variation: ExerciseVariation | undefined;
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  save: [name: string];
  delete: [];
}>();

const name = ref('');
const confirmingDelete = ref(false);

watch(
  () => props.variation,
  (variation) => {
    if (variation) name.value = variation.name;
    confirmingDelete.value = false;
  },
);

function close() {
  emit('update:modelValue', false);
}

function save() {
  if (!name.value.trim()) return;
  emit('save', name.value.trim());
}
</script>

<template>
  <v-bottom-sheet :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-sheet class="pa-4" rounded="t-lg">
      <div class="text-h6 mb-4">Edit variation</div>

      <v-text-field v-model="name" label="Name" autofocus />

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
      <div v-else class="d-flex ga-2">
        <v-btn class="flex-1-1" variant="tonal" @click="confirmingDelete = false">Cancel</v-btn>
        <v-btn class="flex-1-1" color="error" @click="emit('delete')">Confirm delete</v-btn>
      </div>

      <v-btn block variant="text" class="mt-2" @click="close">Close</v-btn>
    </v-sheet>
  </v-bottom-sheet>
</template>
