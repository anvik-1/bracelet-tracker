CREATE TABLE `bracelets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`patternName` varchar(255),
	`patternNumber` varchar(100),
	`patternUrl` text,
	`colors` json DEFAULT ('[]'),
	`materials` varchar(500),
	`dateMade` timestamp,
	`timeTakenMinutes` int,
	`difficulty` enum('beginner','easy','medium','hard','expert'),
	`notes` text,
	`rating` int,
	`outcome` enum('perfect','good','okay','needs_improvement','failed'),
	`photoUrl` text,
	`photoKey` varchar(500),
	`finalLengthCm` float,
	`stringLengthCm` float,
	`numberOfStrings` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bracelets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thread_library` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`colorName` varchar(100) NOT NULL,
	`colorHex` varchar(7) NOT NULL,
	`brand` varchar(100),
	`colorCode` varchar(50),
	`quantity` int DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `thread_library_id` PRIMARY KEY(`id`)
);
