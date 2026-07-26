import Fastify from 'fastify';
import cors from '@fastify/cors';
import { ZodError } from 'zod';
import { exerciseRoutes } from './routes/exercises.js';
import { exerciseVariationRoutes } from './routes/exerciseVariations.js';
import { logEntryRoutes } from './routes/logEntries.js';
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
  app.log.error(err);
  reply.code(500).send({ error: 'Internal server error' });
});

app.get('/health', async () => ({ status: 'ok' }));

await app.register(exerciseRoutes, { prefix: '/api' });
await app.register(exerciseVariationRoutes, { prefix: '/api' });
await app.register(logEntryRoutes, { prefix: '/api' });

const port = Number(process.env.PORT ?? 3001);

app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
