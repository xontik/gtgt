import { z } from 'zod';

export const exerciseVariationSchema = z.object({
  id: z.number().int().positive(),
  exerciseId: z.number().int().positive(),
  name: z.string().min(1),
  difficultyRank: z.number().int(),
  deletedAt: z.coerce.date().nullable(),
  parentVariationId: z.number().int().positive().nullable(),
});
export type ExerciseVariation = z.infer<typeof exerciseVariationSchema>;

export const exerciseVariationInsertSchema = exerciseVariationSchema
  .omit({
    id: true,
    deletedAt: true,
    parentVariationId: true,
  })
  .extend({
    parentVariationId: z.number().int().positive().nullable().optional().default(null),
  });
export type ExerciseVariationInsert = z.infer<typeof exerciseVariationInsertSchema>;

export const exerciseVariationUpdateSchema = exerciseVariationInsertSchema.partial();
export type ExerciseVariationUpdate = z.infer<typeof exerciseVariationUpdateSchema>;
