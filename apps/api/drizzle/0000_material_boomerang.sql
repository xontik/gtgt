CREATE TABLE `exercise_variations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_id` integer NOT NULL,
	`name` text NOT NULL,
	`difficulty_rank` integer NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`metric_type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `log_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variation_id` integer NOT NULL,
	`timestamp` integer NOT NULL,
	`value` real NOT NULL,
	`notes` text,
	FOREIGN KEY (`variation_id`) REFERENCES `exercise_variations`(`id`) ON UPDATE no action ON DELETE cascade
);
