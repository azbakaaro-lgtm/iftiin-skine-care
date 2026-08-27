import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const phaseOneAccounts = mysqlTable("phaseOneAccounts", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["super_admin", "store_admin", "customer"]).notNull(),
  status: mysqlEnum("status", ["pending", "active", "restricted", "suspended"]).default("active").notNull(),
  fullName: varchar("fullName", { length: 160 }).notNull(),
  storeName: varchar("storeName", { length: 160 }),
  phoneNumber: varchar("phoneNumber", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  username: varchar("username", { length: 80 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  location: varchar("location", { length: 255 }),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const storeProducts = mysqlTable("storeProducts", {
  id: int("id").autoincrement().primaryKey(),
  storeAdminId: int("storeAdminId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  brand: varchar("brand", { length: 160 }).notNull(),
  imageUrl: text("imageUrl"),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  originalPrice: int("originalPrice").notNull(),
  discountType: mysqlEnum("discountType", ["none", "percentage", "fixed"]).default("none").notNull(),
  discountValue: int("discountValue").default(0).notNull(),
  finalPrice: int("finalPrice").notNull(),
  stock: int("stock").default(0).notNull(),
  availability: boolean("availability").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storeDeliverySettings = mysqlTable("storeDeliverySettings", {
  id: int("id").autoincrement().primaryKey(),
  storeAdminId: int("storeAdminId").notNull().unique(),
  deliveryEnabled: boolean("deliveryEnabled").default(false).notNull(),
  deliveryFee: int("deliveryFee").default(0).notNull(),
  deliveryAreas: text("deliveryAreas"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const storePaymentSettings = mysqlTable("storePaymentSettings", {
  id: int("id").autoincrement().primaryKey(),
  storeAdminId: int("storeAdminId").notNull().unique(),
  evcPlusAccount: varchar("evcPlusAccount", { length: 120 }),
  edahabAccount: varchar("edahabAccount", { length: 120 }),
  premierWalletAccount: varchar("premierWalletAccount", { length: 120 }),
  merchantAccount: varchar("merchantAccount", { length: 160 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const superAdminPaymentSettings = mysqlTable("superAdminPaymentSettings", {
  id: int("id").autoincrement().primaryKey(),
  superAdminId: int("superAdminId").notNull().unique(),
  evcPlusAccount: varchar("evcPlusAccount", { length: 120 }),
  edahabAccount: varchar("edahabAccount", { length: 120 }),
  premierWalletAccount: varchar("premierWalletAccount", { length: 120 }),
  merchantAccount: varchar("merchantAccount", { length: 160 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customerOrders = mysqlTable("customerOrders", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  storeAdminId: int("storeAdminId").notNull(),
  status: mysqlEnum("status", ["pending", "payment_confirmed", "processing", "ready", "out_for_delivery", "delivered", "completed", "cancelled", "confirmed", "preparing"]).default("pending").notNull(),
  deliveryArea: varchar("deliveryArea", { length: 255 }),
  deliveryFee: int("deliveryFee").default(0).notNull(),
  subtotal: int("subtotal").notNull(),
  discount: int("discount").default(0).notNull(),
  total: int("total").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderStatusHistory = mysqlTable("orderStatusHistory", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  status: mysqlEnum("status", ["pending", "payment_confirmed", "processing", "ready", "out_for_delivery", "delivered", "completed", "cancelled", "confirmed", "preparing"]).notNull(),
  changedBy: mysqlEnum("changedBy", ["customer", "store_admin", "system"]).default("system").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const customerOrderItems = mysqlTable("customerOrderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 180 }).notNull(),
  brand: varchar("brand", { length: 160 }).notNull(),
  imageUrl: text("imageUrl"),
  originalPrice: int("originalPrice").notNull(),
  finalPrice: int("finalPrice").notNull(),
  quantity: int("quantity").notNull(),
  lineTotal: int("lineTotal").notNull(),
});

export const orderPayments = mysqlTable("orderPayments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  customerId: int("customerId").notNull(),
  storeAdminId: int("storeAdminId").notNull(),
  method: mysqlEnum("method", ["evc_plus", "edahab", "premier_wallet", "merchant"]).notNull(),
  receivingAccount: varchar("receivingAccount", { length: 160 }).notNull(),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["pending_payment", "sent_awaiting_confirmation", "confirmed", "rejected", "failed"]).default("pending_payment").notNull(),
  submittedAt: timestamp("submittedAt"),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const commissionHistory = mysqlTable("commissionHistory", {
  id: int("id").autoincrement().primaryKey(),
  paymentId: int("paymentId").notNull().unique(),
  orderId: int("orderId").notNull(),
  storeAdminId: int("storeAdminId").notNull(),
  saleAmount: int("saleAmount").notNull(),
  commissionAmount: int("commissionAmount").notNull(),
  storeEarnings: int("storeEarnings").notNull(),
  status: mysqlEnum("status", ["required", "commission_payment_sent", "paid", "rejected"]).default("paid").notNull(),
  method: mysqlEnum("method", ["evc_plus", "edahab", "premier_wallet", "merchant"]),
  receivingAccount: varchar("receivingAccount", { length: 160 }),
  receiptImageUrl: text("receiptImageUrl"),
  dueAt: timestamp("dueAt"),
  sentAt: timestamp("sentAt"),
  paidAt: timestamp("paidAt"),
  verifiedBy: int("verifiedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const customerSkinJourneys = mysqlTable("customerSkinJourneys", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  recommendedProductId: int("recommendedProductId").notNull(),
  answersJson: text("answersJson").notNull(),
  visualJson: text("visualJson"),
  status: mysqlEnum("status", ["preview", "unlocked"]).default("preview").notNull(),
  purchaseOrderId: int("purchaseOrderId").unique(),
  unlockedAt: timestamp("unlockedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const inAppNotifications = mysqlTable("inAppNotifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipientId").notNull(),
  orderId: int("orderId"),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PhaseOneAccount = typeof phaseOneAccounts.$inferSelect;
export type InsertPhaseOneAccount = typeof phaseOneAccounts.$inferInsert;
export type StoreProduct = typeof storeProducts.$inferSelect;
export type InsertStoreProduct = typeof storeProducts.$inferInsert;
export type StoreDeliverySettings = typeof storeDeliverySettings.$inferSelect;
export type InsertStoreDeliverySettings = typeof storeDeliverySettings.$inferInsert;
export type StorePaymentSettings = typeof storePaymentSettings.$inferSelect;
export type SuperAdminPaymentSettings = typeof superAdminPaymentSettings.$inferSelect;
export type CustomerOrder = typeof customerOrders.$inferSelect;
export type CustomerOrderItem = typeof customerOrderItems.$inferSelect;
export type OrderPayment = typeof orderPayments.$inferSelect;
export type CommissionHistory = typeof commissionHistory.$inferSelect;
export type CustomerSkinJourney = typeof customerSkinJourneys.$inferSelect;
export type InAppNotification = typeof inAppNotifications.$inferSelect;
