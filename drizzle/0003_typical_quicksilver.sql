CREATE TABLE `customerOrderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(180) NOT NULL,
	`brand` varchar(160) NOT NULL,
	`imageUrl` text,
	`originalPrice` int NOT NULL,
	`finalPrice` int NOT NULL,
	`quantity` int NOT NULL,
	`lineTotal` int NOT NULL,
	CONSTRAINT `customerOrderItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customerOrders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`storeAdminId` int NOT NULL,
	`status` enum('pending','confirmed','preparing','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`deliveryArea` varchar(255),
	`deliveryFee` int NOT NULL DEFAULT 0,
	`subtotal` int NOT NULL,
	`discount` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customerOrders_id` PRIMARY KEY(`id`)
);
