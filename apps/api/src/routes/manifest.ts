import type { FastifyInstance } from 'fastify';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { exercises, exerciseVariations, logEntries } from '../db/schema.js';
import { isValidSession } from '../auth/session.js';
import { SESSION_COOKIE } from './auth.js';

const MANIFEST_BASE = {
  name: 'GtG Tracker',
  short_name: 'GtG',
  description: 'Log Grease the Groove calisthenics sets fast, from your phone.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#863bff',
  icons: [
    { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

const SHORTCUT_COUNT = 3;

function formatValue(metricType: string, value: number): string {
  if (metricType !== 'time') return `${value}`;
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Long-press-on-the-home-screen-icon shortcuts (Android/Chrome; iOS Safari
// doesn't support the manifest `shortcuts` member at all, so this is a
// no-op enhancement there, not a regression) straight into quick-logging
// your most-recently-used favorites, without opening the app first - the
// value shown is exactly what tapping it will log, same number as the
// "+<value>" button on the Home card, via the same ?logVariation deep
// link HomeView already handles.
async function buildShortcuts() {
  const favorites = await db
    .select({
      id: exerciseVariations.id,
      name: exerciseVariations.name,
      exerciseName: exercises.name,
      metricType: exercises.metricType,
    })
    .from(exerciseVariations)
    .innerJoin(exercises, eq(exerciseVariations.exerciseId, exercises.id))
    .where(and(eq(exerciseVariations.isFavorite, true), isNull(exerciseVariations.deletedAt)));

  if (favorites.length === 0) return [];

  const entries = await db
    .select({ variationId: logEntries.variationId, value: logEntries.value, timestamp: logEntries.timestamp })
    .from(logEntries)
    .where(
      inArray(
        logEntries.variationId,
        favorites.map((f) => f.id),
      ),
    )
    .orderBy(desc(logEntries.timestamp));

  const lastByVariation = new Map<number, { value: number; timestamp: Date }>();
  for (const entry of entries) {
    if (!lastByVariation.has(entry.variationId)) {
      lastByVariation.set(entry.variationId, { value: entry.value, timestamp: entry.timestamp });
    }
  }

  return favorites
    .map((favorite) => ({ ...favorite, last: lastByVariation.get(favorite.id) }))
    .filter((f): f is typeof f & { last: { value: number; timestamp: Date } } => f.last !== undefined)
    .sort((a, b) => b.last.timestamp.getTime() - a.last.timestamp.getTime())
    .slice(0, SHORTCUT_COUNT)
    .map((f) => ({
      name: `${f.exerciseName} +${formatValue(f.metricType, f.last.value)}`,
      short_name: f.exerciseName,
      url: `/?logVariation=${f.id}`,
      icons: [{ src: '/icon-192.png', sizes: '192x192' }],
    }));
}

export async function manifestRoutes(app: FastifyInstance) {
  app.get('/manifest.webmanifest', async (req, reply) => {
    // Same shared-secret gate as every /api route (see index.ts) - this
    // path is deliberately outside that prefix (it must be at the site
    // root to be discovered as a PWA manifest) but favorite names/values
    // are still real user data, so it needs the same check done by hand.
    const expected = process.env.APP_PASSCODE;
    const authed = !expected || isValidSession(req.cookies[SESSION_COOKIE]);

    reply.header('content-type', 'application/manifest+json');
    return { ...MANIFEST_BASE, shortcuts: authed ? await buildShortcuts() : [] };
  });
}
