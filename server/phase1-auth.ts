import { and, desc, eq, or } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { phaseOneAccounts, type InsertPhaseOneAccount, type PhaseOneAccount } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getDb } from "./db";

export type PhaseRole = "super_admin" | "store_admin" | "customer";
export type AccountStatus = "pending" | "active" | "restricted" | "suspended";
export type PublicAccount = Omit<PhaseOneAccount, "passwordHash" | "ownerOpenId">;

function authSecret() {
  if (!ENV.cookieSecret) throw new Error("Phase 1 auth is not configured.");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export function toPublicAccount(account: PhaseOneAccount): PublicAccount {
  const { passwordHash: _passwordHash, ownerOpenId: _ownerOpenId, ...safe } = account;
  return safe;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actualBuffer = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function issuePhaseSession(account: PhaseOneAccount) {
  return new SignJWT({ accountId: account.id, role: account.role, status: account.status })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(authSecret());
}

async function accountById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const result = await db.select().from(phaseOneAccounts).where(eq(phaseOneAccounts.id, id)).limit(1);
  return result[0];
}

export async function verifyPhaseSession(token: string) {
  const { payload } = await jwtVerify(token, authSecret());
  const accountId = Number(payload.accountId);
  if (!Number.isInteger(accountId)) throw new Error("Kalfadhiga lama aqoonsan.");
  const account = await accountById(accountId);
  const allowedStatus = account?.status === "active" || (account?.role === "store_admin" && account.status === "restricted");
  if (!account || !allowedStatus || account.role !== payload.role) throw new Error("Kalfadhigu ma shaqaynayo.");
  return account;
}

export async function requireRole(token: string, role: PhaseRole) {
  const account = await verifyPhaseSession(token);
  if (account.role !== role) throw new Error("Uma lihid oggolaanshaha boggan.");
  return account;
}

export async function findAccount(identifier: string) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const result = await db.select().from(phaseOneAccounts).where(or(eq(phaseOneAccounts.email, identifier.toLowerCase()), eq(phaseOneAccounts.username, identifier.toLowerCase()))).limit(1);
  return result[0];
}

export async function createAccount(input: InsertPhaseOneAccount) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const result = await db.insert(phaseOneAccounts).values(input);
  const account = await accountById(Number(result[0].insertId));
  if (!account) throw new Error("Akoonka lama abuuri karo.");
  return account;
}

export async function setPrivateSuperAdminCredential(email: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const normalizedEmail = email.trim().toLowerCase();
  const existingByEmail = await db.select().from(phaseOneAccounts).where(eq(phaseOneAccounts.email, normalizedEmail)).limit(1);
  if (existingByEmail[0] && existingByEmail[0].role !== "super_admin") throw new Error("Email-kan waxaa leh akoon aan ahayn Maamulaha Sare.");
  const existingSuper = existingByEmail[0] ?? (await db.select().from(phaseOneAccounts).where(eq(phaseOneAccounts.role, "super_admin")).limit(1))[0];
  if (existingSuper) {
    await db.update(phaseOneAccounts).set({ email: normalizedEmail, passwordHash: hashPassword(password), status: "active", fullName: existingSuper.fullName || "Maamulaha Sare" }).where(eq(phaseOneAccounts.id, existingSuper.id));
    const updated = await accountById(existingSuper.id);
    if (!updated) throw new Error("Akoonka Maamulaha Sare lama cusboonaysiin karo.");
    return updated;
  }
  return createAccount({ role: "super_admin", status: "active", fullName: "Maamulaha Sare", phoneNumber: "", email: normalizedEmail, passwordHash: hashPassword(password) });
}

export async function changePasswordForAccount(accountId: number, currentPassword: string, newPassword: string) {
  const account = await accountById(accountId);
  if (!account || !verifyPassword(currentPassword, account.passwordHash)) throw new Error("Furaha sirta ah ee hadda jira sax ma aha.");
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  await db.update(phaseOneAccounts).set({ passwordHash: hashPassword(newPassword) }).where(eq(phaseOneAccounts.id, accountId));
}

export async function listAccounts(role: Extract<PhaseRole, "store_admin" | "customer">) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  return db.select().from(phaseOneAccounts).where(eq(phaseOneAccounts.role, role)).orderBy(desc(phaseOneAccounts.createdAt));
}

export async function changeStoreStatus(id: number, status: Extract<AccountStatus, "active" | "suspended">) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  await db.update(phaseOneAccounts).set({ status }).where(and(eq(phaseOneAccounts.id, id), eq(phaseOneAccounts.role, "store_admin")));
  const updated = await accountById(id);
  if (!updated) throw new Error("Dukaanka lama helin.");
  return updated;
}

export async function markSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(phaseOneAccounts).set({ lastSignedIn: new Date() }).where(eq(phaseOneAccounts.id, id));
}

// --- Password reset ---
// Always returns a generic success message regardless of whether the email
// exists, so the endpoint can't be used to discover which emails are
// registered. If the account exists, a random 1-hour token is stored and
// the caller (the router) is responsible for emailing the reset link.
export async function startPasswordReset(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const normalizedEmail = email.trim().toLowerCase();
  const account = (await db.select().from(phaseOneAccounts).where(eq(phaseOneAccounts.email, normalizedEmail)).limit(1))[0];
  if (!account) return null;
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.update(phaseOneAccounts).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(phaseOneAccounts.id, account.id));
  return { token, account };
}

export async function completePasswordReset(token: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Kaydka xogta lama heli karo hadda.");
  const account = (await db.select().from(phaseOneAccounts).where(eq(phaseOneAccounts.resetToken, token)).limit(1))[0];
  if (!account || !account.resetTokenExpiresAt || account.resetTokenExpiresAt.getTime() < Date.now()) {
    throw new Error("Link-gan furaha sirta ah waa dhacay ama waa qalad. Dalbo mid cusub.");
  }
  await db.update(phaseOneAccounts).set({ passwordHash: hashPassword(newPassword), resetToken: null, resetTokenExpiresAt: null }).where(eq(phaseOneAccounts.id, account.id));
  const updated = await accountById(account.id);
  if (!updated) throw new Error("Akoonka lama helin.");
  return updated;
}
