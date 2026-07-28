<script setup lang="ts">
import { computed } from 'vue';
import type { ExerciseVariation } from '@gtg/shared';

const props = defineProps<{
  variations: ExerciseVariation[];
}>();

const emit = defineEmits<{
  reorder: [variationId: number, direction: 'up' | 'down'];
  edit: [variationId: number];
  favorite: [variationId: number, isFavorite: boolean];
}>();

const sorted = computed(() => [...props.variations].sort((a, b) => a.difficultyRank - b.difficultyRank));
</script>

<template>
  <v-list density="compact">
    <v-list-item
      v-for="(variation, index) in sorted"
      :key="variation.id"
      :title="variation.name"
      @click="emit('edit', variation.id)"
    >
      <template #append>
        <div class="d-flex align-center ga-1">
          <v-btn
            :icon="variation.isFavorite ? 'mdi-heart' : 'mdi-heart-outline'"
            :color="variation.isFavorite ? 'error' : undefined"
            size="x-small"
            variant="text"
            title="Toggle favorite"
            @click.stop="emit('favorite', variation.id, !variation.isFavorite)"
          />
          <v-btn
            icon="mdi-arrow-up"
            size="x-small"
            variant="text"
            :disabled="index === 0"
            @click.stop="emit('reorder', variation.id, 'up')"
          />
          <v-btn
            icon="mdi-arrow-down"
            size="x-small"
            variant="text"
            :disabled="index === sorted.length - 1"
            @click.stop="emit('reorder', variation.id, 'down')"
          />
          <v-btn icon="mdi-pencil" size="x-small" variant="text" @click.stop="emit('edit', variation.id)" />
        </div>
      </template>
    </v-list-item>
  </v-list>
</template>
