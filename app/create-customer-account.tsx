import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, Header, Page, palette, PrimaryButton, SecondaryButton } from "@/components/iftiin-ui";
import { somaliFormError } from "@/lib/form-errors";
import { usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

export default function CreateCustomerAccount() {
  const { setSession } = usePhaseSession();
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const register = trpc.phase1.registerCustomer.useMutation();

  async function submit() {
    setError("");
    if (password !== confirm) {
      setError("Labada furaha sirta ahi isma laha.");
      return;
    }
    try {
      const result = await register.mutateAsync({ fullName, phoneNumber, email, password });
      await setSession({ token: result.sessionToken, account: result.account });
      router.replace("/customer-home" as never);
    } catch (issue) {
      setError(somaliFormError(issue, "Akoonka lama abuuri karo."));
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Header title="Abuur akoon macmiil" back={() => router.back()} />
        <Text style={styles.copy}>Akoonkaaga macmiilku isla markiiba ayuu firfircoonaanayaa.</Text>
        <Card style={styles.form}>
          <Input label="Magaca oo buuxa" value={fullName} onChangeText={setFullName} />
          <Input label="Lambarka taleefanka" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
          <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Furaha sirta ah" value={password} onChangeText={setPassword} secureTextEntry />
          <Input label="Xaqiiji furaha sirta ah" value={confirm} onChangeText={setConfirm} secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={register.isPending ? "Waa la abuurayaa..." : "Abuur akoonka macmiilka"} onPress={submit} disabled={!fullName || !phoneNumber || !email || !password || !confirm || register.isPending} />
          <SecondaryButton label="Ku noqo gelitaanka" onPress={() => router.replace("/login" as never)} />
        </Card>
      </ScrollView>
    </Page>
  );
}

function Input({ label, ...props }: { label: string; value: string; onChangeText: (text: string) => void; secureTextEntry?: boolean; autoCapitalize?: "none"; keyboardType?: "phone-pad" | "email-address" }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor="#777777" /></View>;
}

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 32 },
  copy: { color: palette.muted, lineHeight: 20, fontSize: 13 },
  form: { gap: 11 }, field: { gap: 6 },
  label: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  input: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 13, height: 49, color: palette.ink },
  error: { color: palette.danger, fontSize: 12, lineHeight: 18 },
});
