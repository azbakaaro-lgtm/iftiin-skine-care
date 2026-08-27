import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { analyzeFacePhoto } from "./face-analysis";
import { analyzeProductPhotos } from "./product-scanner";
import { changePasswordForAccount, changeStoreStatus, createAccount, findAccount, hashPassword, issuePhaseSession, listAccounts, markSignedIn, requireRole, setPrivateSuperAdminCredential, toPublicAccount, verifyPassword, verifyPhaseSession } from "./phase1-auth";
import { ENV } from "./_core/env";
import { createProductForStore, deleteProductForStore, getDeliveryForStore, listAllProductsForSuperAdmin, listProductsForStore, saveDeliveryForStore, updateProductForStore } from "./product-management";
import { commissionHistoryCsv, commissionSummaryForStore, getStorePaymentSettings, getSuperAdminPaymentSettings, markCustomerPaymentFailed, markCustomerPaymentSent, paymentDashboard, paymentOptionsForStore, reviewCommissionPayment, reviewPaymentForStore, saveStorePaymentSettings, saveSuperAdminPaymentSettings, submitCommissionPayment } from "./payments";
import { createCustomerSkinJourney, getFullSkinJourneyForCustomer, getSkinJourneyForCustomer, latestUnlockedSkinJourney, unlockedSkinJourneyForOrder } from "./skin-journey";
import { cancelCustomerPendingOrder, createCustomerOrder, customerProductDetail, listActiveStores, listAllOrders, listCustomerOrders, listCustomerProducts, listInAppNotifications, listStoreOrders, markAllNotificationsRead, markNotificationRead, notificationSummary, orderDetailForAccount, updateStoreOrderStatus } from "./shopping";

const compactImage = z.string().regex(/^data:image\/(jpeg|jpg|png);base64,/).max(360000);
const receiptImage = z.string().regex(/^data:image\/(jpeg|jpg|png);base64,/).max(1_200_000);
const password = z.string().min(8, "Furaha sirta ahi waa inuu ahaadaa ugu yaraan 8 xaraf.").max(128);
const tokenInput = z.object({ sessionToken: z.string().min(20) });
const productInput = z.object({ name: z.string().min(2).max(180), brand: z.string().min(2).max(160), category: z.string().min(2).max(100), description: z.string().max(3000).optional().nullable(), originalPrice: z.number().int().min(0), discountType: z.enum(["none", "percentage", "fixed"]), discountValue: z.number().int().min(0), stock: z.number().int().min(0), availability: z.boolean(), imageData: z.string().regex(/^data:image\/(jpeg|jpg|png);base64,/).max(1_200_000).optional().nullable() });
const shoppingFilter = z.object({ search: z.string().max(180).optional(), category: z.string().max(100).optional() });
const paymentAccountInput = z.object({ evcPlusAccount: z.string().max(120).optional().nullable(), edahabAccount: z.string().max(120).optional().nullable(), premierWalletAccount: z.string().max(120).optional().nullable(), merchantAccount: z.string().max(160).optional().nullable() });

async function sessionOrError(token: string) { try { return await verifyPhaseSession(token); } catch (error) { throw new TRPCError({ code: "UNAUTHORIZED", message: error instanceof Error ? error.message : "Fadlan soo gal." }); } }
async function roleOrError(token: string, role: "super_admin" | "store_admin" | "customer") { try { return await requireRole(token, role); } catch (error) { throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Oggolaansho ma lihid." }); } }

export const appRouter = router({
  system: systemRouter,
  phase1: router({
    registerStore: publicProcedure.input(z.object({ fullName: z.string().min(2).max(160), storeName: z.string().min(2).max(160), phoneNumber: z.string().min(5).max(50), email: z.string().email().max(320), username: z.string().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/), password, location: z.string().min(2).max(255) })).mutation(async ({ input }) => {
      const duplicate = await findAccount(input.email).catch(() => undefined) || await findAccount(input.username).catch(() => undefined);
      if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "Email-kan ama magaca isticmaalaha hore ayaa loo isticmaalay." });
      const account = await createAccount({ role: "store_admin", status: "pending", fullName: input.fullName, storeName: input.storeName, phoneNumber: input.phoneNumber, email: input.email.toLowerCase(), username: input.username.toLowerCase(), passwordHash: hashPassword(input.password), location: input.location });
      return { account: toPublicAccount(account), message: "Codsiga dukaanka waa la gudbiyay; sug ansixinta Maamulaha Sare." };
    }),
    registerCustomer: publicProcedure.input(z.object({ fullName: z.string().min(2).max(160), phoneNumber: z.string().min(5).max(50), email: z.string().email().max(320), password })).mutation(async ({ input }) => {
      const duplicate = await findAccount(input.email).catch(() => undefined);
      if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "Email-kan hore ayaa loo isticmaalay." });
      const account = await createAccount({ role: "customer", status: "active", fullName: input.fullName, phoneNumber: input.phoneNumber, email: input.email.toLowerCase(), passwordHash: hashPassword(input.password) });
      return { account: toPublicAccount(account), sessionToken: await issuePhaseSession(account) };
    }),
    login: publicProcedure.input(z.object({ identifier: z.string().min(3).max(320), password })).mutation(async ({ input }) => {
      const account = await findAccount(input.identifier);
      if (!account || !verifyPassword(input.password, account.passwordHash)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Macluumaadka gelitaanka sax ma aha." });
      if (account.status === "pending") throw new TRPCError({ code: "FORBIDDEN", message: "Akoonka dukaankaagu weli wuxuu sugayaa ansixinta." });
      if (account.status === "suspended") throw new TRPCError({ code: "FORBIDDEN", message: "Akoonkaaga waa la hakiyay. La xiriir Maamulaha Sare." });
      await markSignedIn(account.id);
      return { account: toPublicAccount(account), sessionToken: await issuePhaseSession(account) };
    }),
    bootstrapSuperAdmin: publicProcedure.input(z.object({ setupKey: z.string().min(1), email: z.string().email().max(320), password })).mutation(async ({ input }) => {
      if (!ENV.ownerSetupKey || input.setupKey !== ENV.ownerSetupKey) throw new TRPCError({ code: "FORBIDDEN", message: "Furaha ansixinta sax ma aha." });
      try { const account = await setPrivateSuperAdminCredential(input.email, input.password); return { account: toPublicAccount(account), sessionToken: await issuePhaseSession(account) }; } catch (error) { throw new TRPCError({ code: "FORBIDDEN", message: error instanceof Error ? error.message : "Oggolaansho ma lihid." }); }
    }),
    profile: publicProcedure.input(tokenInput).query(async ({ input }) => toPublicAccount(await sessionOrError(input.sessionToken))),
    changePassword: publicProcedure.input(tokenInput.extend({ currentPassword: password, newPassword: password })).mutation(async ({ input }) => {
      if (input.currentPassword === input.newPassword) throw new TRPCError({ code: "BAD_REQUEST", message: "Furaha cusub waa inuu ka duwanaadaa kii hore." });
      const account = await sessionOrError(input.sessionToken);
      try { await changePasswordForAccount(account.id, input.currentPassword, input.newPassword); return { success: true } as const; } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Password-ka lama beddeli karo." }); }
    }),
    superDashboard: publicProcedure.input(tokenInput).query(async ({ input }) => { await roleOrError(input.sessionToken, "super_admin"); const [stores, customers] = await Promise.all([listAccounts("store_admin"), listAccounts("customer")]); return { pendingStores: stores.filter((store) => store.status === "pending").length, activeStores: stores.filter((store) => store.status === "active").length, suspendedStores: stores.filter((store) => store.status === "suspended").length, customerCount: customers.length }; }),
    listStores: publicProcedure.input(tokenInput).query(async ({ input }) => { await roleOrError(input.sessionToken, "super_admin"); return (await listAccounts("store_admin")).map(toPublicAccount); }),
    listCustomers: publicProcedure.input(tokenInput).query(async ({ input }) => { await roleOrError(input.sessionToken, "super_admin"); return (await listAccounts("customer")).map(toPublicAccount); }),
    setStoreStatus: publicProcedure.input(tokenInput.extend({ storeId: z.number().int().positive(), status: z.enum(["active", "suspended"]) })).mutation(async ({ input }) => { await roleOrError(input.sessionToken, "super_admin"); return toPublicAccount(await changeStoreStatus(input.storeId, input.status)); }),
    storeDashboard: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return { account: toPublicAccount(account) }; }),
    customerHome: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return { account: toPublicAccount(account) }; }),
    storeProducts: publicProcedure.input(tokenInput.extend({ search: z.string().max(180).optional(), category: z.string().max(100).optional(), availability: z.boolean().optional() })).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return listProductsForStore(account.id, input); }),
    createProduct: publicProcedure.input(tokenInput.extend(productInput.shape)).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return createProductForStore(account.id, input); }),
    updateProduct: publicProcedure.input(tokenInput.extend({ productId: z.number().int().positive() }).extend(productInput.shape)).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return updateProductForStore(account.id, input.productId, input); }),
    deleteProduct: publicProcedure.input(tokenInput.extend({ productId: z.number().int().positive() })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); await deleteProductForStore(account.id, input.productId); return { success: true } as const; }),
    deliverySettings: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return getDeliveryForStore(account.id); }),
    saveDeliverySettings: publicProcedure.input(tokenInput.extend({ deliveryEnabled: z.boolean(), deliveryFee: z.number().int().min(0), deliveryAreas: z.string().max(2000) })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return saveDeliveryForStore(account.id, input); }),
    storePaymentSettings: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return getStorePaymentSettings(account.id); }),
    saveStorePaymentSettings: publicProcedure.input(tokenInput.extend(paymentAccountInput.shape)).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return saveStorePaymentSettings(account.id, input); }),
    superPaymentSettings: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "super_admin"); return getSuperAdminPaymentSettings(account.id); }),
    saveSuperPaymentSettings: publicProcedure.input(tokenInput.extend(paymentAccountInput.shape)).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "super_admin"); return saveSuperAdminPaymentSettings(account.id, input); }),
    allProducts: publicProcedure.input(tokenInput.extend({ search: z.string().max(180).optional(), category: z.string().max(100).optional() })).query(async ({ input }) => { await roleOrError(input.sessionToken, "super_admin"); return listAllProductsForSuperAdmin(input); }),
    customerStores: publicProcedure.input(tokenInput.extend({ search: z.string().max(180).optional() })).query(async ({ input }) => { await roleOrError(input.sessionToken, "customer"); return listActiveStores(input.search); }),
    customerProducts: publicProcedure.input(tokenInput.extend({ storeAdminId: z.number().int().positive() }).extend(shoppingFilter.shape)).query(async ({ input }) => { await roleOrError(input.sessionToken, "customer"); return listCustomerProducts(input.storeAdminId, input); }),
    customerProductDetail: publicProcedure.input(tokenInput.extend({ productId: z.number().int().positive() })).query(async ({ input }) => { await roleOrError(input.sessionToken, "customer"); return customerProductDetail(input.productId); }),
    paymentOptions: publicProcedure.input(tokenInput.extend({ storeAdminId: z.number().int().positive() })).query(async ({ input }) => { await roleOrError(input.sessionToken, "customer"); return paymentOptionsForStore(input.storeAdminId); }),
    createOrder: publicProcedure.input(tokenInput.extend({ items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(99) })).min(1).max(30), deliveryArea: z.string().max(255).optional().nullable(), paymentMethod: z.enum(["evc_plus", "edahab", "premier_wallet", "merchant"]), skinJourneyId: z.number().int().positive().optional().nullable() })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return createCustomerOrder(account.id, input.items, input.deliveryArea, input.paymentMethod, input.skinJourneyId); }),
    customerOrders: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return listCustomerOrders(account.id); }),
    orderDetail: publicProcedure.input(tokenInput.extend({ orderId: z.number().int().positive() })).query(async ({ input }) => { const account = await sessionOrError(input.sessionToken); return orderDetailForAccount(account.id, account.role, input.orderId); }),
    cancelCustomerOrder: publicProcedure.input(tokenInput.extend({ orderId: z.number().int().positive() })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return cancelCustomerPendingOrder(account.id, input.orderId); }),
    markPaymentSent: publicProcedure.input(tokenInput.extend({ orderId: z.number().int().positive() })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); const payment = await markCustomerPaymentSent(account.id, input.orderId); return payment ? { id: payment.id, orderId: payment.orderId, amount: Number(payment.amount), method: payment.method, status: payment.status } : null; }),
    markPaymentFailed: publicProcedure.input(tokenInput.extend({ orderId: z.number().int().positive() })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); const payment = await markCustomerPaymentFailed(account.id, input.orderId); return payment ? { id: payment.id, orderId: payment.orderId, amount: Number(payment.amount), method: payment.method, status: payment.status } : null; }),
    storeOrders: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return listStoreOrders(account.id); }),
    updateOrderStatus: publicProcedure.input(tokenInput.extend({ orderId: z.number().int().positive(), status: z.enum(["processing", "ready", "out_for_delivery", "delivered", "completed", "cancelled"]) })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return updateStoreOrderStatus(account.id, input.orderId, input.status); }),
    reviewPayment: publicProcedure.input(tokenInput.extend({ orderId: z.number().int().positive(), status: z.enum(["confirmed", "rejected", "failed"]) })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return reviewPaymentForStore(account.id, input.orderId, input.status); }),
    storeCommissions: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return commissionSummaryForStore(account.id); }),
    sendCommissionPayment: publicProcedure.input(tokenInput.extend({ commissionId: z.number().int().positive(), method: z.enum(["evc_plus", "edahab", "premier_wallet", "merchant"]), receiptImageData: receiptImage.optional().nullable() })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "store_admin"); return submitCommissionPayment(account.id, input.commissionId, input.method, input.receiptImageData); }),
    allOrders: publicProcedure.input(tokenInput).query(async ({ input }) => { await roleOrError(input.sessionToken, "super_admin"); return listAllOrders(); }),
    paymentDashboard: publicProcedure.input(tokenInput).query(async ({ input }) => { await roleOrError(input.sessionToken, "super_admin"); return paymentDashboard(); }),
    commissionCsv: publicProcedure.input(tokenInput).query(async ({ input }) => { await roleOrError(input.sessionToken, "super_admin"); return commissionHistoryCsv(); }),
    reviewCommissionPayment: publicProcedure.input(tokenInput.extend({ commissionId: z.number().int().positive(), status: z.enum(["paid", "rejected"]) })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "super_admin"); return reviewCommissionPayment(account.id, input.commissionId, input.status); }),
    createSkinJourney: publicProcedure.input(tokenInput.extend({ answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])), visual: z.object({ calaamado: z.array(z.string()).max(4), caddeyn: z.enum(["cad", "qayb ahaan cad", "aan caddayn"]), sooKoobid: z.string().max(700) }).optional() })).mutation(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return createCustomerSkinJourney(account.id, input.answers, input.visual); }),
    skinJourney: publicProcedure.input(tokenInput.extend({ journeyId: z.number().int().positive() })).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return getSkinJourneyForCustomer(account.id, input.journeyId); }),
    fullSkinJourney: publicProcedure.input(tokenInput.extend({ journeyId: z.number().int().positive() })).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return getFullSkinJourneyForCustomer(account.id, input.journeyId); }),
    latestUnlockedSkinJourney: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return latestUnlockedSkinJourney(account.id); }),
    unlockedSkinJourneyForOrder: publicProcedure.input(tokenInput.extend({ orderId: z.number().int().positive() })).query(async ({ input }) => { const account = await roleOrError(input.sessionToken, "customer"); return unlockedSkinJourneyForOrder(account.id, input.orderId); }),
    notifications: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await sessionOrError(input.sessionToken); return listInAppNotifications(account.id); }),
    notificationSummary: publicProcedure.input(tokenInput).query(async ({ input }) => { const account = await sessionOrError(input.sessionToken); return notificationSummary(account.id); }),
    readNotification: publicProcedure.input(tokenInput.extend({ notificationId: z.number().int().positive() })).mutation(async ({ input }) => { const account = await sessionOrError(input.sessionToken); await markNotificationRead(account.id, input.notificationId); }),
    readAllNotifications: publicProcedure.input(tokenInput).mutation(async ({ input }) => { const account = await sessionOrError(input.sessionToken); return markAllNotificationsRead(account.id); }),
  }),
  skinAnalysis: router({ analyzeFace: publicProcedure.input(tokenInput.extend({ faceImage: compactImage })).mutation(async ({ input }) => { await roleOrError(input.sessionToken, "customer"); return analyzeFacePhoto(input.faceImage); }) }),
  productScanner: router({ analyze: publicProcedure.input(z.object({ productImages: z.array(compactImage).min(1).max(4), faceImage: compactImage.optional(), profile: z.object({ skinType: z.string().max(80), concerns: z.array(z.string().max(80)).max(10), sensitivity: z.string().max(80), goal: z.string().max(120) }) })).mutation(({ input }) => analyzeProductPhotos(input)) }),
});

export type AppRouter = typeof appRouter;
