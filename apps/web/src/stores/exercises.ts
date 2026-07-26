import { defineStore } from 'pinia';
import type { Exercise, ExerciseVariation } from '@gtg/shared';
import { listExercises, updateExercise } from '../api/exercises';
import { listVariations, createVariation, updateVariation, deleteVariation } from '../api/variations';

export const useExercisesStore = defineStore('exercises', {
  state: () => ({
    exercises: [] as Exercise[],
    variations: [] as ExerciseVariation[],
    loading: false,
  }),
  getters: {
    variationsFor: (state) => (exerciseId: number) =>
      state.variations
        .filter((v) => v.exerciseId === exerciseId)
        .sort((a, b) => a.difficultyRank - b.difficultyRank),
    activeVariationFor: (state) => (exercise: Exercise) =>
      state.variations.find((v) => v.id === exercise.activeVariationId),
  },
  actions: {
    async fetchAll() {
      this.loading = true;
      try {
        const [exercises, variations] = await Promise.all([listExercises(), listVariations()]);
        this.exercises = exercises;
        this.variations = variations;
      } finally {
        this.loading = false;
      }
    },

    async setActiveVariation(exerciseId: number, variationId: number) {
      const updated = await updateExercise(exerciseId, { activeVariationId: variationId });
      const index = this.exercises.findIndex((e) => e.id === exerciseId);
      if (index !== -1) this.exercises[index] = updated;
    },

    async moveVariation(variationId: number, direction: 'up' | 'down') {
      const variation = this.variations.find((v) => v.id === variationId);
      if (!variation) return;

      const siblings = this.variationsFor(variation.exerciseId);
      const index = siblings.findIndex((v) => v.id === variationId);
      const neighborIndex = direction === 'up' ? index - 1 : index + 1;
      const neighbor = siblings[neighborIndex];
      if (!neighbor) return;

      const [updatedVariation, updatedNeighbor] = await Promise.all([
        updateVariation(variation.id, { difficultyRank: neighbor.difficultyRank }),
        updateVariation(neighbor.id, { difficultyRank: variation.difficultyRank }),
      ]);

      for (const updated of [updatedVariation, updatedNeighbor]) {
        const i = this.variations.findIndex((v) => v.id === updated.id);
        if (i !== -1) this.variations[i] = updated;
      }
    },

    async addVariation(exerciseId: number, name: string) {
      const siblings = this.variationsFor(exerciseId);
      const nextRank = (siblings.at(-1)?.difficultyRank ?? 0) + 1;
      const created = await createVariation({ exerciseId, name, difficultyRank: nextRank });
      this.variations.push(created);

      const exercise = this.exercises.find((e) => e.id === exerciseId);
      if (exercise?.activeVariationId === null) {
        await this.setActiveVariation(exerciseId, created.id);
      }
    },

    async renameVariation(variationId: number, name: string) {
      const updated = await updateVariation(variationId, { name });
      const index = this.variations.findIndex((v) => v.id === variationId);
      if (index !== -1) this.variations[index] = updated;
    },

    async removeVariation(variationId: number) {
      await deleteVariation(variationId);
      this.variations = this.variations.filter((v) => v.id !== variationId);
      for (const exercise of this.exercises) {
        if (exercise.activeVariationId === variationId) exercise.activeVariationId = null;
      }
    },
  },
});
