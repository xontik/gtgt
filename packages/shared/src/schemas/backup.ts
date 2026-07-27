import { z } from 'zod';
import { exerciseSchema } from './exercise.js';
import { exerciseVariationSchema } from './exerciseVariation.js';
import { logEntrySchema } from './logEntry.js';

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

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.coerce.date(),
  exercises: z.array(exerciseSchema),
  exerciseVariations: z.array(exerciseVariationSchema),
  logEntries: z.array(backupLogEntrySchema),
});
export type Backup = z.infer<typeof backupSchema>;
