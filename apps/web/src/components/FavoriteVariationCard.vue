<script setup lang="ts">
import { ref } from 'vue';
import type { Exercise, ExerciseVariation } from '@gtg/shared';

defineProps<{
  exercise: Exercise;
  variation: ExerciseVariation;
  todayLabel: string;
  lastLoggedLabel: string;
  goalLabel?: string;
}>();

const emit = defineEmits<{ log: []; unfavorite: [] }>();

const confirmingRemove = ref(false);

function confirmRemove() {
  confirmingRemove.value = false;
  emit('unfavorite');
}
</script>

<template>
  <v-card @click="emit('log')">
    <v-card-item>
      <v-card-title>{{ exercise.name }}</v-card-title>
      <v-card-subtitle>{{ variation.name }}</v-card-subtitle>
      <template #append>
        <v-btn
          icon="mdi-heart-off-outline"
          variant="text"
          @click.stop="confirmingRemove = true"
        />
        <v-btn icon="mdi-chevron-right" variant="text" :to="`/exercises/${exercise.id}`" @click.stop />
      </template>
    </v-card-item>
    <v-card-text class="pt-0 text-caption text-medium-emphasis">
      {{ todayLabel }} · {{ lastLoggedLabel }}
      <div v-if="goalLabel" class="mt-1 text-primary">{{ goalLabel }}</div>
    </v-card-text>
  </v-card>

  <v-dialog v-model="confirmingRemove" max-width="360">
    <v-card>
      <v-card-title>Remove from favorites?</v-card-title>
      <v-card-text>
        "{{ variation.name }}" won't show on Home anymore, but its log history is kept.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmingRemove = false">Cancel</v-btn>
        <v-btn color="error" @click="confirmRemove">Remove</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
