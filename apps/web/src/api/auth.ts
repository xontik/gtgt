import { apiFetch } from './client';

export function login(passcode: string) {
  return apiFetch<{ ok: true }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ passcode }),
  });
}

export function logout() {
  return apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' });
}

export function authStatus() {
  return apiFetch<{ authRequired: boolean }>('/auth/status');
}

export function authCheck() {
  return apiFetch<{ ok: true }>('/auth/check');
}
