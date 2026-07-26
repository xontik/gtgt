import { defineStore } from 'pinia';
import type { Exercise, ExerciseVariation } from '@gtg/shared';
import { listExercises } from '../api/exercises';
import { listVariations } from '../api/variations';

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
  },
});
