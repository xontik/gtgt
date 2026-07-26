import { z } from 'zod';

export const exerciseVariationSchema = z.object({
  id: z.number().int().positive(),
  exerciseId: z.number().int().positive(),
  name: z.string().min(1),
  difficultyRank: z.number().int(),
});
export type ExerciseVariation = z.infer<typeof exerciseVariationSchema>;

export const exerciseVariationInsertSchema = exerciseVariationSchema.omit({ id: true });
export type ExerciseVariationInsert = z.infer<typeof exerciseVariationInsertSchema>;
