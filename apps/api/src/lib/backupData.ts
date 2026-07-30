import { db } from '../db/client.js';
import { exercises, exerciseVariations, logEntries, routines, routineItems } from '../db/schema.js';

// Not typed as `Backup` (the Zod-inferred type) on purpose - that type
// expects logEntry.notes as `string | undefined`, but the DB genuinely
// returns `null` for unset notes; backupSchema already tolerates both on
// the way back in (see packages/shared/src/schemas/backup.ts).
export async function buildBackupPayload() {
  const [allExercises, allVariations, allLogEntries, allRoutines, allRoutineItems] = await Promise.all([
    db.select().from(exercises),
    db.select().from(exerciseVariations),
    db.select().from(logEntries),
    db.select().from(routines),
    db.select().from(routineItems),
  ]);

  return {
    version: 1,
    exportedAt: new Date(),
    exercises: allExercises,
    exerciseVariations: allVariations,
    logEntries: allLogEntries,
    routines: allRoutines,
    routineItems: allRoutineItems,
  };
}
