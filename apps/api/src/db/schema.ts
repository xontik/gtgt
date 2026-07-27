import { sqliteTable, integer, text, real, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

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
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  parentVariationId: integer('parent_variation_id').references(
    (): AnySQLiteColumn => exerciseVariations.id,
    { onDelete: 'set null' },
  ),
  isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  imageUrl: text('image_url'),
  notes: text('notes'),
  videoUrl: text('video_url'),
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
