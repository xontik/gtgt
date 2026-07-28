import { z } from 'zod';
import { exerciseSchema } from './exercise.js';
import { exerciseVariationSchema } from './exerciseVariation.js';
import { logEntrySchema } from './logEntry.js';
import { routineSchema, routineItemSchema } from './routine.js';

// The DB returns `null` (not `undefined`) for an unset notes column, which
// logEntrySchema's `.optional()` doesn't accept as-is - a backup round-trips
// raw DB rows through JSON, so tolerate null here and normalize it away.
const backupLogEntrySchema = logEntrySchema.extend({
  notes: z
    .string()
    .min(1)
    .nullish()
    .transform((v) => v ?? undefined),
});

// Backups created before targetValue/targetSetsPerDay existed won't have
// those keys at all - tolerate that instead of failing to restore old files.
const backupExerciseVariationSchema = exerciseVariationSchema.extend({
  targetValue: z.number().positive().nullish().transform((v) => v ?? null),
  targetSetsPerDay: z.number().int().positive().nullish().transform((v) => v ?? null),
});

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.coerce.date(),
  exercises: z.array(exerciseSchema),
  exerciseVariations: z.array(backupExerciseVariationSchema),
  logEntries: z.array(backupLogEntrySchema),
  // Backups created before routines existed won't have these keys at all.
  routines: z.array(routineSchema).optional().default([]),
  routineItems: z.array(routineItemSchema).optional().default([]),
});
export type Backup = z.infer<typeof backupSchema>;
