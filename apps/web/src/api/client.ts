import { beginRequest, endRequest } from '../lib/globalLoading';

const BASE_URL = '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  beginRequest();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: init?.body ? { 'content-type': 'application/json', ...init.headers } : init?.headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (
        res.status === 401 &&
        !path.startsWith('/auth') &&
        globalThis.location.pathname !== '/login'
      ) {
        globalThis.location.href = '/login';
      }
      throw new ApiError(body.error ?? res.statusText, res.status);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } finally {
    endRequest();
  }
}
