import { z } from 'zod';

// Treat an empty string from a form field the same as "not set".
const optionalUrlSchema = z.preprocess(
  (v) => (v === '' ? null : v),
  z.string().url().nullable(),
);
const optionalTextSchema = z.preprocess((v) => (v === '' ? null : v), z.string().nullable());

export const exerciseVariationSchema = z.object({
  id: z.number().int().positive(),
  exerciseId: z.number().int().positive(),
  name: z.string().min(1),
  difficultyRank: z.number().int(),
  deletedAt: z.coerce.date().nullable(),
  parentVariationId: z.number().int().positive().nullable(),
  isFavorite: z.boolean(),
  imageUrl: optionalUrlSchema,
  notes: optionalTextSchema,
  videoUrl: optionalUrlSchema,
});
export type ExerciseVariation = z.infer<typeof exerciseVariationSchema>;

export const exerciseVariationInsertSchema = exerciseVariationSchema
  .omit({
    id: true,
    deletedAt: true,
    parentVariationId: true,
    isFavorite: true,
    imageUrl: true,
    notes: true,
    videoUrl: true,
  })
  .extend({
    parentVariationId: z.number().int().positive().nullable().optional().default(null),
    isFavorite: z.boolean().optional().default(false),
    imageUrl: optionalUrlSchema.optional().default(null),
    notes: optionalTextSchema.optional().default(null),
    videoUrl: optionalUrlSchema.optional().default(null),
  });
export type ExerciseVariationInsert = z.infer<typeof exerciseVariationInsertSchema>;

export const exerciseVariationUpdateSchema = exerciseVariationInsertSchema.partial();
export type ExerciseVariationUpdate = z.infer<typeof exerciseVariationUpdateSchema>;
