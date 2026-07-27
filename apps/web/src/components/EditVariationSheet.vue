<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ExerciseVariation } from '@gtg/shared';

const props = defineProps<{
  modelValue: boolean;
  variation: ExerciseVariation | undefined;
  parentOptions: { id: number; name: string }[];
}>();

const emit = defineEmits<{
  'update:modelValue': [boolean];
  save: [
    details: {
      name: string;
      parentVariationId: number | null;
      imageUrl: string | null;
      notes: string | null;
      videoUrl: string | null;
      targetSetsPerDay: number | null;
    },
  ];
  delete: [];
}>();

const name = ref('');
const parentVariationId = ref<number | null>(null);
const imageUrl = ref('');
const notes = ref('');
const videoUrl = ref('');
const targetSetsPerDay = ref<number | null>(null);
const confirmingDelete = ref(false);

watch(
  () => props.variation,
  (variation) => {
    if (variation) {
      name.value = variation.name;
      parentVariationId.value = variation.parentVariationId;
      imageUrl.value = variation.imageUrl ?? '';
      notes.value = variation.notes ?? '';
      videoUrl.value = variation.videoUrl ?? '';
      targetSetsPerDay.value = variation.targetSetsPerDay;
    }
    confirmingDelete.value = false;
  },
);

function close() {
  emit('update:modelValue', false);
}

function save() {
  if (!name.value.trim()) return;
  emit('save', {
    name: name.value.trim(),
    parentVariationId: parentVariationId.value,
    imageUrl: imageUrl.value.trim() || null,
    notes: notes.value.trim() || null,
    videoUrl: videoUrl.value.trim() || null,
    targetSetsPerDay: targetSetsPerDay.value || null,
  });
}
</script>

<template>
  <v-bottom-sheet :model-value="modelValue" @update:model-value="(v) => emit('update:modelValue', v)">
    <v-sheet class="pa-4" rounded="t-lg">
      <div class="text-h6 mb-4">Edit variation</div>

      <v-img
        v-if="imageUrl.trim()"
        :src="imageUrl.trim()"
        max-height="240"
        class="mb-4 rounded bg-surface-variant"
        contain
      />

      <v-text-field v-model="name" label="Name" autofocus />

      <v-select
        v-model="parentVariationId"
        label="Branches from"
        :items="[{ id: null, name: 'No parent (root)' }, ...parentOptions]"
        item-title="name"
        item-value="id"
        class="mb-2"
      />

      <v-text-field
        v-model="imageUrl"
        label="Image URL"
        placeholder="https://…"
        prepend-inner-icon="mdi-image-outline"
        class="mb-2"
      />

      <v-text-field
        v-model="videoUrl"
        label="Video URL (YouTube, etc.)"
        placeholder="https://…"
        prepend-inner-icon="mdi-youtube"
        class="mb-2"
      />

      <v-textarea v-model="notes" label="Notes / tips" rows="3" auto-grow class="mb-2" />

      <v-text-field
        v-model.number="targetSetsPerDay"
        type="number"
        label="Target sets per day (optional)"
        placeholder="e.g. 5"
        prepend-inner-icon="mdi-target"
        min="0"
        class="mb-2"
      />

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
