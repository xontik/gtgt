import type { LogEntry, LogEntryInsert } from '@gtg/shared';
import { apiFetch } from './client';

export function createLogEntry(body: LogEntryInsert) {
  return apiFetch<LogEntry>('/log-entries', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
