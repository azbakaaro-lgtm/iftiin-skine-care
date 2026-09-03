import { router } from "expo-router";
import { Text } from "react-native";
import { LoadingCare, Page, palette } from "@/components/iftiin-ui";
import { DashboardNavItem, DashboardPanel, DashboardShell, StatCard } from "@/components/dashboard-shell";
import { RequireRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";
import { StyleSheet, View } from "react-native";

export default function SuperAdminDashboard() {
  return (
    <RequireRole role="super_admin">
      <Dashboard />
    </RequireRole>
  );
}

const NAV_ITEMS: DashboardNavItem[] = [
  { key: "dashboard", label: "Dashboard-ka", icon: "space-dashboard", route: "/super-admin-dashboard" },
  { key: "stores", label: "Dukaamada", icon: "storefront", route: "/super-admin-stores" },
  { key: "products", label: "Dhammaan alaabta", icon: "inventory-2", route: "/super-admin-products" },
  { key: "orders", label: "Dhammaan dalabyada", icon: "receipt-long", route: "/super-admin-orders" },
  { key: "customers", label: "Macaamiisha", icon: "people", route: "/super-admin-customers" },
  { key: "payments", label: "Warbixinta lacagaha", icon: "assessment", route: "/super-admin-payments" },
  { key: "wallet", label: "Xisaabta Iftiin", icon: "account-balance-wallet", route: "/super-admin-payment-settings" },
  { key: "profile", label: "Qoraalkayga", icon: "person", route: "/account-profile" },
];

function Dashboard() {
  const { session } = usePhaseSession();
  const overview = trpc.phase1.superDashboard.useQuery({ sessionToken: session!.token });
  const notificationSummary = trpc.phase1.notificationSummary.useQuery({ sessionToken: session!.token });

  if (overview.isLoading) return <LoadingCare />;
  if (overview.error) return <Page><Text>{overview.error.message}</Text></Page>;

  const data = overview.data!;
  const totalStores = data.pendingStores + data.activeStores + data.suspendedStores;

  return (
    <DashboardShell
      title="Dashboard-ka"
      subtitle="Maaree dukaamada, macaamiisha, alaabta iyo dalabyada"
      navItems={NAV_ITEMS}
      activeKey="dashboard"
      notificationCount={notificationSummary.data?.unreadCount}
      onNotificationsPress={() => router.push("/notifications" as never)}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>MAAMULAHA SARE</Text>
        <Text style={styles.heroTitle}>Ku soo dhawoow, {session!.account.fullName}</Text>
        <Text style={styles.heroText}>Waxaad ansixin kartaa dukaamada, arki kartaa alaabta iyo dalabyada dukaamada, adigoon beddelin dalabka.</Text>
      </View>

      <View style={styles.statRow}>
        <StatCard icon="storefront" value={String(totalStores)} label="Dukaamada oo dhan" tint={palette.lavender} onPress={() => router.push("/super-admin-stores" as never)} />
        <StatCard icon="hourglass-top" value={String(data.pendingStores)} label="Sugaya ansixin" tint="#FFF5DE" onPress={() => router.push("/super-admin-stores" as never)} />
        <StatCard icon="check-circle" value={String(data.activeStores)} label="Firfircoon" tint="#E6F5EC" />
        <StatCard icon="block" value={String(data.suspendedStores)} label="La hakiyey" tint="#FBE9EC" />
        <StatCard icon="people" value={String(data.customerCount)} label="Macaamiisha" tint="#FFF1E4" onPress={() => router.push("/super-admin-customers" as never)} />
      </View>

      <View style={styles.panelsRow}>
        <View style={styles.panelCol}>
          <DashboardPanel title="Dukaamada" action={{ label: "Maaree", onPress: () => router.push("/super-admin-stores" as never) }}>
            <Text style={styles.panelCopy}>{data.pendingStores} dukaan ayaa sugaya ansixinta, {data.activeStores} ayaa firfircoon.</Text>
          </DashboardPanel>
        </View>
        <View style={styles.panelCol}>
          <DashboardPanel title="Dalabyada iyo alaabta" action={{ label: "Eeg dhammaan", onPress: () => router.push("/super-admin-orders" as never) }}>
            <Text style={styles.panelCopy}>Arag dhammaan dalabyada iyo alaabta ee dukaamada oo dhan.</Text>
          </DashboardPanel>
        </View>
        <View style={styles.panelCol}>
          <DashboardPanel title="Lacagaha" action={{ label: "Warbixin", onPress: () => router.push("/super-admin-payments" as never) }}>
            <Text style={styles.panelCopy}>Fiiri warbixinta lacagaha iyo xisaabta Iftiin.</Text>
          </DashboardPanel>
        </View>
      </View>
    </DashboardShell>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, borderRadius: 22, backgroundColor: palette.lavender, gap: 6 },
  eyebrow: { color: palette.purple, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: palette.ink, fontSize: 20, fontWeight: "900" },
  heroText: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  panelsRow: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  panelCol: { flex: 1, minWidth: 260 },
  panelCopy: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});
