import { and, desc, eq } from "drizzle-orm";
import { customerSkinJourneys, storeProducts } from "../drizzle/schema";
import { getDb } from "./db";

type AnswerValue = string | string[];
export type JourneyVisual = { calaamado: string[]; caddeyn: "cad" | "qayb ahaan cad" | "aan caddayn"; sooKoobid: string };
export type JourneyProduct = { id: number; storeAdminId: number; name: string; brand: string; imageUrl: string | null; category: string; description: string | null; originalPrice: number; finalPrice: number; stock: number; availability: boolean };

function values(answers: Record<string, AnswerValue>, key: string) { const value = answers[key]; return Array.isArray(value) ? value : value ? [value] : []; }
function preferredCategories(answers: Record<string, AnswerValue>, visual?: JourneyVisual) {
  const joined = [...values(answers, "skinType"), ...values(answers, "goal"), ...(visual?.calaamado ?? [])].join(" ").toLowerCase();
  if (joined.includes("qallalan")) return ["moisturizer", "cream", "serum", "sunscreen"];
  if (joined.includes("finan") || joined.includes("dufan")) return ["serum", "cleanser", "moisturizer", "sunscreen"];
  if (joined.includes("midab")) return ["serum", "sunscreen", "moisturizer"];
  return ["moisturizer", "sunscreen", "serum", "cleanser"];
}

function parseAnswers(raw: string) { try { return JSON.parse(raw) as Record<string, AnswerValue>; } catch { return {}; } }
function parseVisual(raw: string | null) { try { return raw ? JSON.parse(raw) as JourneyVisual : undefined; } catch { return undefined; } }
function publicProduct(product: typeof storeProducts.$inferSelect): JourneyProduct { return { id: product.id, storeAdminId: product.storeAdminId, name: product.name, brand: product.brand, imageUrl: product.imageUrl, category: product.category, description: product.description, originalPrice: Number(product.originalPrice), finalPrice: Number(product.finalPrice), stock: Number(product.stock), availability: product.availability }; }

export function preliminaryConcerns(answers: Record<string, AnswerValue>, visual?: JourneyVisual) {
  const source = [...(visual?.calaamado ?? []), ...values(answers, "goal"), ...values(answers, "sensitivity")];
  return [...new Set(source.filter((item) => item && item !== "Maya" && item !== "Daryeel joogto ah"))].slice(0, 3);
}

export async function createCustomerSkinJourney(customerId: number, answers: Record<string, AnswerValue>, visual?: JourneyVisual) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const products = await db.select().from(storeProducts).where(and(eq(storeProducts.availability, true)));
  const available = products.filter((product) => product.stock > 0);
  if (!available.length) throw new Error("Hadda lama hayo product la heli karo oo lagu furi karo natiijadaada.");
  const categories = preferredCategories(answers, visual);
  const rank = (category: string) => { const position = categories.indexOf(category.toLowerCase()); return position < 0 ? 99 : position; };
  const recommended = [...available].sort((left, right) => rank(left.category) - rank(right.category))[0];
  const result = await db.insert(customerSkinJourneys).values({ customerId, recommendedProductId: recommended.id, answersJson: JSON.stringify(answers), visualJson: visual ? JSON.stringify(visual) : null, status: "preview" });
  const journeyId = Number(result[0].insertId);
  return { id: journeyId, status: "preview" as const, concerns: preliminaryConcerns(answers, visual), recommendedProduct: publicProduct(recommended) };
}

export async function linkJourneyToOrder(customerId: number, journeyId: number, orderId: number, productIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const journey = (await db.select().from(customerSkinJourneys).where(and(eq(customerSkinJourneys.id, journeyId), eq(customerSkinJourneys.customerId, customerId))).limit(1))[0];
  if (!journey) throw new Error("Skin journey-kan adiga ma lihid.");
  if (journey.status === "unlocked") throw new Error("Natiijadan mar hore ayay u furan tahay.");
  if (journey.purchaseOrderId) throw new Error("Skin journey-kan hore ayaa loogu xidhay dalab.");
  if (!productIds.includes(journey.recommendedProductId)) throw new Error("Dalabka waa inuu ku jiraa product-ka laguu doortay si natiijada loo furo.");
  await db.update(customerSkinJourneys).set({ purchaseOrderId: orderId }).where(eq(customerSkinJourneys.id, journeyId));
}


export async function unlockedSkinJourneyForOrder(customerId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const row = (await db.select().from(customerSkinJourneys).where(and(eq(customerSkinJourneys.customerId, customerId), eq(customerSkinJourneys.purchaseOrderId, orderId), eq(customerSkinJourneys.status, "unlocked"))).limit(1))[0];
  return row ? getFullSkinJourneyForCustomer(customerId, row.id) : null;
}

// Only the owning customer can list or delete their own scans/journeys —
// every query below is scoped by customerId, so nobody else (including
// store admins or the super admin) can see or remove this data.
export async function listMySkinJourneys(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const rows = await db.select().from(customerSkinJourneys).where(eq(customerSkinJourneys.customerId, customerId)).orderBy(desc(customerSkinJourneys.createdAt));
  return rows.map((row) => ({ id: row.id, status: row.status, createdAt: row.createdAt, unlockedAt: row.unlockedAt, visual: parseVisual(row.visualJson) }));
}

export async function getSkinJourneyForCustomer(customerId: number, journeyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const row = (await db.select().from(customerSkinJourneys).where(and(eq(customerSkinJourneys.id, journeyId), eq(customerSkinJourneys.customerId, customerId))).limit(1))[0];
  if (!row) throw new Error("Skin journey-kan lama heli karo.");
  const product = (await db.select().from(storeProducts).where(eq(storeProducts.id, row.recommendedProductId)).limit(1))[0];
  if (!product) throw new Error("Product-kii lagu taliyey lama heli karo.");
  return { id: row.id, status: row.status, purchaseOrderId: row.purchaseOrderId, unlockedAt: row.unlockedAt, answers: parseAnswers(row.answersJson), visual: parseVisual(row.visualJson), concerns: preliminaryConcerns(parseAnswers(row.answersJson), parseVisual(row.visualJson)), recommendedProduct: publicProduct(product) };
}

export async function getFullSkinJourneyForCustomer(customerId: number, journeyId: number) {
  const journey = await getSkinJourneyForCustomer(customerId, journeyId);
  if (journey.status !== "unlocked") throw new Error("Natiijada buuxda waxay furmaysaa marka lacag-bixinta product-ka laguu doortay la xaqiijiyo.");
  return journey;
}

export async function latestUnlockedSkinJourney(customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const rows = await db.select().from(customerSkinJourneys).where(and(eq(customerSkinJourneys.customerId, customerId), eq(customerSkinJourneys.status, "unlocked"))).orderBy(desc(customerSkinJourneys.unlockedAt)).limit(1);
  return rows[0] ? getFullSkinJourneyForCustomer(customerId, rows[0].id) : null;
}


// Marka lacag-bixinta dalabka la xaqiijiyo, u fur (unlock) skin journey-ga
// dalabkaas la xidhay si macmiilku u arko natiijada buuxda.
export async function unlockSkinJourneyForOrder(customerId: number, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  await db.update(customerSkinJourneys).set({ status: "unlocked", unlockedAt: new Date() }).where(and(eq(customerSkinJourneys.customerId, customerId), eq(customerSkinJourneys.purchaseOrderId, orderId)));
}


export async function deleteMySkinJourney(customerId: number, journeyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const row = (await db.select().from(customerSkinJourneys).where(and(eq(customerSkinJourneys.id, journeyId), eq(customerSkinJourneys.customerId, customerId))).limit(1))[0];
  if (!row) throw new Error("Xogtan lama heli karo ama horeba waa la tirtiray.");
  await db.delete(customerSkinJourneys).where(and(eq(customerSkinJourneys.id, journeyId), eq(customerSkinJourneys.customerId, customerId)));
  return { success: true } as const;
}