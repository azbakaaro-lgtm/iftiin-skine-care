import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LoadingCare, palette } from "@/components/iftiin-ui";
import { DashboardNavItem, DashboardPanel, DashboardShell, QuickLinkCard } from "@/components/dashboard-shell";
import { RequireRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/lib/language-context";

export default function CustomerHome() {
  return (
    <RequireRole role="customer">
      <Home />
    </RequireRole>
  );
}

function navItems(copy: ReturnType<typeof getCopy>): DashboardNavItem[] {
  return [
    { key: "home", label: copy.title, icon: "space-dashboard", route: "/customer-home" },
    { key: "journey", label: copy.journey, icon: "face-3", route: "/skin-journey" },
    { key: "stores", label: copy.stores, icon: "storefront", route: "/customer-stores" },
    { key: "cart", label: copy.cart, icon: "shopping-cart", route: "/cart" },
    { key: "orders", label: copy.orders, icon: "receipt-long", route: "/my-orders" },
    { key: "profile", label: copy.profile, icon: "person", route: "/account-profile" },
  ];
}

function getCopy(language: "so" | "en") {
  return language === "en"
    ? { title: "Customer home", subtitle: "Stores, Skin Journey, cart and orders", welcome: "Welcome", intro: "Start your Skin Journey to receive a recommended product, then unlock your routine and progress after payment is confirmed.", gate: "Full results, routines and Daily Scan unlock only after the Store Admin confirms payment for your recommended product.", results: "Open my Skin Analysis", journey: "Skin Journey", stores: "Stores", cart: "Cart", orders: "My orders", alerts: "Notifications", profile: "My profile" }
    : { title: "Hoyga macmiilka", subtitle: "Dukaan, Skin Journey, cart iyo dalabyo", welcome: "Ku soo dhawoow", intro: "Bilow Skin Journey si aad u hesho product laguu doortay, kadibna u fur routine iyo horumarkaaga marka lacagta la xaqiijiyo.", gate: "Natiijada buuxda, routine-ka, iyo Daily Scan waxay furmayaan oo keliya marka Store Admin uu xaqiijiyo lacag-bixinta product-ka laguu doortay.", results: "Fur Skin Analysis-kayga", journey: "Skin Journey", stores: "Dukaamada", cart: "Cart-ka", orders: "Dalabyadayda", alerts: "Ogeysiisyada", profile: "Qoraalkayga" };
}

function Home() {
  const { session } = usePhaseSession();
  const { language } = useLanguage();
  const copy = getCopy(language);
  const home = trpc.phase1.customerHome.useQuery({ sessionToken: session!.token });
  const notificationSummary = trpc.phase1.notificationSummary.useQuery({ sessionToken: session!.token });
  const unlockedJourney = trpc.phase1.latestUnlockedSkinJourney.useQuery({ sessionToken: session!.token });

  if (home.isLoading) return <LoadingCare />;

  return (
    <DashboardShell
      title={copy.title}
      subtitle={copy.subtitle}
      navItems={navItems(copy)}
      activeKey="home"
      notificationCount={notificationSummary.data?.unreadCount}
      onNotificationsPress={() => router.push("/notifications" as never)}
    >
      <View style={styles.hero}>
        <View style={styles.icon}>
          <MaterialIcons name="shopping-bag" size={26} color={palette.purple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{copy.welcome}, {home.data?.account.fullName}</Text>
          <Text style={styles.copy}>{copy.intro}</Text>
        </View>
      </View>

      <View style={styles.gate}>
        <MaterialIcons name="lock-outline" size={20} color={palette.purple} />
        <Text style={styles.gateText}>{copy.gate}</Text>
      </View>

      <View style={styles.quickRow}>
        <QuickLinkCard icon="face-3" label={copy.journey} tint={palette.lavender} onPress={() => router.push("/skin-journey" as never)} />
        <QuickLinkCard icon="storefront" label={copy.stores} tint="#FFF1E4" onPress={() => router.push("/customer-stores" as never)} />
        <QuickLinkCard icon="shopping-cart" label={copy.cart} tint="#E6F5EC" onPress={() => router.push("/cart" as never)} />
        <QuickLinkCard icon="receipt-long" label={copy.orders} tint="#FFF5DE" onPress={() => router.push("/my-orders" as never)} />
      </View>

      {unlockedJourney.data ? (
        <DashboardPanel title={copy.results} action={{ label: copy.results, onPress: () => router.push({ pathname: "/skin-results" as never, params: { journeyId: String(unlockedJourney.data!.id) } }) }}>
          <Text style={styles.panelCopy}>{copy.intro}</Text>
        </DashboardPanel>
      ) : null}
    </DashboardShell>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: palette.blue, borderRadius: 22, padding: 20 },
  icon: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  title: { color: palette.ink, fontSize: 19, fontWeight: "900" },
  copy: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  gate: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: palette.lavender, borderRadius: 16, padding: 14 },
  gateText: { color: palette.ink, fontSize: 12, lineHeight: 18, flex: 1 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  panelCopy: { color: palette.muted, fontSize: 13, lineHeight: 19 },
});
