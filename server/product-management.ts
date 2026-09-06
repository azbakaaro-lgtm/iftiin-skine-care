import { and, desc, eq, like, or } from "drizzle-orm";
import { phaseOneAccounts, storeDeliverySettings, storeProducts, type InsertStoreProduct } from "../drizzle/schema";
import { storagePut } from "./storage";
import { getDb } from "./db";

export type DiscountType = "none" | "percentage" | "fixed";
export type ProductInput = { name: string; brand: string; category: string; description?: string | null; usageInstructions?: string | null; originalPrice: number; discountType: DiscountType; discountValue: number; stock: number; availability: boolean; imageData?: string | null };

export function finalSellingPrice(originalPrice: number, discountType: DiscountType, discountValue: number) {
  const original = Math.max(0, Math.round(originalPrice));
  const discount = Math.max(0, Math.round(discountValue));
  if (discountType === "percentage") return Math.max(0, original - Math.round((original * Math.min(100, discount)) / 100));
  if (discountType === "fixed") return Math.max(0, original - discount);
  return original;
}

async function uploadProductImage(storeAdminId: number, imageData?: string | null) {
  if (!imageData) return null;
  const match = imageData.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/);
  if (!match) throw new Error("Sawirka product-ka ma saxna.");
  const extension = match[1] === "png" ? "png" : "jpg";
  const contentType = extension === "png" ? "image/png" : "image/jpeg";
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 850_000) throw new Error("Sawirku aad buu u weyn yahay. Dooro sawir ka yar.");
  const result = await storagePut(`store-products/${storeAdminId}/product.${extension}`, buffer, contentType);
  return result.url;
}

function mappedProduct(product: typeof storeProducts.$inferSelect, storeName?: string | null) {
  return { ...product, storeName: storeName ?? null, finalPrice: Number(product.finalPrice), originalPrice: Number(product.originalPrice), discountValue: Number(product.discountValue), stock: Number(product.stock) };
}

export async function createProductForStore(storeAdminId: number, input: ProductInput) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const imageUrl = await uploadProductImage(storeAdminId, input.imageData);
  const values: InsertStoreProduct = { storeAdminId, name: input.name.trim(), brand: input.brand.trim(), category: input.category.trim(), description: input.description?.trim() || null, usageInstructions: input.usageInstructions?.trim() || null, imageUrl, originalPrice: Math.round(input.originalPrice), discountType: input.discountType, discountValue: Math.round(input.discountValue), finalPrice: finalSellingPrice(input.originalPrice, input.discountType, input.discountValue), stock: Math.max(0, Math.round(input.stock)), availability: input.availability };
  const result = await db.insert(storeProducts).values(values);
  const created = await db.select().from(storeProducts).where(eq(storeProducts.id, Number(result[0].insertId))).limit(1);
  if (!created[0]) throw new Error("Product-ka lama kaydin karo.");
  return mappedProduct(created[0]);
}

export async function listProductsForStore(storeAdminId: number, filters: { search?: string; category?: string; availability?: boolean | null }) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const clauses = [eq(storeProducts.storeAdminId, storeAdminId)];
  if (filters.category) clauses.push(eq(storeProducts.category, filters.category));
  if (filters.availability !== undefined && filters.availability !== null) clauses.push(eq(storeProducts.availability, filters.availability));
  if (filters.search?.trim()) { const query = `%${filters.search.trim()}%`; clauses.push(or(like(storeProducts.name, query), like(storeProducts.brand, query))!); }
  const products = await db.select().from(storeProducts).where(and(...clauses)).orderBy(desc(storeProducts.createdAt));
  return products.map((product) => mappedProduct(product));
}

async function ownedProduct(storeAdminId: number, productId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const products = await db.select().from(storeProducts).where(and(eq(storeProducts.id, productId), eq(storeProducts.storeAdminId, storeAdminId))).limit(1);
  if (!products[0]) throw new Error("Product-kan ma laha dukaankaaga.");
  return products[0];
}

export async function updateProductForStore(storeAdminId: number, productId: number, input: ProductInput) {
  const current = await ownedProduct(storeAdminId, productId);
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const uploaded = await uploadProductImage(storeAdminId, input.imageData);
  await db.update(storeProducts).set({ name: input.name.trim(), brand: input.brand.trim(), category: input.category.trim(), description: input.description?.trim() || null, usageInstructions: input.usageInstructions?.trim() || null, imageUrl: uploaded ?? current.imageUrl, originalPrice: Math.round(input.originalPrice), discountType: input.discountType, discountValue: Math.round(input.discountValue), finalPrice: finalSellingPrice(input.originalPrice, input.discountType, input.discountValue), stock: Math.max(0, Math.round(input.stock)), availability: input.availability }).where(eq(storeProducts.id, productId));
  const updated = await ownedProduct(storeAdminId, productId);
  return mappedProduct(updated);
}

export async function deleteProductForStore(storeAdminId: number, productId: number) {
  await ownedProduct(storeAdminId, productId);
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  await db.delete(storeProducts).where(and(eq(storeProducts.id, productId), eq(storeProducts.storeAdminId, storeAdminId)));
}

export async function getDeliveryForStore(storeAdminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const settings = await db.select().from(storeDeliverySettings).where(eq(storeDeliverySettings.storeAdminId, storeAdminId)).limit(1);
  return settings[0] ?? { id: 0, storeAdminId, deliveryEnabled: false, deliveryFee: 0, deliveryAreas: "", updatedAt: new Date() };
}

export async function saveDeliveryForStore(storeAdminId: number, input: { deliveryEnabled: boolean; deliveryFee: number; deliveryAreas: string }) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  await db.insert(storeDeliverySettings).values({ storeAdminId, deliveryEnabled: input.deliveryEnabled, deliveryFee: Math.max(0, Math.round(input.deliveryFee)), deliveryAreas: input.deliveryAreas.trim() || null }).onDuplicateKeyUpdate({ set: { deliveryEnabled: input.deliveryEnabled, deliveryFee: Math.max(0, Math.round(input.deliveryFee)), deliveryAreas: input.deliveryAreas.trim() || null } });
  return getDeliveryForStore(storeAdminId);
}

export async function listAllProductsForSuperAdmin(filters: { search?: string; category?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const clauses = [] as any[];
  if (filters.category) clauses.push(eq(storeProducts.category, filters.category));
  if (filters.search?.trim()) { const query = `%${filters.search.trim()}%`; clauses.push(or(like(storeProducts.name, query), like(storeProducts.brand, query))!); }
  const query = db.select({ product: storeProducts, storeName: phaseOneAccounts.storeName }).from(storeProducts).innerJoin(phaseOneAccounts, eq(storeProducts.storeAdminId, phaseOneAccounts.id));
  const rows = clauses.length ? await query.where(and(...clauses)).orderBy(desc(storeProducts.createdAt)) : await query.orderBy(desc(storeProducts.createdAt));
  return rows.map((row) => mappedProduct(row.product, row.storeName));
}
