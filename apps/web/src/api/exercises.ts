import type { Exercise, ExerciseUpdate } from '@gtg/shared';
import { apiFetch } from './client';

export function listExercises() {
  return apiFetch<Exercise[]>('/exercises');
}

export function updateExercise(id: number, body: ExerciseUpdate) {
  return apiFetch<Exercise>(`/exercises/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
