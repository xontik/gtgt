import type { LogEntry, LogEntryInsert, LogEntryUpdate } from '@gtg/shared';
import { apiFetch } from './client';
import { mutateFetch } from '../lib/offlineQueue';

// Client-generated ids for entries created while offline, so the UI can
// show them immediately (pushed into the same entries array as real
// entries) without waiting for a server-assigned id. Real ids from SQLite
// are always positive, so "id < 0" unambiguously means "still queued,
// not yet synced" - components check that instead of a separate flag.
let nextTempId = -1;
function tempId(): number {
  const id = nextTempId;
  nextTempId -= 1;
  return id;
}

export function createLogEntry(body: LogEntryInsert) {
  const optimistic: LogEntry = {
    id: tempId(),
    variationId: body.variationId,
    value: body.value,
    timestamp: body.timestamp ?? new Date(),
    notes: body.notes,
  };
  return mutateFetch<LogEntry>(
    '/log-entries',
    { method: 'POST', body: JSON.stringify(body) },
    optimistic,
    `Log ${body.value} for variation ${body.variationId}`,
  );
}

export function updateLogEntry(entry: LogEntry, body: LogEntryUpdate) {
  const optimistic: LogEntry = { ...entry, ...body };
  return mutateFetch<LogEntry>(
    `/log-entries/${entry.id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
    optimistic,
    `Edit set on variation ${entry.variationId}`,
  );
}

export function deleteLogEntry(entry: LogEntry) {
  return mutateFetch<void>(
    `/log-entries/${entry.id}`,
    { method: 'DELETE' },
    undefined,
    `Delete set on variation ${entry.variationId}`,
  );
}

export function listLogEntries(params: { since?: Date; until?: Date } = {}) {
  const query = new URLSearchParams();
  if (params.since) query.set('since', params.since.toISOString());
  if (params.until) query.set('until', params.until.toISOString());
  const qs = query.toString();
  const path = qs ? `/log-entries?${qs}` : '/log-entries';
  return apiFetch<LogEntry[]>(path);
}
