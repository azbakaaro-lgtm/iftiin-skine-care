import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LoadingCare, palette } from "@/components/iftiin-ui";
import { DashboardNavItem, DashboardPanel, DashboardShell, StatCard } from "@/components/dashboard-shell";
import { RequireRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

export default function StoreAdminDashboard() {
  return (
    <RequireRole role="store_admin">
      <StoreDashboard />
    </RequireRole>
  );
}

const NAV_ITEMS: DashboardNavItem[] = [
  { key: "dashboard", label: "Dashboard-ka", icon: "space-dashboard", route: "/store-admin-dashboard" },
  { key: "products", label: "Maaree alaabta", icon: "inventory-2", route: "/store-products" },
  { key: "orders", label: "Dalabyada dukaanka", icon: "receipt-long", route: "/store-orders" },
  { key: "commissions", label: "5% Commission", icon: "account-balance-wallet", route: "/store-commissions" },
  { key: "payments", label: "Dejinta lacagaha", icon: "payments", route: "/store-payment-settings" },
  { key: "delivery", label: "Delivery settings", icon: "local-shipping", route: "/delivery-settings" },
  { key: "profile", label: "Qoraalkayga", icon: "person", route: "/account-profile" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Sugaya",
  payment_confirmed: "Lacagta la xaqiijiyay",
  processing: "Socda",
  preparing: "Socda",
  confirmed: "Socda",
  ready: "Diyaar",
  out_for_delivery: "Gaadhaya",
  delivered: "La geeyay",
  completed: "Dhammaystiran",
  cancelled: "La joojiyay",
};

function statusTint(status: string) {
  if (status === "completed" || status === "delivered") return { bg: "#E6F5EC", fg: palette.success };
  if (status === "cancelled") return { bg: "#FBE9EC", fg: palette.danger };
  if (status === "pending") return { bg: "#FFF5DE", fg: palette.warning };
  return { bg: palette.lavender, fg: palette.purple };
}

function StatusPill({ status }: { status: string }) {
  const tint = statusTint(status);
  return (
    <View style={[pillStyles.pill, { backgroundColor: tint.bg }]}>
      <Text style={[pillStyles.pillText, { color: tint.fg }]}>{STATUS_LABEL[status] ?? status}</Text>
    </View>
  );
}

function formatMoney(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function StoreDashboard() {
  const { session } = usePhaseSession();
  const dashboard = trpc.phase1.storeDashboard.useQuery({ sessionToken: session!.token });
  const notificationSummary = trpc.phase1.notificationSummary.useQuery({ sessionToken: session!.token });
  const products = trpc.phase1.storeProducts.useQuery({ sessionToken: session!.token });
  const orders = trpc.phase1.storeOrders.useQuery({ sessionToken: session!.token });

  if (dashboard.isLoading) return <LoadingCare />;

  const account = dashboard.data?.account;
  const restricted = account?.status === "restricted";
  const productList = products.data ?? [];
  const orderList = orders.data ?? [];
  const revenue = orderList
    .filter((order) => order.status !== "cancelled")
    .reduce((total, order) => total + Number(order.total ?? 0), 0);
  const uniqueCustomers = new Set(orderList.map((order) => order.customerId)).size;
  const recentOrders = orderList.slice(0, 5);
  const topProducts = productList.slice(0, 5);

  return (
    <DashboardShell
      title="Dashboard-ka"
      subtitle={account?.storeName ?? undefined}
      navItems={NAV_ITEMS}
      activeKey="dashboard"
      notificationCount={notificationSummary.data?.unreadCount}
      onNotificationsPress={() => router.push("/notifications" as never)}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <MaterialIcons name="storefront" size={26} color={palette.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Ku soo dhawoow, {account?.fullName}!</Text>
          <Text style={styles.heroCopy}>Halkan waxaad ka maamuli kartaa dukaankaaga {account?.storeName}.</Text>
        </View>
      </View>

      {restricted ? (
        <View style={styles.restricted}>
          <MaterialIcons name="warning-amber" size={22} color={palette.warning} />
          <Text style={styles.restrictedText}>Commission payment is required. Your store cannot receive new orders until Super Admin verifies the commission.</Text>
        </View>
      ) : null}

      <View style={styles.statRow}>
        <StatCard icon="inventory-2" value={String(productList.length)} label="Alaabta" tint={palette.lavender} onPress={() => router.push("/store-products" as never)} />
        <StatCard icon="receipt-long" value={String(orderList.length)} label="Dalabyada" tint="#FFF1E4" onPress={() => router.push("/store-orders" as never)} />
        <StatCard icon="groups" value={String(uniqueCustomers)} label="Macaamiisha" tint="#E6F5EC" />
        <StatCard icon="attach-money" value={formatMoney(revenue)} label="Wadarta iibka" tint="#FFF5DE" />
      </View>

      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <DashboardPanel title="Dalabyada ugu dambeeyay" action={{ label: "Arag dhammaan", onPress: () => router.push("/store-orders" as never) }}>
            {recentOrders.length === 0 ? (
              <Text style={styles.emptyText}>Weli dalab kuma soo gelin dukaankaaga.</Text>
            ) : (
              recentOrders.map((order) => (
                <Pressable key={order.id} style={styles.orderRow} onPress={() => router.push({ pathname: "/order-detail" as never, params: { orderId: String(order.id) } })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderId}>#ORD-{order.id}</Text>
                    <Text style={styles.orderCustomer}>{order.customerName}</Text>
                  </View>
                  <StatusPill status={order.status} />
                  <View style={styles.orderAmount}>
                    <Text style={styles.orderTotal}>{formatMoney(Number(order.total))}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt as string)}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </DashboardPanel>
        </View>

        <View style={styles.column}>
          <DashboardPanel title="Alaabta dukaanka" action={{ label: "Arag dhammaan", onPress: () => router.push("/store-products" as never) }}>
            {topProducts.length === 0 ? (
              <Text style={styles.emptyText}>Weli alaab kuma darin dukaankaaga.</Text>
            ) : (
              topProducts.map((product) => (
                <View key={product.id} style={styles.productRow}>
                  {product.imageUrl ? (
                    <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.productImageFallback]}>
                      <MaterialIcons name="spa" size={18} color={palette.purple} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productStock}>{product.stock} stock ah</Text>
                  </View>
                </View>
              ))
            )}
          </DashboardPanel>
        </View>
      </View>
    </DashboardShell>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: palette.lavender, borderRadius: 22, padding: 20 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: palette.ink, fontSize: 19, fontWeight: "900" },
  heroCopy: { color: palette.muted, fontSize: 13, marginTop: 3 },
  restricted: { flexDirection: "row", gap: 9, alignItems: "center", backgroundColor: "#FFF5DE", borderColor: "#F2D38A", borderWidth: 1, borderRadius: 16, padding: 14 },
  restrictedText: { flex: 1, color: palette.warning, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  twoColumn: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  column: { flex: 1, minWidth: 320, gap: 14 },
  emptyText: { color: palette.muted, fontSize: 13 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.line },
  orderId: { color: palette.ink, fontSize: 13, fontWeight: "800" },
  orderCustomer: { color: palette.muted, fontSize: 12, marginTop: 2 },
  orderAmount: { alignItems: "flex-end" },
  orderTotal: { color: palette.ink, fontSize: 13, fontWeight: "800" },
  orderDate: { color: palette.muted, fontSize: 11, marginTop: 2 },
  productRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.line },
  productImage: { width: 40, height: 40, borderRadius: 12 },
  productImageFallback: { backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" },
  productName: { color: palette.ink, fontSize: 13, fontWeight: "800" },
  productStock: { color: palette.muted, fontSize: 11, marginTop: 2 },
});

const pillStyles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  pillText: { fontSize: 11, fontWeight: "800" },
});
