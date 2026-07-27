PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`metric_type` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_exercises`("id", "name", "category", "metric_type") SELECT "id", "name", "category", "metric_type" FROM `exercises`;--> statement-breakpoint
DROP TABLE `exercises`;--> statement-breakpoint
ALTER TABLE `__new_exercises` RENAME TO `exercises`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `exercise_variations` ADD `is_favorite` integer DEFAULT false NOT NULL;