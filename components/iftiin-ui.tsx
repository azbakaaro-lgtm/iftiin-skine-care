import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";

export const palette = {
  purple: "#236B9A",
  purpleDark: "#163F5A",
  lavender: "#EDF7FF",
  blue: "#DFF1FF",
  paper: "#FFFFFF",
  ink: "#173047",
  muted: "#5A7183",
  line: "#D2E5F2",
  success: "#278A60",
  warning: "#B87618",
  danger: "#B84A5C",
};

export function Page({ children, noPadding = false }: { children: React.ReactNode; noPadding?: boolean }) {
  return <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-white" className={noPadding ? "" : "px-5"}>{children}</ScreenContainer>;
}

export function PrimaryButton({ label, onPress, icon, disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, disabled && styles.disabled, pressed && styles.pressed]}><View style={styles.buttonContent}>{icon ? <MaterialIcons name={icon} size={20} color="#FFFFFF" /> : null}<Text style={styles.primaryButtonText}>{label}</Text></View></Pressable>;
}

export function SecondaryButton({ label, onPress, icon, badge }: { label: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap; badge?: number }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><View style={styles.buttonContent}>{icon ? <MaterialIcons name={icon} size={20} color={palette.purple} /> : null}<Text style={styles.secondaryButtonText}>{label}</Text>{badge && badge > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text></View> : null}</View></Pressable>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) { return <View style={[styles.card, style]}>{children}</View>; }

export function Header({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  return <View style={styles.header}>{back ? <Pressable onPress={back} accessibilityLabel="Dib u noqo" style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={21} color={palette.ink} /></Pressable> : <View style={styles.brandDot}><MaterialIcons name="wb-sunny" size={17} color={palette.purple} /></View>}<View style={styles.headerCopy}><Text style={styles.headerTitle}>{title}</Text>{subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}</View></View>;
}

export function ProgressLine({ value }: { value: number }) { return <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, value))}%` }]} /></View>; }

export function EmptyState({ icon, title, detail, action }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string; action?: React.ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name={icon} size={30} color={palette.purple} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text>{action}</View>;
}

export function LoadingCare() { return <Page><View style={styles.loading}><ActivityIndicator color={palette.purple} size="large" /><Text style={styles.emptyDetail}>Iftiin Skin Care ayaa furmaya...</Text></View></Page>; }

const styles = StyleSheet.create({
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: palette.purple, justifyContent: "center", paddingHorizontal: 20, shadowColor: "#236B9A", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 9, elevation: 3 },
  secondaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: palette.lavender, justifyContent: "center", paddingHorizontal: 20, borderWidth: 1, borderColor: palette.line },
  buttonContent: { flexDirection: "row", gap: 9, justifyContent: "center", alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  secondaryButtonText: { color: palette.purple, fontSize: 16, fontWeight: "800" }, badge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: palette.purple, alignItems: "center", justifyContent: "center" }, badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] }, disabled: { opacity: 0.45 },
  card: { backgroundColor: palette.paper, borderRadius: 22, borderWidth: 1, borderColor: palette.line, padding: 17, shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingTop: 8, paddingBottom: 18, gap: 11 }, headerCopy: { flex: 1 }, headerTitle: { color: palette.ink, fontSize: 19, fontWeight: "800" }, headerSub: { color: palette.muted, fontSize: 12, marginTop: 2 }, back: { width: 38, height: 38, borderRadius: 14, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" }, brandDot: { width: 38, height: 38, borderRadius: 14, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" },
  progressTrack: { height: 7, backgroundColor: "#EAE8F5", borderRadius: 99, overflow: "hidden" }, progressFill: { height: "100%", backgroundColor: palette.purple, borderRadius: 99 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 }, emptyIcon: { width: 68, height: 68, borderRadius: 24, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" }, emptyTitle: { color: palette.ink, fontSize: 21, fontWeight: "800", textAlign: "center" }, emptyDetail: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: "center" }, loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
});
