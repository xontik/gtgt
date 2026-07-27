import { apiFetch } from './client';

export function checkIdleNow(options: { force?: boolean } = {}) {
  const qs = options.force ? '?force=true' : '';
  return apiFetch<{ notified: boolean; reason: string }>(`/notifications/check-idle${qs}`, {
    method: 'POST',
  });
}
