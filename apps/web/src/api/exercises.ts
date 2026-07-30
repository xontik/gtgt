import type { Exercise, ExerciseInsert, ExerciseUpdate } from '@gtg/shared';
import { apiFetch } from './client';
import { mutateFetch } from '../lib/offlineQueue';

export function listExercises() {
  return apiFetch<Exercise[]>('/exercises');
}

// Creating a brand-new exercise while offline isn't supported (rare
// mid-workout, and its auto-created variation would need the same
// treatment) - this still throws normally if the network is down.
export function createExercise(body: ExerciseInsert) {
  return apiFetch<Exercise>('/exercises', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateExercise(exercise: Exercise, body: ExerciseUpdate) {
  const optimistic: Exercise = { ...exercise, ...body };
  return mutateFetch<Exercise>(
    `/exercises/${exercise.id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    optimistic,
    `Update ${exercise.name}`,
  );
}

export function deleteExercise(id: number) {
  return apiFetch<void>(`/exercises/${id}`, { method: 'DELETE' });
}
