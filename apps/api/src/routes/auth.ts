import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { authLoginSchema } from '@gtg/shared';
import { createSession, destroySession } from '../auth/session.js';

export const SESSION_COOKIE = 'gtg_session';

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws if lengths differ, which would itself leak
  // timing info about length - compare against a fixed-length digest
  // instead of bailing out early.
  if (bufA.length !== bufB.length) {
    // Still do a constant-time comparison against something of the same
    // length as bufA so the branch above doesn't dominate the timing
    // signal for wrong-length guesses either.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req, reply) => {
    const { passcode } = authLoginSchema.parse(req.body);
    const expected = process.env.APP_PASSCODE ?? '';

    if (!expected || !constantTimeEquals(passcode, expected)) {
      reply.code(401);
      return { error: 'Invalid passcode' };
    }

    const token = createSession();
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
    return { ok: true };
  });

  app.post('/auth/logout', async (req, reply) => {
    destroySession(req.cookies[SESSION_COOKIE]);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/auth/status', async (req) => {
    const passcodeSet = Boolean(process.env.APP_PASSCODE);
    return { authRequired: passcodeSet };
  });

  // Protected (goes through the onRequest auth hook, unlike /auth/status) -
  // used by the web router guard to check whether the current session is
  // still valid.
  app.get('/auth/check', async () => ({ ok: true }));
}
