import type { ExerciseVariation, ExerciseVariationInsert, ExerciseVariationUpdate } from '@gtg/shared';
import { apiFetch } from './client';
import { mutateFetch } from '../lib/offlineQueue';

export function listVariations(exerciseId?: number) {
  const query = exerciseId ? `?exerciseId=${exerciseId}` : '';
  return apiFetch<ExerciseVariation[]>(`/variations${query}`);
}

// Adding a brand-new variation while offline isn't supported (rare, and
// it'd need the same temp-id treatment as log entries) - throws normally
// if the network is down.
export function createVariation(body: ExerciseVariationInsert) {
  return apiFetch<ExerciseVariation>('/variations', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateVariation(variation: ExerciseVariation, body: ExerciseVariationUpdate) {
  const optimistic: ExerciseVariation = { ...variation, ...body };
  return mutateFetch<ExerciseVariation>(
    `/variations/${variation.id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    optimistic,
    `Update ${variation.name}`,
  );
}

export function deleteVariation(variation: ExerciseVariation) {
  return mutateFetch<void>(
    `/variations/${variation.id}`,
    { method: 'DELETE' },
    undefined,
    `Delete ${variation.name}`,
  );
}

export function restoreVariation(variation: ExerciseVariation) {
  const optimistic: ExerciseVariation = { ...variation, deletedAt: null };
  return mutateFetch<ExerciseVariation>(
    `/variations/${variation.id}/restore`,
    { method: 'POST' },
    optimistic,
    `Restore ${variation.name}`,
  );
}
