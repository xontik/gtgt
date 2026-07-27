import Fastify from 'fastify';
import cors from '@fastify/cors';
import cron from 'node-cron';
import { ZodError } from 'zod';
import { exerciseRoutes } from './routes/exercises.js';
import { exerciseVariationRoutes } from './routes/exerciseVariations.js';
import { logEntryRoutes } from './routes/logEntries.js';
import { backupRoutes } from './routes/backup.js';
import { notificationRoutes } from './routes/notifications.js';
import { checkIdleAndNotify } from './notifications/checkIdle.js';
import { isNotFoundError } from './lib/errors.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

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

app.get('/health', async () => ({ status: 'ok' }));

await app.register(exerciseRoutes, { prefix: '/api' });
await app.register(exerciseVariationRoutes, { prefix: '/api' });
await app.register(logEntryRoutes, { prefix: '/api' });
await app.register(backupRoutes, { prefix: '/api' });
await app.register(notificationRoutes, { prefix: '/api' });

const notifySchedule = process.env.NOTIFY_CRON_SCHEDULE ?? '0 8-22 * * *';
cron.schedule(notifySchedule, () => {
  checkIdleAndNotify()
    .then((result) => app.log.info(result, 'idle check ran'))
    .catch((err) => app.log.error(err, 'idle check failed'));
});

const port = Number(process.env.PORT ?? 3001);

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
