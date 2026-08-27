CREATE TABLE `commissionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentId` int NOT NULL,
	`orderId` int NOT NULL,
	`storeAdminId` int NOT NULL,
	`saleAmount` int NOT NULL,
	`commissionAmount` int NOT NULL,
	`storeEarnings` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commissionHistory_id` PRIMARY KEY(`id`),
	CONSTRAINT `commissionHistory_paymentId_unique` UNIQUE(`paymentId`)
);
--> statement-breakpoint
CREATE TABLE `orderPayments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`customerId` int NOT NULL,
	`storeAdminId` int NOT NULL,
	`method` enum('evc_plus','edahab','premier_wallet','merchant') NOT NULL,
	`receivingAccount` varchar(160) NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending_payment','sent_awaiting_confirmation','confirmed','rejected','failed') NOT NULL DEFAULT 'pending_payment',
	`submittedAt` timestamp,
	`confirmedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orderPayments_id` PRIMARY KEY(`id`),
	CONSTRAINT `orderPayments_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
CREATE TABLE `storePaymentSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`storeAdminId` int NOT NULL,
	`evcPlusAccount` varchar(120),
	`edahabAccount` varchar(120),
	`premierWalletAccount` varchar(120),
	`merchantAccount` varchar(160),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storePaymentSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `storePaymentSettings_storeAdminId_unique` UNIQUE(`storeAdminId`)
);
--> statement-breakpoint
CREATE TABLE `superAdminPaymentSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`superAdminId` int NOT NULL,
	`evcPlusAccount` varchar(120),
	`edahabAccount` varchar(120),
	`premierWalletAccount` varchar(120),
	`merchantAccount` varchar(160),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `superAdminPaymentSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `superAdminPaymentSettings_superAdminId_unique` UNIQUE(`superAdminId`)
);
