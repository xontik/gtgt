import type { Routine, RoutineInsert, RoutineUpdate, RoutineItem, RoutineItemInsert, RoutineItemUpdate } from '@gtg/shared';
import { apiFetch } from './client';

export function listRoutines() {
  return apiFetch<Routine[]>('/routines');
}

export function createRoutine(body: RoutineInsert) {
  return apiFetch<Routine>('/routines', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateRoutine(id: number, body: RoutineUpdate) {
  return apiFetch<Routine>(`/routines/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteRoutine(id: number) {
  return apiFetch<void>(`/routines/${id}`, { method: 'DELETE' });
}

export function listRoutineItems() {
  return apiFetch<RoutineItem[]>('/routine-items');
}

export function createRoutineItem(body: RoutineItemInsert) {
  return apiFetch<RoutineItem>('/routine-items', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateRoutineItem(id: number, body: RoutineItemUpdate) {
  return apiFetch<RoutineItem>(`/routine-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteRoutineItem(id: number) {
  return apiFetch<void>(`/routine-items/${id}`, { method: 'DELETE' });
}
