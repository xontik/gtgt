import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import {
  exerciseVariationInsertSchema,
  exerciseVariationUpdateSchema,
} from '@gtg/shared';
import { db } from '../db/client.js';
import { exerciseVariations } from '../db/schema.js';
import { NotFoundError } from '../lib/errors.js';

export async function exerciseVariationRoutes(app: FastifyInstance) {
  app.get('/variations', async (req) => {
    const { exerciseId } = req.query as { exerciseId?: string };
    if (exerciseId) {
      return db
        .select()
        .from(exerciseVariations)
        .where(eq(exerciseVariations.exerciseId, Number(exerciseId)));
    }
    return db.select().from(exerciseVariations);
  });

  app.get('/variations/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const [variation] = await db
      .select()
      .from(exerciseVariations)
      .where(eq(exerciseVariations.id, id));
    if (!variation) throw new NotFoundError('Variation not found');
    return variation;
  });

  app.post('/variations', async (req, reply) => {
    const body = exerciseVariationInsertSchema.parse(req.body);
    const [created] = await db.insert(exerciseVariations).values(body).returning();
    reply.code(201);
    return created;
  });

  app.patch('/variations/:id', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const body = exerciseVariationUpdateSchema.parse(req.body);
    const [updated] = await db
      .update(exerciseVariations)
      .set(body)
      .where(eq(exerciseVariations.id, id))
      .returning();
    if (!updated) throw new NotFoundError('Variation not found');
    return updated;
  });

  app.post('/variations/:id/restore', async (req) => {
    const id = Number((req.params as { id: string }).id);
    const [restored] = await db
      .update(exerciseVariations)
      .set({ deletedAt: null })
      .where(eq(exerciseVariations.id, id))
      .returning();
    if (!restored) throw new NotFoundError('Variation not found');
    return restored;
  });

  app.delete('/variations/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const [deleted] = await db
      .update(exerciseVariations)
      .set({ deletedAt: new Date() })
      .where(eq(exerciseVariations.id, id))
      .returning();
    if (!deleted) throw new NotFoundError('Variation not found');
    await db
      .update(exerciseVariations)
      .set({ parentVariationId: deleted.parentVariationId })
      .where(eq(exerciseVariations.parentVariationId, id));
    reply.code(204);
  });
}
