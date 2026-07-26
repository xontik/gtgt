import type { ExerciseVariation } from '@gtg/shared';
import { apiFetch } from './client';

export function listVariations(exerciseId?: number) {
  const query = exerciseId ? `?exerciseId=${exerciseId}` : '';
  return apiFetch<ExerciseVariation[]>(`/variations${query}`);
}
