// One-off data fix: difficultyRank used to be scoped per sibling-group
// under a parentVariationId, so most variations that were never branched
// ended up with rank 1 (or 2) regardless of how many siblings they actually
// had once parenting was removed. Renumbers each exercise's variations
// sequentially (1..N) ordered by their current rank then id - id order
// matches creation/import order, which for unbranched data is the only
// signal left of the intended sequence. Safe to re-run (idempotent: a
// second run just reassigns the same order to the same 1..N sequence).
import { asc, eq } from 'drizzle-orm';
import { db } from '../src/db/client.js';
import { exercises, exerciseVariations } from '../src/db/schema.js';

async function run() {
  const allExercises = await db.select().from(exercises);
  let updatedCount = 0;

  for (const exercise of allExercises) {
    const variations = await db
      .select()
      .from(exerciseVariations)
      .where(eq(exerciseVariations.exerciseId, exercise.id))
      .orderBy(asc(exerciseVariations.difficultyRank), asc(exerciseVariations.id));

    for (let i = 0; i < variations.length; i++) {
      const variation = variations[i]!;
      const newRank = i + 1;
      if (variation.difficultyRank !== newRank) {
        await db
          .update(exerciseVariations)
          .set({ difficultyRank: newRank })
          .where(eq(exerciseVariations.id, variation.id));
        updatedCount += 1;
      }
    }
  }

  console.log(`Backfilled difficultyRank for ${updatedCount} variation(s) across ${allExercises.length} exercise(s).`);
}

run();
