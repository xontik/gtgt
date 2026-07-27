import type { Backup } from '@gtg/shared';
import { apiFetch } from './client';

export function fetchBackup() {
  return apiFetch<Backup>('/backup');
}

export function restoreBackup(backup: Backup) {
  return apiFetch<{ restored: true }>('/backup/restore', {
    method: 'POST',
    body: JSON.stringify(backup),
  });
}

export function importStructure(backup: Backup) {
  return apiFetch<{
    importedExercises: number;
    importedVariations: number;
    skippedExercises: number;
    skippedVariations: number;
  }>('/backup/import-structure', {
    method: 'POST',
    body: JSON.stringify(backup),
  });
}
