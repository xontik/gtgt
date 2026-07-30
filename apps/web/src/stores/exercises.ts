import { defineStore } from 'pinia';
import type { Exercise, ExerciseInsert, ExerciseUpdate, ExerciseVariation } from '@gtg/shared';
import { listExercises, createExercise, updateExercise, deleteExercise } from '../api/exercises';
import {
  listVariations,
  createVariation,
  updateVariation,
  deleteVariation,
  restoreVariation,
} from '../api/variations';

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
      const existing = this.variations.find((v) => v.id === variationId);
      if (!existing) return;
      const updated = await updateVariation(existing, { isFavorite });
      const index = this.variations.findIndex((v) => v.id === variationId);
      if (index !== -1) this.variations[index] = updated;
    },

    async moveVariation(variationId: number, direction: 'up' | 'down') {
      const variation = this.variations.find((v) => v.id === variationId);
      if (!variation) return;

      const siblings = this.activeVariationsFor(variation.exerciseId);
      const index = siblings.findIndex((v) => v.id === variationId);
      const neighborIndex = direction === 'up' ? index - 1 : index + 1;
      const neighbor = siblings[neighborIndex];
      if (!neighbor) return;

      const [updatedVariation, updatedNeighbor] = await Promise.all([
        updateVariation(variation, { difficultyRank: neighbor.difficultyRank }),
        updateVariation(neighbor, { difficultyRank: variation.difficultyRank }),
      ]);

      for (const updated of [updatedVariation, updatedNeighbor]) {
        const i = this.variations.findIndex((v) => v.id === updated.id);
        if (i !== -1) this.variations[i] = updated;
      }
    },

    async addVariation(exerciseId: number, name: string) {
      const siblings = this.activeVariationsFor(exerciseId);
      const nextRank = (siblings.at(-1)?.difficultyRank ?? 0) + 1;
      const created = await createVariation({
        exerciseId,
        name,
        difficultyRank: nextRank,
        isFavorite: false,
        imageUrl: null,
        notes: null,
        videoUrl: null,
        targetValue: null,
        targetSetsPerDay: null,
      });
      this.variations.push(created);
    },

    async updateVariationDetails(
      variationId: number,
      details: {
        name: string;
        imageUrl: string | null;
        notes: string | null;
        videoUrl: string | null;
        targetSetsPerDay: number | null;
      },
    ) {
      const existing = this.variations.find((v) => v.id === variationId);
      if (!existing) return;
      const updated = await updateVariation(existing, details);
      const index = this.variations.findIndex((v) => v.id === variationId);
      if (index !== -1) this.variations[index] = updated;
    },

    async removeVariation(variationId: number) {
      const variation = this.variations.find((v) => v.id === variationId);
      if (!variation) return;
      await deleteVariation(variation);
      variation.deletedAt = new Date();
    },

    async undoRemoveVariation(variationId: number) {
      const existing = this.variations.find((v) => v.id === variationId);
      if (!existing) return;
      const restored = await restoreVariation(existing);
      const index = this.variations.findIndex((v) => v.id === variationId);
      if (index !== -1) this.variations[index] = restored;
    },

    // Auto-adds a same-named variation so a freshly created exercise is
    // never empty (no dead-end "add a variation before you can log
    // anything" step) - it can be renamed/deleted like any other variation.
    async addExercise(body: ExerciseInsert) {
      const created = await createExercise(body);
      this.exercises.push(created);
      await this.addVariation(created.id, created.name);
      return created;
    },

    async updateExerciseDetails(exerciseId: number, body: ExerciseUpdate) {
      const existing = this.exercises.find((e) => e.id === exerciseId);
      if (!existing) return;
      const updated = await updateExercise(existing, body);
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
