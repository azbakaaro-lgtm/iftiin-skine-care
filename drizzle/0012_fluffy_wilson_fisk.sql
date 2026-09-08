ALTER TABLE `phaseOneAccounts` ADD `resetToken` varchar(128);--> statement-breakpoint
ALTER TABLE `phaseOneAccounts` ADD `resetTokenExpiresAt` timestamp;