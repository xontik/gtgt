import { z } from 'zod';

export const exerciseCategorySchema = z.enum(['push', 'pull', 'squat', 'core', 'hold']);
export type ExerciseCategory = z.infer<typeof exerciseCategorySchema>;

export const metricTypeSchema = z.enum(['reps', 'time']);
export type MetricType = z.infer<typeof metricTypeSchema>;
