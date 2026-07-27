import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { backupSchema } from '@gtg/shared';
import { db } from '../db/client.js';
import { exercises, exerciseVariations, logEntries } from '../db/schema.js';

export async function backupRoutes(app: FastifyInstance) {
  app.get('/backup', async () => {
    const [allExercises, allVariations, allLogEntries] = await Promise.all([
      db.select().from(exercises),
      db.select().from(exerciseVariations),
      db.select().from(logEntries),
    ]);

    return {
      version: 1,
      exportedAt: new Date(),
      exercises: allExercises,
      exerciseVariations: allVariations,
      logEntries: allLogEntries,
    };
  });

  // Wipes the database and replaces it with the backup, preserving ids so
  // that relations (variation -> exercise, variation -> parent, log entry ->
  // variation) stay intact.
  app.post('/backup/restore', async (req) => {
    const backup = backupSchema.parse(req.body);

    await db.transaction(async (tx) => {
      await tx.delete(logEntries);
      await tx.delete(exerciseVariations);
      await tx.delete(exercises);

      if (backup.exercises.length > 0) {
        await tx.insert(exercises).values(backup.exercises);
      }
      if (backup.exerciseVariations.length > 0) {
        await tx.insert(exerciseVariations).values(
          backup.exerciseVariations.map((v) => ({ ...v, parentVariationId: null })),
        );
        for (const v of backup.exerciseVariations) {
          if (v.parentVariationId !== null) {
            await tx
              .update(exerciseVariations)
              .set({ parentVariationId: v.parentVariationId })
              .where(eq(exerciseVariations.id, v.id));
          }
        }
      }
      if (backup.logEntries.length > 0) {
        await tx.insert(logEntries).values(backup.logEntries);
      }
    });

    return { restored: true };
  });

  // Imports only the exercise/variation structure from a backup file, as new
  // rows (new ids), skipping soft-deleted variations and log entries -
  // useful for trying out a different exercise setup without carrying over
  // history.
  app.post('/backup/import-structure', async (req) => {
    const backup = backupSchema.parse(req.body);

    const exerciseIdMap = new Map<number, number>();
    const variationIdMap = new Map<number, number>();

    await db.transaction(async (tx) => {
      for (const exercise of backup.exercises) {
        const [created] = await tx
          .insert(exercises)
          .values({ name: exercise.name, category: exercise.category, metricType: exercise.metricType })
          .returning();
        if (created) exerciseIdMap.set(exercise.id, created.id);
      }

      const liveVariations = backup.exerciseVariations.filter((v) => v.deletedAt === null);
      for (const variation of liveVariations) {
        const newExerciseId = exerciseIdMap.get(variation.exerciseId);
        if (!newExerciseId) continue;
        const [created] = await tx
          .insert(exerciseVariations)
          .values({
            exerciseId: newExerciseId,
            name: variation.name,
            difficultyRank: variation.difficultyRank,
            parentVariationId: null,
            isFavorite: false,
          })
          .returning();
        if (created) variationIdMap.set(variation.id, created.id);
      }

      for (const variation of liveVariations) {
        if (variation.parentVariationId === null) continue;
        const newId = variationIdMap.get(variation.id);
        const newParentId = variationIdMap.get(variation.parentVariationId);
        if (!newId || !newParentId) continue;
        await tx
          .update(exerciseVariations)
          .set({ parentVariationId: newParentId })
          .where(eq(exerciseVariations.id, newId));
      }
    });

    return {
      importedExercises: exerciseIdMap.size,
      importedVariations: variationIdMap.size,
    };
  });
}
