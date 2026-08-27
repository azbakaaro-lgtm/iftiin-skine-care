CREATE TABLE `storeDeliverySettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeAdminId` int NOT NULL,
	`deliveryEnabled` boolean NOT NULL DEFAULT false,
	`deliveryFee` int NOT NULL DEFAULT 0,
	`deliveryAreas` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeDeliverySettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `storeDeliverySettings_storeAdminId_unique` UNIQUE(`storeAdminId`)
);
--> statement-breakpoint
CREATE TABLE `storeProducts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeAdminId` int NOT NULL,
	`name` varchar(180) NOT NULL,
	`brand` varchar(160) NOT NULL,
	`imageUrl` text,
	`category` varchar(100) NOT NULL,
	`description` text,
	`originalPrice` int NOT NULL,
	`discountType` enum('none','percentage','fixed') NOT NULL DEFAULT 'none',
	`discountValue` int NOT NULL DEFAULT 0,
	`finalPrice` int NOT NULL,
	`stock` int NOT NULL DEFAULT 0,
	`availability` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeProducts_id` PRIMARY KEY(`id`)
);
