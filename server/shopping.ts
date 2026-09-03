import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { customerOrderItems, customerOrders, inAppNotifications, orderPayments, orderStatusHistory, phaseOneAccounts, storeDeliverySettings, storeProducts } from "../drizzle/schema";
import { getDb } from "./db";
import { createOrderPayment, getPaymentForOrder, paymentOptionsForStore, type PaymentMethod } from "./payments";
import { linkJourneyToOrder } from "./skin-journey";

export type OrderStatus = "pending" | "payment_confirmed" | "processing" | "ready" | "out_for_delivery" | "delivered" | "completed" | "cancelled" | "confirmed" | "preparing";
const validNext: Record<OrderStatus, OrderStatus[]> = { pending: ["payment_confirmed", "cancelled"], payment_confirmed: ["processing", "cancelled"], processing: ["ready", "cancelled"], ready: ["out_for_delivery", "cancelled"], out_for_delivery: ["delivered", "cancelled"], delivered: ["completed"], completed: [], cancelled: [], confirmed: ["processing", "cancelled"], preparing: ["ready", "cancelled"] };
export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus) { return validNext[current].includes(next); }
export function canCustomerCancelOrder(status: OrderStatus) { return status === "pending"; }
export function storeCanReceiveNewOrders(status: "pending" | "active" | "restricted" | "suspended" | undefined) { return status === "active"; }
export const statusLabels: Record<OrderStatus, string> = { pending: "Sugaya lacag-bixin", payment_confirmed: "Lacagta waa la xaqiijiyey", processing: "Hawlgal ayaa socda", ready: "Diyaar", out_for_delivery: "Wuxuu ku jiraa delivery", delivered: "La geeyey", completed: "Waa la dhammaystiray", cancelled: "La joojiyey", confirmed: "La xaqiijiyey (hore)", preparing: "Diyaar garow (hore)" };
async function addNotification(recipientId: number, orderId: number, title: string, body: string) { const db = await getDb(); if (!db) throw new Error("Kaydka xogta lama heli karo hadda."); await db.insert(inAppNotifications).values({ recipientId, orderId, title, body, isRead: false }); }

function productView(product: typeof storeProducts.$inferSelect, storeName: string | null) { return { ...product, storeName, originalPrice: Number(product.originalPrice), discountValue: Number(product.discountValue), finalPrice: Number(product.finalPrice), stock: Number(product.stock) }; }

export async function listActiveStores(search?: string) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const condition = search?.trim() ? and(eq(phaseOneAccounts.role, "store_admin"), eq(phaseOneAccounts.status, "active"), or(like(phaseOneAccounts.storeName, `%${search.trim()}%`), like(phaseOneAccounts.location, `%${search.trim()}%`))!) : and(eq(phaseOneAccounts.role, "store_admin"), eq(phaseOneAccounts.status, "active"));
  const stores = await db.select({ id: phaseOneAccounts.id, storeName: phaseOneAccounts.storeName, location: phaseOneAccounts.location, phoneNumber: phaseOneAccounts.phoneNumber }).from(phaseOneAccounts).where(condition).orderBy(desc(phaseOneAccounts.createdAt));
  return stores.map((store) => ({ ...store, storeName: store.storeName ?? "Dukaan" }));
}

export async function listCustomerProducts(storeAdminId: number, filters: { search?: string; category?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const conditions = [eq(storeProducts.storeAdminId, storeAdminId), eq(storeProducts.availability, true), eq(phaseOneAccounts.status, "active")];
  if (filters.category) conditions.push(eq(storeProducts.category, filters.category));
  if (filters.search?.trim()) { const q = `%${filters.search.trim()}%`; conditions.push(or(like(storeProducts.name, q), like(storeProducts.brand, q))!); }
  const rows = await db.select({ product: storeProducts, storeName: phaseOneAccounts.storeName }).from(storeProducts).innerJoin(phaseOneAccounts, eq(storeProducts.storeAdminId, phaseOneAccounts.id)).where(and(...conditions)).orderBy(desc(storeProducts.createdAt));
  return rows.map((row) => productView(row.product, row.storeName));
}

// Public browse feed for the pre-login landing page — no session required.
// Shows a handful of in-stock products across every active store.
export async function listFeaturedProducts(limit = 12) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const rows = await db.select({ product: storeProducts, storeName: phaseOneAccounts.storeName }).from(storeProducts).innerJoin(phaseOneAccounts, eq(storeProducts.storeAdminId, phaseOneAccounts.id)).where(and(eq(storeProducts.availability, true), eq(phaseOneAccounts.status, "active"))).orderBy(desc(storeProducts.createdAt)).limit(limit);
  return rows.map((row) => productView(row.product, row.storeName));
}

export async function customerProductDetail(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const rows = await db.select({ product: storeProducts, storeName: phaseOneAccounts.storeName, location: phaseOneAccounts.location }).from(storeProducts).innerJoin(phaseOneAccounts, eq(storeProducts.storeAdminId, phaseOneAccounts.id)).where(and(eq(storeProducts.id, productId), eq(storeProducts.availability, true), eq(phaseOneAccounts.status, "active"))).limit(1);
  if (!rows[0]) throw new Error("Product-kan hadda lama heli karo.");
  const delivery = await db.select().from(storeDeliverySettings).where(eq(storeDeliverySettings.storeAdminId, rows[0].product.storeAdminId)).limit(1);
  return { ...productView(rows[0].product, rows[0].storeName), storeLocation: rows[0].location, deliveryEnabled: delivery[0]?.deliveryEnabled ?? false, deliveryFee: Number(delivery[0]?.deliveryFee ?? 0), deliveryAreas: delivery[0]?.deliveryAreas ?? "" };
}

type CartLine = { productId: number; quantity: number };
export async function createCustomerOrder(customerId: number, lines: CartLine[], deliveryArea?: string | null, paymentMethod?: PaymentMethod, skinJourneyId?: number | null) {
  if (!lines.length) throw new Error("Cart-kaagu waa madhan yahay.");
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const productIds = [...new Set(lines.map((line) => line.productId))];
  if (!paymentMethod) throw new Error("Dooro habka lacag-bixinta.");
  if (productIds.length !== lines.length || lines.some((line) => line.quantity < 1 || line.quantity > 99)) throw new Error("Tirada product-yada ma saxna.");
  const products = await db.select().from(storeProducts).where(and(inArray(storeProducts.id, productIds), eq(storeProducts.availability, true)));
  if (products.length !== productIds.length) throw new Error("Qaar ka mid ah product-yada lama heli karo hadda.");
  const storeAdminId = products[0].storeAdminId;
  if (products.some((product) => product.storeAdminId !== storeAdminId)) throw new Error("Hal dalab wuxuu ka iman karaa hal dukaan oo keliya.");
  const store = (await db.select({ status: phaseOneAccounts.status }).from(phaseOneAccounts).where(and(eq(phaseOneAccounts.id, storeAdminId), eq(phaseOneAccounts.role, "store_admin"))).limit(1))[0];
  if (!storeCanReceiveNewOrders(store?.status)) throw new Error("Dukaankan hadda ma aqbalayo dalabyo cusub. Fadlan door dukaan kale.");
  const paymentAvailable = (await paymentOptionsForStore(storeAdminId)).some((option) => option.method === paymentMethod);
  if (!paymentAvailable) throw new Error("Habkan lacag-bixinta hadda laguma dejin dukaankan. Door hab kale.");
  const quantityByProduct = new Map(lines.map((line) => [line.productId, line.quantity]));
  for (const product of products) if ((quantityByProduct.get(product.id) ?? 0) > product.stock) throw new Error(`${product.name} stock ku filan ma laha.`);
  const delivery = (await db.select().from(storeDeliverySettings).where(eq(storeDeliverySettings.storeAdminId, storeAdminId)).limit(1))[0];
  let deliveryFee = 0;
  let savedArea: string | null = null;
  if (delivery?.deliveryEnabled) {
    const options = (delivery.deliveryAreas ?? "").split(",").map((area) => area.trim()).filter(Boolean);
    if (!deliveryArea || !options.includes(deliveryArea)) throw new Error("Dooro goob delivery oo sax ah.");
    deliveryFee = Number(delivery.deliveryFee);
    savedArea = deliveryArea;
  }
  const subtotal = products.reduce((total, product) => total + Number(product.originalPrice) * (quantityByProduct.get(product.id) ?? 0), 0);
  const productTotal = products.reduce((total, product) => total + Number(product.finalPrice) * (quantityByProduct.get(product.id) ?? 0), 0);
  const result = await db.insert(customerOrders).values({ customerId, storeAdminId, status: "pending", deliveryArea: savedArea, deliveryFee, subtotal, discount: subtotal - productTotal, total: productTotal + deliveryFee });
  const orderId = Number(result[0].insertId);
  if (skinJourneyId) await linkJourneyToOrder(customerId, skinJourneyId, orderId, productIds);
  await createOrderPayment({ orderId, customerId, storeAdminId, amount: productTotal + deliveryFee, method: paymentMethod });
  await db.insert(orderStatusHistory).values({ orderId, status: "pending", changedBy: "customer" });
  await db.insert(customerOrderItems).values(products.map((product) => { const quantity = quantityByProduct.get(product.id) ?? 0; return { orderId, productId: product.id, productName: product.name, brand: product.brand, imageUrl: product.imageUrl, originalPrice: Number(product.originalPrice), finalPrice: Number(product.finalPrice), quantity, lineTotal: Number(product.finalPrice) * quantity }; }));
  for (const product of products) { const quantity = quantityByProduct.get(product.id) ?? 0; await db.update(storeProducts).set({ stock: product.stock - quantity }).where(eq(storeProducts.id, product.id)); }
  await addNotification(storeAdminId, orderId, "Dalab cusub", `Dalab #${orderId} ayaa kasoo galay dukaankaaga.`);
  return customerSafeOrder(await orderDetail(orderId));
}

function mapOrder(order: typeof customerOrders.$inferSelect, customerName: string | null, storeName: string | null, items: Array<typeof customerOrderItems.$inferSelect>, history: Array<typeof orderStatusHistory.$inferSelect>, payment: typeof orderPayments.$inferSelect | null) { const timeline = history.length ? history : [{ id: 0, orderId: order.id, status: order.status, changedBy: "system" as const, createdAt: order.updatedAt }]; return { ...order, customerName, storeName, deliveryFee: Number(order.deliveryFee), subtotal: Number(order.subtotal), discount: Number(order.discount), total: Number(order.total), items: items.map((item) => ({ ...item, originalPrice: Number(item.originalPrice), finalPrice: Number(item.finalPrice), quantity: Number(item.quantity), lineTotal: Number(item.lineTotal) })), payment: payment ? { ...payment, amount: Number(payment.amount) } : null, timeline }; }
export function customerSafeOrder<T extends { payment: { receivingAccount: string } | null }>(order: T) { if (!order.payment) return order; const { receivingAccount: _receivingAccount, ...payment } = order.payment; return { ...order, payment }; }
export async function orderDetail(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const rows = await db.select({ order: customerOrders, customerName: phaseOneAccounts.fullName, storeName: phaseOneAccounts.storeName }).from(customerOrders).innerJoin(phaseOneAccounts, eq(customerOrders.customerId, phaseOneAccounts.id)).where(eq(customerOrders.id, orderId)).limit(1);
  if (!rows[0]) throw new Error("Dalabka lama helin.");
  const store = await db.select({ storeName: phaseOneAccounts.storeName }).from(phaseOneAccounts).where(eq(phaseOneAccounts.id, rows[0].order.storeAdminId)).limit(1);
  const items = await db.select().from(customerOrderItems).where(eq(customerOrderItems.orderId, orderId));
  const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(asc(orderStatusHistory.createdAt), asc(orderStatusHistory.id));
  const payment = await getPaymentForOrder(orderId);
  return mapOrder(rows[0].order, rows[0].customerName, store[0]?.storeName ?? null, items, history, payment);
}
async function ordersFor(where: ReturnType<typeof eq>) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const orders = await db.select().from(customerOrders).where(where).orderBy(desc(customerOrders.createdAt));
  const response = [];
  for (const order of orders) response.push(await orderDetail(order.id));
  return response;
}
export async function listCustomerOrders(customerId: number) { const orders = await ordersFor(eq(customerOrders.customerId, customerId)); return orders.map((order) => customerSafeOrder(order)); }
export const listStoreOrders = (storeAdminId: number) => ordersFor(eq(customerOrders.storeAdminId, storeAdminId));
export async function listAllOrders() { const db = await getDb(); if (!db) throw new Error("Kaydka xogta lama heli karo hadda."); const orders = await db.select().from(customerOrders).orderBy(desc(customerOrders.createdAt)); return Promise.all(orders.map((order) => orderDetail(order.id))); }
export async function orderDetailForAccount(accountId: number, role: "super_admin" | "store_admin" | "customer", orderId: number) { const db = await getDb(); if (!db) throw new Error("Kaydka xogta lama heli karo hadda."); if (role !== "super_admin") { const owned = (await db.select({ id: customerOrders.id }).from(customerOrders).where(and(eq(customerOrders.id, orderId), role === "customer" ? eq(customerOrders.customerId, accountId) : eq(customerOrders.storeAdminId, accountId))).limit(1))[0]; if (!owned) throw new Error("Dalabkan ma geli kartid."); } const detail = await orderDetail(orderId); return role === "customer" ? customerSafeOrder(detail) : detail; }
export async function updateStoreOrderStatus(storeAdminId: number, orderId: number, next: OrderStatus) { const db = await getDb(); if (!db) throw new Error("Kaydka xogta lama heli karo hadda."); const current = (await db.select().from(customerOrders).where(and(eq(customerOrders.id, orderId), eq(customerOrders.storeAdminId, storeAdminId))).limit(1))[0]; if (!current) throw new Error("Dalabkan ma laha dukaankaaga."); const payment = await getPaymentForOrder(orderId); if (next !== "cancelled" && payment && payment.status !== "confirmed") throw new Error("Marka hore xaqiiji lacag-bixinta dalabkan."); if (!canTransitionOrderStatus(current.status as OrderStatus, next)) throw new Error("Xaaladdan dalabka laguma beddeli karo hadda."); await db.update(customerOrders).set({ status: next }).where(eq(customerOrders.id, orderId)); await db.insert(orderStatusHistory).values({ orderId, status: next, changedBy: "store_admin" }); await addNotification(current.customerId, orderId, "Xaaladda dalabka waa is beddeshay", `Dalabkaaga #${orderId} hadda waa: ${statusLabels[next]}.`); return orderDetail(orderId); }
export async function cancelCustomerPendingOrder(customerId: number, orderId: number) { const db = await getDb(); if (!db) throw new Error("Kaydka xogta lama heli karo hadda."); const current = (await db.select().from(customerOrders).where(and(eq(customerOrders.id, orderId), eq(customerOrders.customerId, customerId))).limit(1))[0]; if (!current) throw new Error("Dalabkan adiga ma lihid."); if (!canCustomerCancelOrder(current.status as OrderStatus)) throw new Error("Waxaad joojin kartaa oo keliya dalab sugaya."); const items = await db.select().from(customerOrderItems).where(eq(customerOrderItems.orderId, orderId)); await db.update(customerOrders).set({ status: "cancelled" }).where(eq(customerOrders.id, orderId)); await db.insert(orderStatusHistory).values({ orderId, status: "cancelled", changedBy: "customer" }); for (const item of items) { const product = (await db.select().from(storeProducts).where(eq(storeProducts.id, item.productId)).limit(1))[0]; if (product) await db.update(storeProducts).set({ stock: product.stock + item.quantity }).where(eq(storeProducts.id, product.id)); } await addNotification(current.storeAdminId, orderId, "Dalab la joojiyey", `Customer-ku wuxuu joojiyey dalab #${orderId}.`); return customerSafeOrder(await orderDetail(orderId)); }
export async function listInAppNotifications(recipientId: number) { const db = await getDb(); if (!db) throw new Error("Kaydka xogta lama heli karo hadda."); return db.select().from(inAppNotifications).where(eq(inAppNotifications.recipientId, recipientId)).orderBy(desc(inAppNotifications.createdAt)); }
export async function markNotificationRead(recipientId: number, notificationId: number) { const db = await getDb(); if (!db) throw new Error("Kaydka xogta lama heli karo hadda."); await db.update(inAppNotifications).set({ isRead: true }).where(and(eq(inAppNotifications.id, notificationId), eq(inAppNotifications.recipientId, recipientId))); }
export async function notificationSummary(recipientId: number) { const notifications = await listInAppNotifications(recipientId); return { unreadCount: notifications.filter((notice) => !notice.isRead).length }; }
export async function markAllNotificationsRead(recipientId: number) { const db = await getDb(); if (!db) throw new Error("Kaydka xogta lama heli karo hadda."); await db.update(inAppNotifications).set({ isRead: true }).where(and(eq(inAppNotifications.recipientId, recipientId), eq(inAppNotifications.isRead, false))); return { success: true } as const; }
