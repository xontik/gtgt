import { z } from 'zod';
import { exerciseCategorySchema, metricTypeSchema } from './common.js';

export const exerciseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  category: exerciseCategorySchema,
  metricType: metricTypeSchema,
  activeVariationId: z.number().int().positive().nullable(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const exerciseInsertSchema = exerciseSchema
  .omit({ id: true, activeVariationId: true })
  .extend({ activeVariationId: z.number().int().positive().nullable().optional() });
export type ExerciseInsert = z.infer<typeof exerciseInsertSchema>;

export const exerciseUpdateSchema = exerciseInsertSchema.partial();
export type ExerciseUpdate = z.infer<typeof exerciseUpdateSchema>;
