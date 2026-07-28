import { z } from 'zod';

export const routineSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
});
export type Routine = z.infer<typeof routineSchema>;

export const routineInsertSchema = routineSchema.omit({ id: true });
export type RoutineInsert = z.infer<typeof routineInsertSchema>;

export const routineUpdateSchema = routineInsertSchema.partial();
export type RoutineUpdate = z.infer<typeof routineUpdateSchema>;

export const routineItemSchema = z.object({
  id: z.number().int().positive(),
  routineId: z.number().int().positive(),
  variationId: z.number().int().positive(),
  order: z.number().int(),
  targetValue: z.number().positive().nullable(),
});
export type RoutineItem = z.infer<typeof routineItemSchema>;

export const routineItemInsertSchema = routineItemSchema.omit({ id: true }).extend({
  targetValue: z.number().positive().nullable().optional().default(null),
});
export type RoutineItemInsert = z.infer<typeof routineItemInsertSchema>;

export const routineItemUpdateSchema = routineItemInsertSchema.partial();
export type RoutineItemUpdate = z.infer<typeof routineItemUpdateSchema>;
