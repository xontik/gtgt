import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCookie from '@fastify/cookie';
import cron from 'node-cron';
import { ZodError } from 'zod';
import { exerciseRoutes } from './routes/exercises.js';
import { exerciseVariationRoutes } from './routes/exerciseVariations.js';
import { logEntryRoutes } from './routes/logEntries.js';
import { routineRoutes } from './routes/routines.js';
import { backupRoutes } from './routes/backup.js';
import { notificationRoutes } from './routes/notifications.js';
import { authRoutes, SESSION_COOKIE } from './routes/auth.js';
import { manifestRoutes } from './routes/manifest.js';
import { trmnlRoutes } from './routes/trmnl.js';
import { isValidSession } from './auth/session.js';
import { checkIdleAndNotify } from './notifications/checkIdle.js';
import { runAutoBackup } from './backups/autoBackup.js';
import { isNotFoundError } from './lib/errors.js';

const app = Fastify({
  logger:
    process.env.NODE_ENV === 'production'
      ? true
      : { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } },
});

// Serves the built Vue SPA alongside the API - one process, one container,
// same-origin (so no CORS needed). In local dev the frontend runs under
// Vite instead and this directory won't exist, so skip registering.
const staticDir = process.env.STATIC_DIR ?? fileURLToPath(new URL('../public', import.meta.url));
const serveStatic = existsSync(staticDir);
if (serveStatic) {
  // manifest.webmanifest is served dynamically instead (see routes/manifest.ts,
  // registered below) so it can list the current top favorites as
  // installable shortcuts - excluded here so that route isn't shadowed by
  // the static file of the same name.
  await app.register(fastifyStatic, { root: staticDir, wildcard: false, globIgnore: ['manifest.webmanifest'] });
} else {
  app.log.warn({ staticDir }, 'static dir not found, not serving the web app from this process');
}

app.setErrorHandler((err, req, reply) => {
  if (err instanceof ZodError) {
    reply.code(400).send({ error: 'Validation failed', issues: err.issues });
    return;
  }
  if (isNotFoundError(err)) {
    reply.code(404).send({ error: err.message });
    return;
  }
  const statusCode = (err as { statusCode?: number }).statusCode;
  if (statusCode !== undefined && statusCode < 500) {
    const message = err instanceof Error ? err.message : 'Request error';
    reply.code(statusCode).send({ error: message });
    return;
  }
  app.log.error(err);
  reply.code(500).send({ error: 'Internal server error' });
});

await app.register(fastifyCookie);

app.get('/health', async () => ({ status: 'ok' }));

// Shared-secret gate for a single-user app behind a public URL. If
// APP_PASSCODE is unset/empty, skip auth entirely so existing deploys with
// no env var keep working with zero login friction.
app.addHook('onRequest', async (req, reply) => {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return;
  if (!req.url.startsWith('/api')) return;
  if (req.url.startsWith('/api/auth/login') || req.url.startsWith('/api/auth/status')) return;
  // TRMNL's server fetches this on its own schedule with no way to carry a
  // session cookie - see routes/trmnl.ts, deliberately public like
  // manifest.webmanifest.
  if (req.url.startsWith('/api/trmnl')) return;

  const token = req.cookies[SESSION_COOKIE];
  if (!isValidSession(token)) {
    reply.code(401).send({ error: 'Authentication required' });
  }
});

await app.register(manifestRoutes);
await app.register(trmnlRoutes, { prefix: '/api' });
await app.register(authRoutes, { prefix: '/api' });
await app.register(exerciseRoutes, { prefix: '/api' });
await app.register(exerciseVariationRoutes, { prefix: '/api' });
await app.register(logEntryRoutes, { prefix: '/api' });
await app.register(routineRoutes, { prefix: '/api' });
await app.register(backupRoutes, { prefix: '/api' });
await app.register(notificationRoutes, { prefix: '/api' });

// SPA fallback: any unmatched non-API route serves index.html so
// client-side (vue-router history mode) routes work on a hard refresh.
if (serveStatic) {
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url?.startsWith('/api')) {
      reply.code(404).send({ error: 'Not found' });
      return;
    }
    reply.sendFile('index.html');
  });
}

// Hourly rather than every few minutes - checkIdleAndNotify's own cooldown
// (lastNotifiedAt, see notifications/checkIdle.ts) already prevents repeat
// reminders for the same idle stretch, so a tighter cron just burned cycles
// without changing user-visible behavior.
const notifySchedule = process.env.NOTIFY_CRON_SCHEDULE ?? '0 8-22 * * *';
// Docker containers default to UTC regardless of the host's timezone, so
// pin this explicitly rather than relying on the process's system tz.
const notifyTimezone = process.env.NOTIFY_TIMEZONE ?? 'UTC';
cron.schedule(
  notifySchedule,
  () => {
    app.log.info('idle check cron fired');
    checkIdleAndNotify()
      .then((result) => app.log.info(result, 'idle check ran'))
      .catch((err) => app.log.error(err, 'idle check failed'));
  },
  { timezone: notifyTimezone },
);
app.log.info({ notifySchedule, notifyTimezone }, 'idle-check cron scheduled');

// Daily auto-backup to disk (same volume as the sqlite file): keeps every
// backup from the last 7 days plus one per month for the 3 months before
// that, deleting the rest. Independent of the manual "Download backup"
// button on the System page - this one just sits on the server as a safety
// net if you forget to click it.
const backupSchedule = process.env.BACKUP_CRON_SCHEDULE ?? '0 3 * * *';
const backupTimezone = process.env.NOTIFY_TIMEZONE ?? 'UTC';
cron.schedule(
  backupSchedule,
  () => {
    app.log.info('auto-backup cron fired');
    runAutoBackup()
      .then((result) => app.log.info(result, 'auto-backup ran'))
      .catch((err) => app.log.error(err, 'auto-backup failed'));
  },
  { timezone: backupTimezone },
);
app.log.info({ backupSchedule, backupTimezone }, 'auto-backup cron scheduled');

const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
