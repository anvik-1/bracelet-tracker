ALTER TABLE `bracelets` ADD `status` enum('want_to_make','in_progress','completed','frogged','gifted') DEFAULT 'want_to_make' NOT NULL;--> statement-breakpoint
ALTER TABLE `bracelets` ADD `leftoverStringCm` float;--> statement-breakpoint
ALTER TABLE `thread_library` ADD `threadType` enum('regular','glitter','metallic','glow_in_dark','multicolor') DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE `thread_library` ADD `secondaryColors` json DEFAULT ('[]');