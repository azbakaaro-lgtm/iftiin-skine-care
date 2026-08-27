import * as SecureStore from "expo-secure-store";
import { Redirect, router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { LoadingCare } from "@/components/iftiin-ui";
import { trpc } from "@/lib/trpc";

export type PhaseRole = "super_admin" | "store_admin" | "customer";
export type PhaseAccount = { id: number; role: PhaseRole; status: "pending" | "active" | "restricted" | "suspended"; fullName: string; storeName: string | null; phoneNumber: string; email: string; username: string | null; location: string | null; createdAt: string | Date; updatedAt: string | Date; lastSignedIn: string | Date };
export type PhaseSession = { token: string; account: PhaseAccount };

const SESSION_KEY = "iftiin-phase1-session";
const SessionContext = createContext<{ session: PhaseSession | null; loaded: boolean; setSession: (session: PhaseSession) => Promise<void>; logout: () => Promise<void> } | null>(null);

async function readSession() { const raw = Platform.OS === "web" ? (typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(SESSION_KEY)) : await SecureStore.getItemAsync(SESSION_KEY); return raw ? JSON.parse(raw) as PhaseSession : null; }
async function writeSession(value: PhaseSession) { const raw = JSON.stringify(value); if (Platform.OS === "web") sessionStorage.setItem(SESSION_KEY, raw); else await SecureStore.setItemAsync(SESSION_KEY, raw); }
async function clearSession() { if (Platform.OS === "web") sessionStorage.removeItem(SESSION_KEY); else await SecureStore.deleteItemAsync(SESSION_KEY); }

export function PhaseSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, updateSession] = useState<PhaseSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { readSession().then(updateSession).catch(() => updateSession(null)).finally(() => setLoaded(true)); }, []);
  const setSession = useCallback(async (next: PhaseSession) => { await writeSession(next); updateSession(next); }, []);
  const logout = useCallback(async () => { await clearSession(); updateSession(null); }, []);
  const value = useMemo(() => ({ session, loaded, setSession, logout }), [session, loaded, setSession, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function usePhaseSession() { const value = useContext(SessionContext); if (!value) throw new Error("usePhaseSession must be used inside PhaseSessionProvider"); return value; }
export function routeForRole(role: PhaseRole) { return role === "super_admin" ? "/super-admin-dashboard" : role === "store_admin" ? "/store-admin-dashboard" : "/customer-home"; }
export function RequireRole({ role, children }: { role: PhaseRole; children: React.ReactNode }) {
  const { session, loaded, logout } = usePhaseSession();
  const profile = trpc.phase1.profile.useQuery({ sessionToken: session?.token ?? "missing" }, { enabled: loaded && Boolean(session) });
  useEffect(() => {
    if (profile.error) { void logout(); router.replace("/login"); }
  }, [profile.error, logout]);
  if (!loaded || (session && profile.isLoading)) return <LoadingCare />;
  const activeAccount = profile.data ?? session?.account;
  const usable = activeAccount?.status === "active" || (activeAccount?.role === "store_admin" && activeAccount.status === "restricted");
  if (!session || profile.error || !activeAccount || activeAccount.role !== role || !usable) return <Redirect href="/login" />;
  return <>{children}</>;
}

export function RequireSession({ children }: { children: React.ReactNode }) {
  const { session, loaded, logout } = usePhaseSession();
  const profile = trpc.phase1.profile.useQuery({ sessionToken: session?.token ?? "missing" }, { enabled: loaded && Boolean(session) });
  useEffect(() => { if (profile.error) { void logout(); router.replace("/login"); } }, [profile.error, logout]);
  if (!loaded || (session && profile.isLoading)) return <LoadingCare />;
  const usable = profile.data?.status === "active" || (profile.data?.role === "store_admin" && profile.data.status === "restricted");
  if (!session || profile.error || !profile.data || !usable) return <Redirect href="/login" />;
  return <>{children}</>;
}
