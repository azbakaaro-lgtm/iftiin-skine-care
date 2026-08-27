import { and, desc, eq, inArray } from "drizzle-orm";
import { commissionHistory, customerOrders, inAppNotifications, orderPayments, orderStatusHistory, phaseOneAccounts, storePaymentSettings, superAdminPaymentSettings } from "../drizzle/schema";
import { getDb } from "./db";
import { unlockSkinJourneyForOrder } from "./skin-journey";
import { storagePut } from "./storage";

export type PaymentAccountInput = { evcPlusAccount?: string | null; edahabAccount?: string | null; premierWalletAccount?: string | null; merchantAccount?: string | null };
export type PaymentMethod = "evc_plus" | "edahab" | "premier_wallet" | "merchant";
export type PaymentStatus = "pending_payment" | "sent_awaiting_confirmation" | "confirmed" | "rejected" | "failed";
export type CommissionStatus = "required" | "commission_payment_sent" | "paid" | "rejected";
const paymentLabels: Record<PaymentMethod, string> = { evc_plus: "EVC Plus", edahab: "eDahab", premier_wallet: "Premier Wallet", merchant: "Merchant" };
const COMMISSION_DUE_DAYS = 3;
export function commissionRequiresRestriction(status: CommissionStatus) { return status !== "paid"; }
export function canStoreSubmitCommission(status: CommissionStatus) { return status === "required" || status === "rejected"; }
export function canReactivateStore(commissionStatuses: CommissionStatus[]) { return commissionStatuses.every((status) => status === "paid"); }
export function commissionDueDate(from = new Date()) { return new Date(from.getTime() + COMMISSION_DUE_DAYS * 24 * 60 * 60 * 1000); }
export function commissionReminder(status: CommissionStatus, dueAt: Date | null, now = new Date()) { if (status === "paid") return "Commission-ka waa la bixiyey."; if (!dueAt) return "Commission payment is required."; const days = Math.ceil((dueAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)); return days < 0 ? `Commission-ku wuu dhacay ${Math.abs(days)} maalmood ka hor.` : days === 0 ? "Commission-ku maanta ayuu dhacayaa." : `Commission-ka wuxuu dhacayaa ${days} maalmood gudahood.`; }

function cleaned(input: PaymentAccountInput) {
  return {
    evcPlusAccount: input.evcPlusAccount?.trim() || null,
    edahabAccount: input.edahabAccount?.trim() || null,
    premierWalletAccount: input.premierWalletAccount?.trim() || null,
    merchantAccount: input.merchantAccount?.trim() || null,
  };
}

function ensurePaymentAccount(input: ReturnType<typeof cleaned>) {
  if (!input.evcPlusAccount && !input.edahabAccount && !input.premierWalletAccount && !input.merchantAccount) throw new Error("Ku dar ugu yaraan hal akoon oo lacag lagu helo.");
}

export async function getStorePaymentSettings(storeAdminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const settings = await db.select().from(storePaymentSettings).where(eq(storePaymentSettings.storeAdminId, storeAdminId)).limit(1);
  return settings[0] ?? { id: 0, storeAdminId, evcPlusAccount: null, edahabAccount: null, premierWalletAccount: null, merchantAccount: null, updatedAt: new Date() };
}

export async function saveStorePaymentSettings(storeAdminId: number, input: PaymentAccountInput) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const values = cleaned(input);
  ensurePaymentAccount(values);
  await db.insert(storePaymentSettings).values({ storeAdminId, ...values }).onDuplicateKeyUpdate({ set: values });
  return getStorePaymentSettings(storeAdminId);
}

export async function getSuperAdminPaymentSettings(superAdminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const settings = await db.select().from(superAdminPaymentSettings).where(eq(superAdminPaymentSettings.superAdminId, superAdminId)).limit(1);
  return settings[0] ?? { id: 0, superAdminId, evcPlusAccount: null, edahabAccount: null, premierWalletAccount: null, merchantAccount: null, updatedAt: new Date() };
}

export async function saveSuperAdminPaymentSettings(superAdminId: number, input: PaymentAccountInput) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const values = cleaned(input);
  ensurePaymentAccount(values);
  await db.insert(superAdminPaymentSettings).values({ superAdminId, ...values }).onDuplicateKeyUpdate({ set: values });
  return getSuperAdminPaymentSettings(superAdminId);
}

function accountForMethod(settings: PaymentAccountInput, method: PaymentMethod) {
  const accounts: Record<PaymentMethod, string | null | undefined> = { evc_plus: settings.evcPlusAccount, edahab: settings.edahabAccount, premier_wallet: settings.premierWalletAccount, merchant: settings.merchantAccount };
  return accounts[method]?.trim() || null;
}

export function commissionBreakdown(saleAmount: number) {
  const normalized = Math.max(0, Math.round(saleAmount));
  const commissionAmount = Math.round(normalized * 0.05);
  return { saleAmount: normalized, commissionAmount, storeEarnings: normalized - commissionAmount };
}

async function notify(recipientId: number, orderId: number, title: string, body: string) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  await db.insert(inAppNotifications).values({ recipientId, orderId, title, body, isRead: false });
}

export async function paymentOptionsForStore(storeAdminId: number) {
  const settings = await getStorePaymentSettings(storeAdminId);
  return (Object.keys(paymentLabels) as PaymentMethod[]).flatMap((method) => {
    const account = accountForMethod(settings, method);
    return account ? [{ method, label: paymentLabels[method] }] : [];
  });
}

async function superAdminAccount() {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  return (await db.select().from(phaseOneAccounts).where(eq(phaseOneAccounts.role, "super_admin")).limit(1))[0] ?? null;
}

async function superAdminCommissionOptions() {
  const admin = await superAdminAccount();
  if (!admin) throw new Error("Akoonka Super Admin lama helin.");
  const settings = await getSuperAdminPaymentSettings(admin.id);
  return (Object.keys(paymentLabels) as PaymentMethod[]).flatMap((method) => {
    const account = accountForMethod(settings, method);
    return account ? [{ method, label: paymentLabels[method], account }] : [];
  });
}

export async function commissionSummaryForStore(storeAdminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const commissions = await db.select().from(commissionHistory).where(eq(commissionHistory.storeAdminId, storeAdminId)).orderBy(desc(commissionHistory.createdAt));
  const paymentOptions = await superAdminCommissionOptions();
  return {
    commissions: commissions.map((item) => ({ ...item, saleAmount: Number(item.saleAmount), commissionAmount: Number(item.commissionAmount), storeEarnings: Number(item.storeEarnings), reminder: commissionReminder(item.status, item.dueAt) })),
    paymentOptions,
    restricted: commissions.some((item) => commissionRequiresRestriction(item.status)),
  };
}

async function applyRestrictionForOutstandingCommission(storeAdminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  await db.update(phaseOneAccounts).set({ status: "restricted" }).where(and(eq(phaseOneAccounts.id, storeAdminId), eq(phaseOneAccounts.role, "store_admin"), eq(phaseOneAccounts.status, "active")));
}

async function reactivateStoreWhenCommissionClear(storeAdminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const commissions = await db.select({ status: commissionHistory.status }).from(commissionHistory).where(eq(commissionHistory.storeAdminId, storeAdminId));
  if (canReactivateStore(commissions.map((commission) => commission.status))) {
    await db.update(phaseOneAccounts).set({ status: "active" }).where(and(eq(phaseOneAccounts.id, storeAdminId), eq(phaseOneAccounts.role, "store_admin"), eq(phaseOneAccounts.status, "restricted")));
  }
}

async function uploadCommissionReceipt(storeAdminId: number, commissionId: number, imageData?: string | null) {
  if (!imageData) return null;
  const match = imageData.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);
  if (!match) throw new Error("Receipt-ka sawirkiisu ma saxna.");
  const extension = match[1] === "png" ? "png" : "jpg";
  const contentType = extension === "png" ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 850_000) throw new Error("Receipt-ku aad buu u weyn yahay. Dooro sawir ka yar.");
  return (await storagePut(`commission-receipts/${storeAdminId}/commission-${commissionId}-${Date.now()}.${extension}`, buffer, contentType)).url;
}

export async function submitCommissionPayment(storeAdminId: number, commissionId: number, method: PaymentMethod, receiptImageData?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const commission = (await db.select().from(commissionHistory).where(and(eq(commissionHistory.id, commissionId), eq(commissionHistory.storeAdminId, storeAdminId))).limit(1))[0];
  if (!commission) throw new Error("Commission-kan ma laha dukaankaaga.");
  if (!canStoreSubmitCommission(commission.status)) throw new Error("Commission-kan lama diri karo xaaladdiisa hadda.");
  const selected = (await superAdminCommissionOptions()).find((option) => option.method === method);
  if (!selected) throw new Error("Habkan lacag-bixinta Super Admin kama dejin.");
  const admin = await superAdminAccount();
  if (!admin) throw new Error("Akoonka Super Admin lama helin.");
  const receiptImageUrl = await uploadCommissionReceipt(storeAdminId, commission.id, receiptImageData);
  await db.update(commissionHistory).set({ status: "commission_payment_sent", method, receivingAccount: selected.account, receiptImageUrl: receiptImageUrl ?? commission.receiptImageUrl, sentAt: new Date(), paidAt: null, verifiedBy: null }).where(eq(commissionHistory.id, commission.id));
  await notify(admin.id, commission.orderId, "Commission sugaysa xaqiijin", `${commission.commissionAmount} commission oo dukaanka #${storeAdminId} uu diray ayaa sugaysa xaqiijin.`);
  return (await db.select().from(commissionHistory).where(eq(commissionHistory.id, commission.id)).limit(1))[0];
}

export async function reviewCommissionPayment(superAdminId: number, commissionId: number, next: Extract<CommissionStatus, "paid" | "rejected">) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const commission = (await db.select().from(commissionHistory).where(eq(commissionHistory.id, commissionId)).limit(1))[0];
  if (!commission) throw new Error("Commission-ka lama helin.");
  if (commission.status !== "commission_payment_sent") throw new Error("Waxaad qiimeyn kartaa oo keliya commission sugaysa xaqiijin.");
  await db.update(commissionHistory).set({ status: next, paidAt: next === "paid" ? new Date() : null, verifiedBy: superAdminId }).where(eq(commissionHistory.id, commissionId));
  if (next === "paid") {
    await reactivateStoreWhenCommissionClear(commission.storeAdminId);
    await notify(commission.storeAdminId, commission.orderId, "Commission-ka waa la xaqiijiyey", "Commission-kaaga waa la helay. Haddii commission kale oo sugaysa uusan jirin, dukaankaagu hadda wuu aqbali karaa dalabyo cusub.");
  } else {
    await notify(commission.storeAdminId, commission.orderId, "Commission-ka lama xaqiijin", "Commission-ka lama helin. Dukaankaagu wuxuu ahaanayaa Restricted ilaa aad dib u dirto oo la xaqiijiyo.");
  }
  return (await db.select().from(commissionHistory).where(eq(commissionHistory.id, commissionId)).limit(1))[0];
}

export async function createOrderPayment(input: { orderId: number; customerId: number; storeAdminId: number; amount: number; method: PaymentMethod }) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const settings = await getStorePaymentSettings(input.storeAdminId);
  const receivingAccount = accountForMethod(settings, input.method);
  if (!receivingAccount) throw new Error(`${paymentLabels[input.method]} laguma dejin dukaankan. Dooro hab kale ama la xiriir dukaanka.`);
  await db.insert(orderPayments).values({ ...input, amount: Math.max(0, Math.round(input.amount)), receivingAccount, status: "pending_payment" });
  return (await db.select().from(orderPayments).where(eq(orderPayments.orderId, input.orderId)).limit(1))[0];
}

export async function getPaymentForOrder(orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  return (await db.select().from(orderPayments).where(eq(orderPayments.orderId, orderId)).limit(1))[0] ?? null;
}

export async function markCustomerPaymentSent(customerId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const payment = (await db.select().from(orderPayments).where(and(eq(orderPayments.orderId, orderId), eq(orderPayments.customerId, customerId))).limit(1))[0];
  if (!payment) throw new Error("Lacag-bixintan adiga ma lihid.");
  if (payment.status !== "pending_payment") throw new Error("Lacag-bixintan mar hore ayaa loo gudbiyey ama loo qiimeeyey.");
  await db.update(orderPayments).set({ status: "sent_awaiting_confirmation", submittedAt: new Date() }).where(eq(orderPayments.id, payment.id));
  await notify(payment.storeAdminId, orderId, "Lacag sugaysa xaqiijin", `Customer-ku wuxuu sheegay inuu diray ${payment.amount} isagoo adeegsanaya ${paymentLabels[payment.method as PaymentMethod]}. Hubi akoonkaaga ka hor xaqiijinta.`);
  return getPaymentForOrder(orderId);
}

export async function markCustomerPaymentFailed(customerId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const payment = (await db.select().from(orderPayments).where(and(eq(orderPayments.orderId, orderId), eq(orderPayments.customerId, customerId))).limit(1))[0];
  if (!payment) throw new Error("Lacag-bixintan adiga ma lihid.");
  if (payment.status !== "pending_payment") throw new Error("Xaaladdan lacag-bixinta lama beddeli karo hadda.");
  await db.update(orderPayments).set({ status: "failed" }).where(eq(orderPayments.id, payment.id));
  await notify(payment.storeAdminId, orderId, "Lacag-bixin fashilantay", `Customer-ku wuxuu sheegay inuusan dirin lacagta dalab #${orderId}.`);
  return getPaymentForOrder(orderId);
}

export async function reviewPaymentForStore(storeAdminId: number, orderId: number, next: Extract<PaymentStatus, "confirmed" | "rejected" | "failed">) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const payment = (await db.select().from(orderPayments).where(and(eq(orderPayments.orderId, orderId), eq(orderPayments.storeAdminId, storeAdminId))).limit(1))[0];
  if (!payment) throw new Error("Lacag-bixintan ma laha dukaankaaga.");
  const order = (await db.select().from(customerOrders).where(and(eq(customerOrders.id, orderId), eq(customerOrders.storeAdminId, storeAdminId))).limit(1))[0];
  if (!order || order.status !== "pending") throw new Error("Lacag-bixintan lama qiimeyn karo, sababtoo ah dalabka ma joogo xaaladda sugitaanka.");
  if (payment.status !== "sent_awaiting_confirmation") throw new Error("Waxaad qiimeyn kartaa oo keliya lacag sugaysa xaqiijin.");
  await db.update(orderPayments).set({ status: next, confirmedAt: next === "confirmed" ? new Date() : null }).where(eq(orderPayments.id, payment.id));
  if (next === "confirmed") {
    await db.update(customerOrders).set({ status: "payment_confirmed" }).where(and(eq(customerOrders.id, orderId), eq(customerOrders.storeAdminId, storeAdminId)));
    await db.insert(orderStatusHistory).values({ orderId, status: "payment_confirmed", changedBy: "store_admin" });
    const split = commissionBreakdown(payment.amount);
    const dueAt = commissionDueDate();
    await db.insert(commissionHistory).values({ paymentId: payment.id, orderId, storeAdminId, ...split, status: "required", dueAt }).onDuplicateKeyUpdate({ set: { ...split, status: "required", method: null, receivingAccount: null, receiptImageUrl: null, dueAt, sentAt: null, paidAt: null, verifiedBy: null } });
    await applyRestrictionForOutstandingCommission(storeAdminId);
    await unlockSkinJourneyForOrder(payment.customerId, orderId);
    await notify(payment.customerId, orderId, "Lacag-bixinta waa la xaqiijiyey", `Lacagta dalabkaaga #${orderId} waa la helay. Dalabkaagu hadda wuxuu galay marxaladda Payment Confirmed.`);
  } else {
    const wording = next === "failed" ? "fashilantay" : "lama helin";
    await notify(payment.customerId, orderId, "Lacag-bixinta lama xaqiijin", `Lacagta dalabkaaga #${orderId} ${wording}. Fadlan hubi akoonkaaga ama la xiriir dukaanka.`);
  }
  return getPaymentForOrder(orderId);
}

export async function paymentDashboard() {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const payments = await db.select().from(orderPayments).orderBy(desc(orderPayments.createdAt));
  const commissions = await db.select().from(commissionHistory).orderBy(desc(commissionHistory.createdAt));
  const storeIds = [...new Set(commissions.map((item) => item.storeAdminId))];
  const stores = storeIds.length ? await db.select({ id: phaseOneAccounts.id, storeName: phaseOneAccounts.storeName, status: phaseOneAccounts.status }).from(phaseOneAccounts).where(inArray(phaseOneAccounts.id, storeIds)) : [];
  const storesById = new Map(stores.map((store) => [store.id, { storeName: store.storeName ?? "Dukaan", status: store.status }]));
  const confirmedPayments = payments.filter((payment) => payment.status === "confirmed");
  const pendingPayments = payments.filter((payment) => payment.status === "pending_payment" || payment.status === "sent_awaiting_confirmation");
  return {
    totalSales: confirmedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    totalCommission: commissions.reduce((sum, item) => sum + Number(item.commissionAmount), 0),
    confirmedPaymentCount: confirmedPayments.length,
    pendingPaymentCount: pendingPayments.length,
    storeEarnings: commissions.reduce((sum, item) => sum + Number(item.storeEarnings), 0),
    pendingCommissionCount: commissions.filter((item) => item.status === "required" || item.status === "commission_payment_sent").length,
    paidCommissionCount: commissions.filter((item) => item.status === "paid").length,
    history: commissions.map((item) => ({ ...item, saleAmount: Number(item.saleAmount), commissionAmount: Number(item.commissionAmount), storeEarnings: Number(item.storeEarnings), reminder: commissionReminder(item.status, item.dueAt), storeName: storesById.get(item.storeAdminId)?.storeName ?? "Dukaan", storeStatus: storesById.get(item.storeAdminId)?.status ?? "unknown" })),
  };
}

function csvValue(value: unknown) { const text = value instanceof Date ? value.toISOString() : String(value ?? ""); return `"${text.replaceAll("\"", "\"\"")}"`; }
export async function commissionHistoryCsv() {
  const data = await paymentDashboard();
  const header = ["Commission ID", "Order ID", "Store", "Store Status", "Sale Amount", "Commission 5%", "Store Earnings", "Commission Status", "Due Date", "Sent At", "Paid At", "Receipt URL"];
  const lines = data.history.map((item) => [item.id, item.orderId, item.storeName, item.storeStatus, item.saleAmount, item.commissionAmount, item.storeEarnings, item.status, item.dueAt, item.sentAt, item.paidAt, item.receiptImageUrl].map(csvValue).join(","));
  return { filename: `iftiin-commission-history-${new Date().toISOString().slice(0, 10)}.csv`, csv: [header.map(csvValue).join(","), ...lines].join("\n") };
}
