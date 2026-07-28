import type { FastifyInstance } from 'fastify';
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
  // that relations (variation -> exercise, log entry -> variation) stay
  // intact.
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
        await tx.insert(exerciseVariations).values(backup.exerciseVariations);
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
  // history. isFavorite carries over so newly imported variations can show
  // up on Home right away. Exercises and variations that already exist
  // (matched by trimmed, case-insensitive name - same exercise for
  // exercises, same exercise for variations) are reused instead of
  // duplicated, so re-importing the same or an overlapping backup is a
  // no-op for those.
  app.post('/backup/import-structure', async (req) => {
    const backup = backupSchema.parse(req.body);

    const normalize = (name: string) => name.trim().toLowerCase();
    const variationKey = (exerciseId: number, name: string) => `${exerciseId}::${normalize(name)}`;

    const exerciseIdMap = new Map<number, number>();
    const variationIdMap = new Map<number, number>();
    let skippedExercises = 0;
    let skippedVariations = 0;

    await db.transaction(async (tx) => {
      const existingExercises = await tx.select().from(exercises);
      const exerciseByName = new Map(existingExercises.map((e) => [normalize(e.name), e]));

      for (const exercise of backup.exercises) {
        const key = normalize(exercise.name);
        const existing = exerciseByName.get(key);
        if (existing) {
          exerciseIdMap.set(exercise.id, existing.id);
          skippedExercises += 1;
          continue;
        }
        const [created] = await tx
          .insert(exercises)
          .values({ name: exercise.name, category: exercise.category, metricType: exercise.metricType })
          .returning();
        if (!created) continue;
        exerciseIdMap.set(exercise.id, created.id);
        exerciseByName.set(key, created);
      }

      const existingVariations = await tx.select().from(exerciseVariations);
      const variationByKey = new Map(
        existingVariations
          .filter((v) => v.deletedAt === null)
          .map((v) => [variationKey(v.exerciseId, v.name), v]),
      );

      const liveVariations = backup.exerciseVariations.filter((v) => v.deletedAt === null);

      for (const variation of liveVariations) {
        const newExerciseId = exerciseIdMap.get(variation.exerciseId);
        if (!newExerciseId) continue;

        const key = variationKey(newExerciseId, variation.name);
        const existing = variationByKey.get(key);
        if (existing) {
          variationIdMap.set(variation.id, existing.id);
          skippedVariations += 1;
          continue;
        }

        const [created] = await tx
          .insert(exerciseVariations)
          .values({
            exerciseId: newExerciseId,
            name: variation.name,
            difficultyRank: variation.difficultyRank,
            isFavorite: variation.isFavorite,
            imageUrl: variation.imageUrl,
            notes: variation.notes,
            videoUrl: variation.videoUrl,
            targetValue: variation.targetValue,
            targetSetsPerDay: variation.targetSetsPerDay,
          })
          .returning();
        if (!created) continue;
        variationIdMap.set(variation.id, created.id);
        variationByKey.set(key, created);
      }
    });

    return {
      importedExercises: exerciseIdMap.size - skippedExercises,
      importedVariations: variationIdMap.size - skippedVariations,
      skippedExercises,
      skippedVariations,
    };
  });
}
