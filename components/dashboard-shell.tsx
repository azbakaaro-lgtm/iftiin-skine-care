import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { palette } from "@/components/iftiin-ui";
import { showAlert } from "@/lib/alert";
import { usePhaseSession } from "@/lib/phase1-session";

export type DashboardNavItem = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: string;
  badge?: number;
};

const SIDEBAR_BREAKPOINT = 900;

function roleLabel(role?: string) {
  if (role === "super_admin") return "Maamule Sare";
  if (role === "store_admin") return "Maamule";
  return "Macmiil";
}

function SidebarBrand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandIcon}>
        <MaterialIcons name="wb-sunny" size={20} color={palette.purple} />
      </View>
      <View>
        <Text style={styles.brandTitle}>Iftiin</Text>
        <Text style={styles.brandSub}>Skin Care</Text>
      </View>
    </View>
  );
}

function SidebarNav({ navItems, activeKey, onNavigate }: { navItems: DashboardNavItem[]; activeKey: string; onNavigate?: () => void }) {
  return (
    <View style={styles.navList}>
      {navItems.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => {
              onNavigate?.();
              router.push(item.route as never);
            }}
            style={[styles.navItem, active ? styles.navItemActive : null]}
          >
            <MaterialIcons name={item.icon} size={20} color={active ? palette.purple : palette.muted} />
            <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>{item.label}</Text>
            {item.badge ? (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{item.badge > 99 ? "99+" : item.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function DashboardShell({
  title,
  subtitle,
  navItems,
  activeKey,
  notificationCount,
  onNotificationsPress,
  children,
}: {
  title: string;
  subtitle?: string;
  navItems: DashboardNavItem[];
  activeKey: string;
  notificationCount?: number;
  onNotificationsPress?: () => void;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const { session, logout } = usePhaseSession();
  const isWide = Platform.OS === "web" && width >= SIDEBAR_BREAKPOINT;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    showAlert("Ka bax", "Ma hubtaa inaad ka baxayso?", [
      { text: "Jooji", style: "cancel" },
      { text: "Ka bax", style: "destructive", onPress: () => { void logout(); router.replace("/login" as never); } },
    ]);
  };

  if (!isWide) {
    return (
      <View style={styles.mobileRoot}>
        <View style={styles.mobileTopBar}>
          <Pressable onPress={() => setMobileNavOpen(true)} style={styles.iconButton} accessibilityLabel="Menu">
            <MaterialIcons name="menu" size={24} color={palette.ink} />
          </Pressable>
          <Text style={styles.mobileTitle} numberOfLines={1}>{title}</Text>
          <Pressable onPress={onNotificationsPress} style={styles.iconButton} accessibilityLabel="Ogeysiisyada">
            <MaterialIcons name="notifications-none" size={22} color={palette.ink} />
            {notificationCount ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.mobileScroll}>{children}</ScrollView>
        {mobileNavOpen ? (
          <View style={styles.mobileNavOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMobileNavOpen(false)} accessibilityLabel="Xir" />
            <View style={styles.mobileNavPanel}>
              <SidebarBrand />
              <SidebarNav navItems={navItems} activeKey={activeKey} onNavigate={() => setMobileNavOpen(false)} />
              <Pressable onPress={handleLogout} style={styles.navItem}>
                <MaterialIcons name="logout" size={20} color={palette.muted} />
                <Text style={styles.navLabel}>Ka bax</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wideRoot}>
      <View style={styles.sidebar}>
        <SidebarBrand />
        <SidebarNav navItems={navItems} activeKey={activeKey} />
        <Pressable onPress={handleLogout} style={styles.navItem}>
          <MaterialIcons name="logout" size={20} color={palette.muted} />
          <Text style={styles.navLabel}>Ka bax</Text>
        </Pressable>
      </View>
      <View style={styles.mainArea}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.pageTitle}>{title}</Text>
            {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.topBarRight}>
            <Pressable onPress={onNotificationsPress} style={styles.bellButton} accessibilityLabel="Ogeysiisyada">
              <MaterialIcons name="notifications-none" size={22} color={palette.ink} />
              {notificationCount ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
                </View>
              ) : null}
            </Pressable>
            <View style={styles.avatarCircle}>
              <MaterialIcons name="person" size={20} color={palette.purple} />
            </View>
            <View>
              <Text style={styles.userName}>{session?.account.fullName}</Text>
              <Text style={styles.userRole}>{roleLabel(session?.account.role)}</Text>
            </View>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.contentScroll}>{children}</ScrollView>
      </View>
    </View>
  );
}

export function StatCard({ icon, value, label, tint, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; value: string; label: string; tint: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>
        <MaterialIcons name={icon} size={22} color={palette.purple} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      {onPress ? <MaterialIcons name="chevron-right" size={20} color={palette.muted} /> : null}
    </Pressable>
  );
}

export function DashboardPanel({ title, action, children }: { title: string; action?: { label: string; onPress: () => void }; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        {action ? (
          <Pressable onPress={action.onPress}>
            <Text style={styles.panelAction}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileRoot: { flex: 1, backgroundColor: "#FFFFFF" },
  mobileTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: palette.line, gap: 10 },
  mobileTitle: { flex: 1, color: palette.ink, fontSize: 17, fontWeight: "900" },
  mobileScroll: { padding: 16, gap: 14, paddingBottom: 40 },
  iconButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.lavender },
  mobileNavOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  mobileNavPanel: { position: "absolute", top: 0, bottom: 0, left: 0, width: 270, backgroundColor: "#FFFFFF", paddingTop: 60, paddingHorizontal: 16, paddingBottom: 20, gap: 4, shadowColor: "#000000", shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 },

  wideRoot: { flex: 1, flexDirection: "row", backgroundColor: "#F5F8FA", minHeight: "100%" as unknown as number },
  sidebar: { width: 250, backgroundColor: "#FFFFFF", borderRightWidth: 1, borderRightColor: palette.line, paddingVertical: 24, paddingHorizontal: 16, gap: 4 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingBottom: 22, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: palette.line },
  brandIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" },
  brandTitle: { color: palette.ink, fontSize: 16, fontWeight: "900", lineHeight: 18 },
  brandSub: { color: palette.muted, fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  navList: { gap: 2, flex: 1 },
  navItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12 },
  navItemActive: { backgroundColor: palette.lavender },
  navLabel: { color: palette.muted, fontSize: 14, fontWeight: "700", flex: 1 },
  navLabelActive: { color: palette.purple, fontWeight: "900" },
  navBadge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: palette.purple, alignItems: "center", justifyContent: "center" },
  navBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },

  mainArea: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 32, paddingVertical: 22, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: palette.line },
  pageTitle: { color: palette.ink, fontSize: 22, fontWeight: "900" },
  pageSubtitle: { color: palette.muted, fontSize: 12, marginTop: 2 },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  bellButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: palette.lavender },
  bellBadge: { position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: palette.danger, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  bellBadgeText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" },
  userName: { color: palette.ink, fontSize: 13, fontWeight: "800" },
  userRole: { color: palette.muted, fontSize: 11 },
  contentScroll: { padding: 32, gap: 20, maxWidth: 1200, width: "100%", alignSelf: "center" },

  statCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 16, minWidth: 220, flexGrow: 1 },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  statValue: { color: palette.ink, fontSize: 22, fontWeight: "900" },
  statLabel: { color: palette.muted, fontSize: 12, marginTop: 2 },

  panel: { backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: palette.line, padding: 20, gap: 14 },
  panelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  panelTitle: { color: palette.ink, fontSize: 16, fontWeight: "900" },
  panelAction: { color: palette.purple, fontSize: 13, fontWeight: "800" },
});
