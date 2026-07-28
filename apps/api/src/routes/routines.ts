import type { FastifyInstance } from 'fastify';
import { asc, eq } from 'drizzle-orm';
import { routineInsertSchema, routineUpdateSchema, routineItemInsertSchema, routineItemUpdateSchema } from '@gtg/shared';
import { db } from '../db/client.js';
import { routines, routineItems } from '../db/schema.js';
import { NotFoundError } from '../lib/errors.js';

export async function routineRoutes(app: FastifyInstance) {
  app.get('/routines', async () => {
    return db.select().from(routines);
  });

  app.get('/routine-items', async (req) => {
    const { routineId } = req.query as { routineId?: string };
    if (routineId) {
      return db
        .select()
        .from(routineItems)
        .where(eq(routineItems.routineId, Number(routineId)))
        .orderBy(asc(routineItems.order));
    }
    return db.select().from(routineItems).orderBy(asc(routineItems.order));
  });

  app.post('/routines', async (req, reply) => {
    const body = routineInsertSchema.parse(req.body);
    const [created] = await db.insert(routines).values(body).returning();
    reply.code(201);
    return created;
  });

  app.patch('/routines/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const body = routineUpdateSchema.parse(req.body);
    const [updated] = await db.update(routines).set(body).where(eq(routines.id, id)).returning();
    if (!updated) throw new NotFoundError('Routine not found');
    return updated;
  });

  app.delete('/routines/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [deleted] = await db.delete(routines).where(eq(routines.id, id)).returning();
    if (!deleted) throw new NotFoundError('Routine not found');
    reply.code(204);
  });

  app.post('/routine-items', async (req, reply) => {
    const body = routineItemInsertSchema.parse(req.body);
    const [created] = await db.insert(routineItems).values(body).returning();
    reply.code(201);
    return created;
  });

  app.patch('/routine-items/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const body = routineItemUpdateSchema.parse(req.body);
    const [updated] = await db.update(routineItems).set(body).where(eq(routineItems.id, id)).returning();
    if (!updated) throw new NotFoundError('Routine item not found');
    return updated;
  });

  app.delete('/routine-items/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [deleted] = await db.delete(routineItems).where(eq(routineItems.id, id)).returning();
    if (!deleted) throw new NotFoundError('Routine item not found');
    reply.code(204);
  });
}
