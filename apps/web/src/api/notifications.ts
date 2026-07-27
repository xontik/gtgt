import { apiFetch } from './client';

export function checkIdleNow() {
  return apiFetch<{ notified: boolean; reason: string }>('/notifications/check-idle', {
    method: 'POST',
  });
}
