PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exercise_variations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_id` integer NOT NULL,
	`name` text NOT NULL,
	`difficulty_rank` integer NOT NULL,
	`deleted_at` integer,
	`is_favorite` integer DEFAULT false NOT NULL,
	`image_url` text,
	`notes` text,
	`video_url` text,
	`target_value` real,
	`target_sets_per_day` integer,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_exercise_variations`("id", "exercise_id", "name", "difficulty_rank", "deleted_at", "is_favorite", "image_url", "notes", "video_url", "target_value", "target_sets_per_day") SELECT "id", "exercise_id", "name", "difficulty_rank", "deleted_at", "is_favorite", "image_url", "notes", "video_url", "target_value", "target_sets_per_day" FROM `exercise_variations`;--> statement-breakpoint
DROP TABLE `exercise_variations`;--> statement-breakpoint
ALTER TABLE `__new_exercise_variations` RENAME TO `exercise_variations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;