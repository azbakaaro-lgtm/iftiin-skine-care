import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Header, Page, palette, PrimaryButton } from "@/components/iftiin-ui";
import { trpc } from "@/lib/trpc";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const request = trpc.phase1.forgotPassword.useMutation();

  async function submit() {
    await request.mutateAsync({ email: email.trim() });
    setSent(true);
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Header title="Furaha sirta ah ma iloowday?" subtitle="Waxaan kuu dirri doonaa link" back={() => router.back()} />
        <Card style={styles.card}>
          {sent ? (
            <>
              <Text style={styles.title}>Email-ka waa la diray</Text>
              <Text style={styles.copy}>Haddii email-kan uu ku jiro nidaamkeenna, waxaad heli doontaa link aad ku dejin karto furaha sirta ah oo cusub. Fiiri sanduuqa "spam" haddii aadan wax arag dhawr daqiiqo gudahood.</Text>
              <PrimaryButton label="Ku noqo gelitaanka" onPress={() => router.replace("/login" as never)} />
            </>
          ) : (
            <>
              <Text style={styles.title}>Geli email-kaaga</Text>
              <Text style={styles.copy}>Waxaan kuu diri doonaa link aad ku dejin karto furaha sirta ah oo cusub.</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholderTextColor="#918FA0" />
              </View>
              <PrimaryButton label={request.isPending ? "Waa la dirayaa..." : "Dir link-a"} onPress={submit} disabled={!email.includes("@") || request.isPending} />
            </>
          )}
        </Card>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 32 },
  card: { gap: 12 },
  title: { color: palette.ink, fontSize: 18, fontWeight: "900" },
  copy: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  field: { gap: 6 },
  label: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 13, height: 50, color: palette.ink, backgroundColor: "#FFFFFF" },
});
