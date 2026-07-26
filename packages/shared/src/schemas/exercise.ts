import { z } from 'zod';
import { exerciseCategorySchema, metricTypeSchema } from './common.js';

export const exerciseSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  category: exerciseCategorySchema,
  metricType: metricTypeSchema,
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const exerciseInsertSchema = exerciseSchema.omit({ id: true });
export type ExerciseInsert = z.infer<typeof exerciseInsertSchema>;
