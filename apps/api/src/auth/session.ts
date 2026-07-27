import { randomBytes } from 'node:crypto';

// Single-user app: an in-memory session store is fine (no persistence
// needed across restarts, everyone just logs in again).
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const sessions = new Map<string, number>(); // token -> expiresAt

export function createSession(): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (expiresAt === undefined) return false;
  if (expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}
