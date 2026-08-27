ALTER TABLE `phaseOneAccounts` MODIFY COLUMN `status` enum('pending','active','restricted','suspended') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `commissionHistory` ADD `status` enum('required','commission_payment_sent','paid','rejected') DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE `commissionHistory` ADD `method` enum('evc_plus','edahab','premier_wallet','merchant');--> statement-breakpoint
ALTER TABLE `commissionHistory` ADD `receivingAccount` varchar(160);--> statement-breakpoint
ALTER TABLE `commissionHistory` ADD `sentAt` timestamp;--> statement-breakpoint
ALTER TABLE `commissionHistory` ADD `paidAt` timestamp;--> statement-breakpoint
ALTER TABLE `commissionHistory` ADD `verifiedBy` int;