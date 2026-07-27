import type { Exercise, ExerciseInsert, ExerciseUpdate } from '@gtg/shared';
import { apiFetch } from './client';

export function listExercises() {
  return apiFetch<Exercise[]>('/exercises');
}

export function createExercise(body: ExerciseInsert) {
  return apiFetch<Exercise>('/exercises', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateExercise(id: number, body: ExerciseUpdate) {
  return apiFetch<Exercise>(`/exercises/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteExercise(id: number) {
  return apiFetch<void>(`/exercises/${id}`, { method: 'DELETE' });
}
