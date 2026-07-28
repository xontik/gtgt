<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ modelValue: boolean }>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  save: [name: string];
}>();

const name = ref('');

watch(
  () => props.modelValue,
  (open) => {
    if (open) name.value = '';
  },
);

function save() {
  if (!name.value.trim()) return;
  emit('save', name.value.trim());
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="400" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-card>
      <v-card-title>Add variation</v-card-title>
      <v-card-text>
        <v-text-field v-model="name" label="Name" autofocus @keyup.enter="save" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-btn color="primary" :disabled="!name.trim()" @click="save">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
