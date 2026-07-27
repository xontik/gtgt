import type { ExerciseVariation, ExerciseVariationInsert, ExerciseVariationUpdate } from '@gtg/shared';
import { apiFetch } from './client';

export function listVariations(exerciseId?: number) {
  const query = exerciseId ? `?exerciseId=${exerciseId}` : '';
  return apiFetch<ExerciseVariation[]>(`/variations${query}`);
}

export function createVariation(body: ExerciseVariationInsert) {
  return apiFetch<ExerciseVariation>('/variations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateVariation(id: number, body: ExerciseVariationUpdate) {
  return apiFetch<ExerciseVariation>(`/variations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteVariation(id: number) {
  return apiFetch<void>(`/variations/${id}`, { method: 'DELETE' });
}

export function restoreVariation(id: number) {
  return apiFetch<ExerciseVariation>(`/variations/${id}/restore`, { method: 'POST' });
}
