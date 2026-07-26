import type { LogEntry, LogEntryInsert, LogEntryUpdate } from '@gtg/shared';
import { apiFetch } from './client';

export function createLogEntry(body: LogEntryInsert) {
  return apiFetch<LogEntry>('/log-entries', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateLogEntry(id: number, body: LogEntryUpdate) {
  return apiFetch<LogEntry>(`/log-entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteLogEntry(id: number) {
  return apiFetch<void>(`/log-entries/${id}`, { method: 'DELETE' });
}

export function listLogEntries(params: { since?: Date; until?: Date } = {}) {
  const query = new URLSearchParams();
  if (params.since) query.set('since', params.since.toISOString());
  if (params.until) query.set('until', params.until.toISOString());
  const qs = query.toString();
  const path = qs ? `/log-entries?${qs}` : '/log-entries';
  return apiFetch<LogEntry[]>(path);
}
