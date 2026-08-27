import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Header, LoadingCare, Page, palette, PrimaryButton } from "@/components/iftiin-ui";
import { RequireRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

export default function StorePaymentSettingsScreen() {
  return <RequireRole role="store_admin"><StorePaymentSettingsContent /></RequireRole>;
}

function StorePaymentSettingsContent() {
  const { session } = usePhaseSession();
  const settings = trpc.phase1.storePaymentSettings.useQuery({ sessionToken: session!.token });
  const save = trpc.phase1.saveStorePaymentSettings.useMutation();
  const [evc, setEvc] = useState("");
  const [edahab, setEdahab] = useState("");
  const [premier, setPremier] = useState("");
  const [merchant, setMerchant] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!settings.data) return;
    setEvc(settings.data.evcPlusAccount ?? "");
    setEdahab(settings.data.edahabAccount ?? "");
    setPremier(settings.data.premierWalletAccount ?? "");
    setMerchant(settings.data.merchantAccount ?? "");
  }, [settings.data]);

  if (settings.isLoading) return <LoadingCare />;
  const noticeStyle = notice.startsWith("Xogta") ? styles.success : styles.error;

  async function submit() {
    setNotice("");
    try {
      await save.mutateAsync({ sessionToken: session!.token, evcPlusAccount: evc, edahabAccount: edahab, premierWalletAccount: premier, merchantAccount: merchant });
      setNotice("Xogta lacag-helidda waa la kaydiyey.");
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "Xogta lama kaydin karo.");
    }
  }

  return <Page><ScrollView contentContainerStyle={styles.scroll}>
    <Header title="Dejinta lacagaha" subtitle="Ku dar akoonnada dukaankaagu lacag ku helo" back={() => router.back()} />
    <Card style={styles.hero}>
      <View style={styles.heroIcon}><MaterialIcons name="account-balance-wallet" size={27} color={palette.purple} /></View>
      <View style={styles.heroCopy}><Text style={styles.heroTitle}>Xog lacag-helid</Text><Text style={styles.heroText}>Macmiilku wuxuu arki doonaa oo keliya hababka aad halkan ku kaydiso. Lacagta adiga ayaa akoonkaaga ka xaqiijinaya.</Text></View>
    </Card>
    <Card style={styles.form}>
      <Field label="EVC Plus number" value={evc} onChange={setEvc} placeholder="Tusaale: 63xxxxxxx" />
      <Field label="eDahab number" value={edahab} onChange={setEdahab} placeholder="Tusaale: 63xxxxxxx" />
      <Field label="Premier Wallet number" value={premier} onChange={setPremier} placeholder="Tusaale: 63xxxxxxx" />
      <Field label="Merchant number / account" value={merchant} onChange={setMerchant} placeholder="Tusaale: Merchant ID ama number" />
      {notice ? <Text style={noticeStyle}>{notice}</Text> : null}
      <PrimaryButton label={save.isPending ? "Waa la kaydinayaa..." : "Kaydi akoonnada lacagta"} icon="save" onPress={submit} disabled={save.isPending} />
    </Card>
  </ScrollView></Page>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#918FA0" keyboardType="phone-pad" style={styles.input} /></View>;
}

const styles = StyleSheet.create({ scroll: { gap: 14, paddingBottom: 30 }, hero: { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: palette.lavender }, heroIcon: { height: 52, width: 52, borderRadius: 18, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }, heroCopy: { flex: 1 }, heroTitle: { color: palette.ink, fontSize: 16, fontWeight: "900" }, heroText: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 3 }, form: { gap: 14 }, field: { gap: 6 }, label: { color: palette.ink, fontSize: 12, fontWeight: "900" }, input: { height: 49, borderRadius: 14, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 13, color: palette.ink }, success: { color: palette.success, fontSize: 12, fontWeight: "800" }, error: { color: "#A5264B", fontSize: 12, fontWeight: "800" } });
