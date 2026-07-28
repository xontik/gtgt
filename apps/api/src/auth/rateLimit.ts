// Simple in-memory brute-force guard for the passcode login, keyed by IP.
// Single-user app behind (at most) a handful of trusted clients, so an
// in-memory map is fine - no need for a shared store across restarts.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

interface AttemptState {
  count: number;
  windowStart: number;
  lockedUntil?: number;
}

const attempts = new Map<string, AttemptState>();

export function isLockedOut(key: string): boolean {
  const state = attempts.get(key);
  if (!state?.lockedUntil) return false;
  if (state.lockedUntil <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return true;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const state = attempts.get(key);

  if (!state || now - state.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
    return;
  }

  state.count += 1;
  if (state.count >= MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS;
  }
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
