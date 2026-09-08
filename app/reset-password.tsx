import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, Header, Page, palette, PrimaryButton } from "@/components/iftiin-ui";
import { routeForRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

export default function ResetPassword() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { setSession } = usePhaseSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const reset = trpc.phase1.resetPassword.useMutation();

  async function submit() {
    setError("");
    if (!token) {
      setError("Link-gan waa mid qalad ah. Dalbo mid cusub bogga 'Furaha sirta ah ma iloowday'.");
      return;
    }
    if (password.length < 8) {
      setError("Furaha sirta ahi waa inuu ahaadaa ugu yaraan 8 xaraf.");
      return;
    }
    if (password !== confirm) {
      setError("Labada furaha sirta ah isku mid ma aha.");
      return;
    }
    try {
      const result = await reset.mutateAsync({ token, password });
      await setSession({ token: result.sessionToken, account: result.account });
      router.replace(routeForRole(result.account.role) as never);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Furaha sirta ah lama dejin karo.");
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Header title="Dejinta furaha sirta ah oo cusub" subtitle="Geli furaha sirta ah oo cusub" back={() => router.back()} />
        <Card style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Furaha sirta ah oo cusub</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholderTextColor="#918FA0" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Xaqiiji furaha sirta ah</Text>
            <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry style={styles.input} placeholderTextColor="#918FA0" />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={reset.isPending ? "Waa la dejinayaa..." : "Dejii furaha cusub"} onPress={submit} disabled={!password || !confirm || reset.isPending} />
        </Card>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 32 },
  card: { gap: 12 },
  field: { gap: 6 },
  label: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 13, height: 50, color: palette.ink, backgroundColor: "#FFFFFF" },
  error: { color: "#A5264B", fontSize: 12, lineHeight: 17 },
});
