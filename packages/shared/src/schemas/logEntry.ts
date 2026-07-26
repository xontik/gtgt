import { z } from 'zod';

export const logEntrySchema = z.object({
  id: z.number().int().positive(),
  variationId: z.number().int().positive(),
  timestamp: z.coerce.date(),
  value: z.number().positive(),
  notes: z.string().min(1).optional(),
});
export type LogEntry = z.infer<typeof logEntrySchema>;

export const logEntryInsertSchema = logEntrySchema.omit({ id: true, timestamp: true }).extend({
  timestamp: z.coerce.date().optional(),
});
export type LogEntryInsert = z.infer<typeof logEntryInsertSchema>;
