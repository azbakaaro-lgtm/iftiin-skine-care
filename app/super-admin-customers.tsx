import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Header, LoadingCare, Page, palette } from "@/components/iftiin-ui";
import { RequireRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

export default function SuperAdminCustomers() { return <RequireRole role="super_admin"><Customers /></RequireRole>; }
function Customers() { const { session } = usePhaseSession(); const customers = trpc.phase1.listCustomers.useQuery({ sessionToken: session!.token }); if (customers.isLoading) return <LoadingCare />; return <Page><ScrollView contentContainerStyle={styles.scroll}><Header title="Macaamiisha" subtitle="Liiska akoonnada macaamiisha" back={() => router.back()} />{customers.data?.length ? customers.data.map((customer) => <Card key={customer.id} style={styles.card}><View style={styles.avatar}><MaterialIcons name="person" size={20} color={palette.purple} /></View><View style={{ flex: 1 }}><Text style={styles.name}>{customer.fullName}</Text><Text style={styles.detail}>{customer.email}</Text><Text style={styles.detail}>{customer.phoneNumber}</Text></View><Text style={styles.active}>Firfircoon</Text></Card>) : <Card><Text style={styles.empty}>Weli ma jiro akoon macmiil.</Text></Card>}</ScrollView></Page>; }
const styles = StyleSheet.create({ scroll: { gap: 12, paddingBottom: 30 }, card: { flexDirection: "row", alignItems: "center", gap: 10 }, avatar: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" }, name: { color: palette.ink, fontWeight: "900", fontSize: 14 }, detail: { color: palette.muted, fontSize: 11, marginTop: 3 }, active: { color: palette.success, fontSize: 10, fontWeight: "900" }, empty: { color: palette.muted, textAlign: "center", padding: 10 } });
