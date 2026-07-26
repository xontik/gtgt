import type { LogEntry, LogEntryInsert } from '@gtg/shared';
import { apiFetch } from './client';

export function createLogEntry(body: LogEntryInsert) {
  return apiFetch<LogEntry>('/log-entries', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listLogEntries(params: { since?: Date; until?: Date } = {}) {
  const query = new URLSearchParams();
  if (params.since) query.set('since', params.since.toISOString());
  if (params.until) query.set('until', params.until.toISOString());
  const qs = query.toString();
  const path = qs ? `/log-entries?${qs}` : '/log-entries';
  return apiFetch<LogEntry[]>(path);
}
