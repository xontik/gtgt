import type { FastifyInstance } from 'fastify';
import { and, eq, gte, lte } from 'drizzle-orm';
import { logEntryInsertSchema } from '@gtg/shared';
import { db } from '../db/client.js';
import { logEntries } from '../db/schema.js';

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
      .where(conditions.length ? and(...conditions) : undefined);
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
}
