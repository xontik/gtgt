import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { exerciseInsertSchema, exerciseUpdateSchema } from '@gtg/shared';
import { db } from '../db/client.js';
import { exercises } from '../db/schema.js';
import { NotFoundError } from '../lib/errors.js';

export async function exerciseRoutes(app: FastifyInstance) {
  app.get('/exercises', async () => {
    return db.select().from(exercises);
  });

  app.get('/exercises/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const [exercise] = await db.select().from(exercises).where(eq(exercises.id, id));
    if (!exercise) throw new NotFoundError('Exercise not found');
    return exercise;
  });

  app.post('/exercises', async (req, reply) => {
    const body = exerciseInsertSchema.parse(req.body);
    const [created] = await db.insert(exercises).values(body).returning();
    reply.code(201);
    return created;
  });

  app.patch('/exercises/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const body = exerciseUpdateSchema.parse(req.body);
    const [updated] = await db.update(exercises).set(body).where(eq(exercises.id, id)).returning();
    if (!updated) throw new NotFoundError('Exercise not found');
    return updated;
  });

  app.delete('/exercises/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [deleted] = await db.delete(exercises).where(eq(exercises.id, id)).returning();
    if (!deleted) throw new NotFoundError('Exercise not found');
    reply.code(204);
  });
}
