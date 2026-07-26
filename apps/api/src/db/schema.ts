import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';

export const exercises = sqliteTable('exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category', { enum: ['push', 'pull', 'squat', 'core', 'hold'] }).notNull(),
  metricType: text('metric_type', { enum: ['reps', 'time'] }).notNull(),
});

export const exerciseVariations = sqliteTable('exercise_variations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exerciseId: integer('exercise_id')
    .notNull()
    .references(() => exercises.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  difficultyRank: integer('difficulty_rank').notNull(),
});

export const logEntries = sqliteTable('log_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  variationId: integer('variation_id')
    .notNull()
    .references(() => exerciseVariations.id, { onDelete: 'cascade' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  value: real('value').notNull(),
  notes: text('notes'),
});
