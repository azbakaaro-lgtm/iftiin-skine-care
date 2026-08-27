import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Header, Page, palette, PrimaryButton } from "@/components/iftiin-ui";
import { usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

// One-time setup screen: creates the first super-admin account.
// Requires OWNER_SETUP_KEY to be set on the server. After you've created
// your super-admin account, unset/rotate that env var so this can't be
// used again.
export default function AdminBootstrap() {
  const { setSession } = usePhaseSession();
  const [setupKey, setSetupKey] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const bootstrap = trpc.phase1.bootstrapSuperAdmin.useMutation();

  async function submit() {
    setError("");
    try {
      const result = await bootstrap.mutateAsync({ setupKey: setupKey.trim(), email: email.trim(), password });
      await setSession({ token: result.sessionToken, account: result.account });
      router.replace("/super-admin-dashboard" as never);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Maamulaha Sare lama xaqiijin karo.");
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Header title="Dejinta Maamulaha Sare" subtitle="Habka kaliya ee la sameeyo" />
        <Card style={styles.card}>
          <Text style={styles.title}>Abuur akoonka Maamulaha Sare</Text>
          <Text style={styles.copy}>Geli furaha dejinta (OWNER_SETUP_KEY) ee server-ka lagu dejiyay, email, iyo password. Tan waxaa loo isticmaalaa hal mar kaliya.</Text>
          <Field label="Furaha dejinta" value={setupKey} onChangeText={setSetupKey} autoCapitalize="none" secureTextEntry />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <Field label="Furaha sirta ah" value={password} onChangeText={setPassword} secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label={bootstrap.isPending ? "Waa la abuurayaa..." : "Abuur"}
            onPress={submit}
            disabled={!setupKey || !email || !password || bootstrap.isPending}
          />
          {bootstrap.isPending ? <ActivityIndicator color={palette.purple} /> : null}
        </Card>
      </ScrollView>
    </Page>
  );
}

function Field({ label, ...props }: { label: string; value: string; onChangeText: (text: string) => void; secureTextEntry?: boolean; autoCapitalize?: "none" | "sentences" }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={styles.input} placeholderTextColor="#918FA0" />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 32 },
  card: { gap: 12 },
  title: { color: palette.ink, fontSize: 18, fontWeight: "900" },
  copy: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  field: { gap: 6 },
  label: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 13, height: 50, color: palette.ink, backgroundColor: "#FFFFFF" },
  error: { color: "#A5264B", fontSize: 12, lineHeight: 17 },
});
