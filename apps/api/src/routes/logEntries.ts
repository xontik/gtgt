import type { FastifyInstance } from 'fastify';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { logEntryInsertSchema, logEntryUpdateSchema } from '@gtg/shared';
import { db } from '../db/client.js';
import { logEntries } from '../db/schema.js';
import { NotFoundError } from '../lib/errors.js';

export async function logEntryRoutes(app: FastifyInstance) {
  app.get('/log-entries', async (req) => {
    const { variationId, since, until } = req.query as {
      variationId?: string;
      since?: string;
      until?: string;
    };

    const conditions = [];
    if (variationId) conditions.push(eq(logEntries.variationId, Number(variationId)));
    if (since) conditions.push(gte(logEntries.timestamp, new Date(since)));
    if (until) conditions.push(lte(logEntries.timestamp, new Date(until)));

    return db
      .select()
      .from(logEntries)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(logEntries.timestamp));
  });

  app.post('/log-entries', async (req, reply) => {
    const body = logEntryInsertSchema.parse(req.body);
    const [created] = await db
      .insert(logEntries)
      .values({ ...body, timestamp: body.timestamp ?? new Date() })
      .returning();
    reply.code(201);
    return created;
  });

  app.patch('/log-entries/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const body = logEntryUpdateSchema.parse(req.body);
    const [updated] = await db.update(logEntries).set(body).where(eq(logEntries.id, id)).returning();
    if (!updated) throw new NotFoundError('Log entry not found');
    return updated;
  });

  app.delete('/log-entries/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [deleted] = await db.delete(logEntries).where(eq(logEntries.id, id)).returning();
    if (!deleted) throw new NotFoundError('Log entry not found');
    reply.code(204);
  });
}
