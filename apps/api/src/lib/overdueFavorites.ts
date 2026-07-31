import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { exercises, exerciseVariations, logEntries } from '../db/schema.js';

export interface OverdueFavorite {
  variationId: number;
  exerciseName: string;
  variationName: string;
  metricType: 'reps' | 'time';
  lastLoggedAt: Date | null;
  lastValue: number | null;
}

// Shared by the Discord idle reminder and the TRMNL dashboard route - both
// want the same thing: favorited variations ranked by how overdue they are
// (oldest last-logged first, never-logged counts as maximally overdue).
export async function getOverdueFavorites(limit: number): Promise<OverdueFavorite[]> {
  const favorites = await db
    .select({ variation: exerciseVariations, exercise: exercises })
    .from(exerciseVariations)
    .innerJoin(exercises, eq(exerciseVariations.exerciseId, exercises.id))
    .where(and(eq(exerciseVariations.isFavorite, true), isNull(exerciseVariations.deletedAt)));

  const lastEntryByVariation = new Map<number, { timestamp: Date; value: number }>();
  for (const { variation } of favorites) {
    const [lastEntry] = await db
      .select({ timestamp: logEntries.timestamp, value: logEntries.value })
      .from(logEntries)
      .where(eq(logEntries.variationId, variation.id))
      .orderBy(desc(logEntries.timestamp))
      .limit(1);
    if (lastEntry) lastEntryByVariation.set(variation.id, lastEntry);
  }

  return favorites
    .map(({ variation, exercise }) => {
      const last = lastEntryByVariation.get(variation.id);
      return {
        variationId: variation.id,
        exerciseName: exercise.name,
        variationName: variation.name,
        metricType: exercise.metricType,
        lastLoggedAt: last?.timestamp ?? null,
        lastValue: last?.value ?? null,
      };
    })
    .sort((a, b) => (a.lastLoggedAt?.getTime() ?? 0) - (b.lastLoggedAt?.getTime() ?? 0))
    .slice(0, limit);
}
