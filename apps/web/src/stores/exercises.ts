import { defineStore } from 'pinia';
import type { Exercise, ExerciseInsert, ExerciseUpdate, ExerciseVariation } from '@gtg/shared';
import { listExercises, createExercise, updateExercise, deleteExercise } from '../api/exercises';
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
    activeVariationsFor(): (exerciseId: number) => ExerciseVariation[] {
      return (exerciseId: number) =>
        this.variationsFor(exerciseId).filter((v) => v.deletedAt === null);
    },
    favoriteVariations: (state) => state.variations.filter((v) => v.isFavorite && v.deletedAt === null),
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

    async setFavorite(variationId: number, isFavorite: boolean) {
      const updated = await updateVariation(variationId, { isFavorite });
      const index = this.variations.findIndex((v) => v.id === variationId);
      if (index !== -1) this.variations[index] = updated;
    },

    async moveVariation(variationId: number, direction: 'up' | 'down') {
      const variation = this.variations.find((v) => v.id === variationId);
      if (!variation) return;

      const siblings = this.activeVariationsFor(variation.exerciseId).filter(
        (v) => v.parentVariationId === variation.parentVariationId,
      );
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

    async addVariation(exerciseId: number, name: string, parentVariationId: number | null = null) {
      const siblings = this.activeVariationsFor(exerciseId).filter(
        (v) => v.parentVariationId === parentVariationId,
      );
      const nextRank = (siblings.at(-1)?.difficultyRank ?? 0) + 1;
      const created = await createVariation({
        exerciseId,
        name,
        difficultyRank: nextRank,
        parentVariationId,
        isFavorite: false,
      });
      this.variations.push(created);
    },

    async updateVariationDetails(variationId: number, name: string, parentVariationId: number | null) {
      const variation = this.variations.find((v) => v.id === variationId);
      if (!variation) return;

      const reparenting = parentVariationId !== variation.parentVariationId;
      const newSiblings = this.activeVariationsFor(variation.exerciseId).filter(
        (v) => v.parentVariationId === parentVariationId && v.id !== variationId,
      );
      const difficultyRank = reparenting
        ? (newSiblings.at(-1)?.difficultyRank ?? 0) + 1
        : variation.difficultyRank;

      const updated = await updateVariation(variationId, { name, parentVariationId, difficultyRank });
      const index = this.variations.findIndex((v) => v.id === variationId);
      if (index !== -1) this.variations[index] = updated;
    },

    async removeVariation(variationId: number) {
      await deleteVariation(variationId);
      const variation = this.variations.find((v) => v.id === variationId);
      if (variation) {
        variation.deletedAt = new Date();
        for (const child of this.variations) {
          if (child.parentVariationId === variationId) child.parentVariationId = variation.parentVariationId;
        }
      }
    },

    async addExercise(body: ExerciseInsert) {
      const created = await createExercise(body);
      this.exercises.push(created);
    },

    async updateExerciseDetails(exerciseId: number, body: ExerciseUpdate) {
      const updated = await updateExercise(exerciseId, body);
      const index = this.exercises.findIndex((e) => e.id === exerciseId);
      if (index !== -1) this.exercises[index] = updated;
    },

    async removeExercise(exerciseId: number) {
      await deleteExercise(exerciseId);
      this.exercises = this.exercises.filter((e) => e.id !== exerciseId);
      this.variations = this.variations.filter((v) => v.exerciseId !== exerciseId);
    },
  },
});
