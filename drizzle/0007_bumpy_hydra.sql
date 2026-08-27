CREATE TABLE `customerSkinJourneys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`recommendedProductId` int NOT NULL,
	`answersJson` text NOT NULL,
	`visualJson` text,
	`status` enum('preview','unlocked') NOT NULL DEFAULT 'preview',
	`purchaseOrderId` int,
	`unlockedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerSkinJourneys_id` PRIMARY KEY(`id`),
	CONSTRAINT `customerSkinJourneys_purchaseOrderId_unique` UNIQUE(`purchaseOrderId`)
);
