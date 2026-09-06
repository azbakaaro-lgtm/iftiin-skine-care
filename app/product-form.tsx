import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getApiBaseUrl } from "@/constants/oauth";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { showAlert } from "@/lib/alert";
import { Card, Header, LoadingCare, Page, palette, PrimaryButton, SecondaryButton } from "@/components/iftiin-ui";
import { RequireRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

const categories = ["Cleanser", "Moisturizer", "Serum", "Sunscreen", "Treatment", "Kale"];
type DiscountType = "none" | "percentage" | "fixed";
type Form = {
  name: string;
  brand: string;
  category: string;
  description: string;
  usageInstructions: string;
  originalPrice: string;
  discountType: DiscountType;
  discountValue: string;
  stock: string;
  availability: boolean;
  imageData?: string;
  imagePreview?: string;
};
const initial: Form = { name: "", brand: "", category: "Cleanser", description: "", usageInstructions: "", originalPrice: "", discountType: "none", discountValue: "0", stock: "0", availability: true };

export default function ProductFormScreen() {
  return (
    <RequireRole role="store_admin">
      <ProductForm />
    </RequireRole>
  );
}

function ProductForm() {
  const { session } = usePhaseSession();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const [form, setForm] = useState<Form>(initial);
  const [loadingImage, setLoadingImage] = useState(false);
  const [scanningLabel, setScanningLabel] = useState(false);
  const [error, setError] = useState("");
  const products = trpc.phase1.storeProducts.useQuery({ sessionToken: session!.token });
  const product = products.data?.find((item) => String(item.id) === productId);
  const create = trpc.phase1.createProduct.useMutation();
  const update = trpc.phase1.updateProduct.useMutation();
  const scanLabel = trpc.phase1.scanProductLabel.useMutation();

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        brand: product.brand,
        category: product.category,
        description: product.description ?? "",
        usageInstructions: product.usageInstructions ?? "",
        originalPrice: String(product.originalPrice),
        discountType: product.discountType,
        discountValue: String(product.discountValue),
        stock: String(product.stock),
        availability: product.availability,
        imagePreview: product.imageUrl ? `${getApiBaseUrl()}${product.imageUrl}` : undefined,
      });
    }
  }, [product]);

  const finalPrice = useMemo(() => {
    const base = Math.max(0, Number(form.originalPrice) || 0);
    const value = Math.max(0, Number(form.discountValue) || 0);
    return form.discountType === "percentage" ? Math.max(0, base - Math.round((base * Math.min(value, 100)) / 100)) : form.discountType === "fixed" ? Math.max(0, base - value) : base;
  }, [form.originalPrice, form.discountType, form.discountValue]);

  const change = <K extends keyof Form>(key: K, value: Form[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function prepare(uri: string) {
    setLoadingImage(true);
    try {
      const ready = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], { compress: 0.68, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!ready.base64) throw new Error("Sawirka lama diyaarin karo.");
      change("imageData", `data:image/jpeg;base64,${ready.base64}`);
      change("imagePreview", ready.uri);
    } catch (issue) {
      showAlert("Sawirka lama gelin karo", issue instanceof Error ? issue.message : "Mar kale isku day.");
    } finally {
      setLoadingImage(false);
    }
  }

  async function choose(camera: boolean) {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        showAlert("Oggolaansho loo baahan yahay", "Kamaradda waxaa loo isticmaalaa oo keliya sawirka product-ka.");
        return;
      }
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true });
    if (!result.canceled) await prepare(result.assets[0].uri);
  }

  // Reads whatever is printed on the product package (usage instructions,
  // warnings, key ingredients) and drops the result into the editable
  // "usageInstructions" field below. The admin can then correct or clear
  // the text before saving — nothing is written to the product until they
  // press "Kaydi".
  async function scanPackage(camera: boolean) {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        showAlert("Oggolaansho loo baahan yahay", "Kamaradda waxaa loo isticmaalaa oo keliya sawirka baakadka.");
        return;
      }
    }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.85, base64: true });
    if (result.canceled) return;

    setScanningLabel(true);
    try {
      const ready = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1000 } }], { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!ready.base64) throw new Error("Sawirka lama diyaarin karo.");
      const scanned = await scanLabel.mutateAsync({ sessionToken: session!.token, labelImage: `data:image/jpeg;base64,${ready.base64}` });
      if (!scanned.qoraalka) {
        showAlert("Sawirka uma cadda", "Baakadka qoraalkiisu si cad uma soo bixin sawirka. Isku day sawir iftiin wanaagsan leh.");
        return;
      }
      change("usageInstructions", scanned.qoraalka);
    } catch (issue) {
      showAlert("Baakadka lama akhrin karo", issue instanceof Error ? issue.message : "Mar kale isku day.");
    } finally {
      setScanningLabel(false);
    }
  }

  function clearUsageInstructions() {
    showAlert("Tirtir qoraalka", "Ma hubtaa inaad tirtirto qoraalka baakadka? Waxaad markale ku soo celin kartaa sawir cusub.", [
      { text: "Jooji", style: "cancel" },
      { text: "Tirtir", style: "destructive", onPress: () => change("usageInstructions", "") },
    ]);
  }

  async function submit() {
    setError("");
    const payload = {
      sessionToken: session!.token,
      name: form.name,
      brand: form.brand,
      category: form.category,
      description: form.description || null,
      usageInstructions: form.usageInstructions || null,
      originalPrice: Math.round(Number(form.originalPrice)),
      discountType: form.discountType,
      discountValue: Math.round(Number(form.discountValue) || 0),
      stock: Math.max(0, Math.round(Number(form.stock) || 0)),
      availability: form.availability,
      imageData: form.imageData ?? null,
    };
    if (!payload.name || !payload.brand || !Number.isFinite(payload.originalPrice) || payload.originalPrice < 0) {
      setError("Buuxi magaca, brand-ka, iyo qiimaha saxda ah.");
      return;
    }
    try {
      if (productId) await update.mutateAsync({ ...payload, productId: Number(productId) });
      else await create.mutateAsync(payload);
      router.replace("/store-products" as never);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Product-ka lama kaydin karo.");
    }
  }

  if (productId && products.isLoading) return <LoadingCare />;

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Header title={productId ? "Wax ka beddel product" : "Ku dar product"} subtitle="Description-ku waa ikhtiyaari" back={() => router.back()} />

        <Card style={styles.imageCard}>
          <View style={styles.preview}>
            {form.imagePreview ? <Image source={{ uri: form.imagePreview }} style={styles.previewImage} /> : <MaterialIcons name="image" size={38} color={palette.purple} />}
          </View>
          <View style={styles.imageActions}>
            <Text style={styles.imageTitle}>Sawirka product-ka</Text>
            <Text style={styles.imageText}>Ka qaad kamaradda ama ka dooro gallery-ga.</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}><SecondaryButton label="Kamarad" icon="photo-camera" onPress={() => choose(true)} /></View>
              <View style={{ flex: 1 }}><SecondaryButton label="Gallery" icon="photo-library" onPress={() => choose(false)} /></View>
            </View>
            {loadingImage ? <Text style={styles.loading}>Sawirka waa la diyaarinayaa...</Text> : null}
          </View>
        </Card>

        <Card style={styles.form}>
          <Field label="Magaca product-ka" value={form.name} onChangeText={(value) => change("name", value)} />
          <Field label="Brand" value={form.brand} onChangeText={(value) => change("brand", value)} />
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {categories.map((item) => (
              <Pressable key={item} onPress={() => change("category", item)} style={[styles.categoryChip, form.category === item && styles.categoryOn]}>
                <Text style={[styles.categoryText, form.category === item && styles.categoryTextOn]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Description (ikhtiyaari)" value={form.description} onChangeText={(value) => change("description", value)} multiline />

          <View style={styles.labelBlock}>
            <Text style={styles.label}>Qoraalka baakadka (sida loo isticmaalo)</Text>
            <Text style={styles.imageText}>U sawir baakadka product-ka — AI-gu wuxuu ku akhrin doonaa qoraalka oo ku soo qori doonaa sanduuqa hoose. Waad wax ka bedbeddeli kartaa ama tirtiri kartaa ka hor intaadan kaydin.</Text>
            <View style={styles.row}>
              <View style={{ flex: 1 }}><SecondaryButton label="Sawir Baakadka (AI)" icon="document-scanner" onPress={() => scanPackage(true)} /></View>
              <View style={{ flex: 1 }}><SecondaryButton label="Gallery" icon="photo-library" onPress={() => scanPackage(false)} /></View>
            </View>
            {scanningLabel ? <Text style={styles.loading}>Baakadka waa la akhrinayaa...</Text> : null}
            <TextInput
              value={form.usageInstructions}
              onChangeText={(value) => change("usageInstructions", value)}
              multiline
              placeholder="Tusaale: Niacinamide 10% + TXA 4% Serum: ku mari sida ku qoran baakadka."
              placeholderTextColor="#918FA0"
              style={[styles.input, styles.textarea]}
            />
            {form.usageInstructions ? <SecondaryButton label="Tirtir qoraalka" icon="delete-outline" onPress={clearUsageInstructions} /> : null}
          </View>

          <Field label="Qiimaha asalka ah" value={form.originalPrice} onChangeText={(value) => change("originalPrice", value)} keyboardType="numeric" />
          <Text style={styles.label}>Discount</Text>
          <View style={styles.categoryRow}>
            {(["none", "percentage", "fixed"] as DiscountType[]).map((type) => (
              <Pressable key={type} onPress={() => change("discountType", type)} style={[styles.categoryChip, form.discountType === type && styles.categoryOn]}>
                <Text style={[styles.categoryText, form.discountType === type && styles.categoryTextOn]}>{type === "none" ? "Maya" : type === "percentage" ? "Boqolkiiba" : "Lacag go’an"}</Text>
              </Pressable>
            ))}
          </View>
          {form.discountType !== "none" ? (
            <Field label={form.discountType === "percentage" ? "Boqolkiiba discount" : "Lacagta discount"} value={form.discountValue} onChangeText={(value) => change("discountValue", value)} keyboardType="numeric" />
          ) : null}
          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>Qiimaha kama dambaysta ah</Text>
            <Text style={styles.price}>{finalPrice}</Text>
          </View>
          <Field label="Stock (xabo)" value={form.stock} onChangeText={(value) => change("stock", value)} keyboardType="numeric" />
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Availability</Text>
              <Text style={styles.switchText}>{form.availability ? "Product-kan waa la heli karaa" : "Product-kan waa qarsoon yahay"}</Text>
            </View>
            <Switch value={form.availability} onValueChange={(value) => change("availability", value)} trackColor={{ false: "#D8D4E7", true: "#BEB6FF" }} thumbColor={form.availability ? palette.purple : "#FFFFFF"} />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label={create.isPending || update.isPending ? "Waa la kaydinayaa..." : productId ? "Kaydi isbeddelka" : "Kaydi product-ka"}
            onPress={submit}
            disabled={create.isPending || update.isPending || loadingImage}
          />
        </Card>
      </ScrollView>
    </Page>
  );
}

function Field({ label, multiline, ...props }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "numeric"; multiline?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.textarea]} placeholderTextColor="#918FA0" />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 30 },
  imageCard: { flexDirection: "row", gap: 12 },
  preview: { width: 102, height: 102, borderRadius: 20, backgroundColor: palette.lavender, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  previewImage: { width: "100%", height: "100%" },
  imageActions: { flex: 1, gap: 5 },
  imageTitle: { color: palette.ink, fontSize: 14, fontWeight: "900" },
  imageText: { color: palette.muted, fontSize: 11, lineHeight: 16 },
  row: { flexDirection: "row", gap: 7, marginTop: 4 },
  loading: { color: palette.purple, fontSize: 11, fontWeight: "800" },
  form: { gap: 12 },
  field: { gap: 6 },
  labelBlock: { gap: 6, paddingVertical: 4, borderTopWidth: 1, borderTopColor: palette.line, borderBottomWidth: 1, borderBottomColor: palette.line, paddingBottom: 12, marginBottom: 2 },
  label: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  input: { borderWidth: 1, borderColor: palette.line, borderRadius: 14, height: 49, color: palette.ink, paddingHorizontal: 13 },
  textarea: { minHeight: 86, height: "auto", paddingTop: 12, textAlignVertical: "top" },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  categoryChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 11, borderWidth: 1, borderColor: palette.line, backgroundColor: "#F8F7FC" },
  categoryOn: { backgroundColor: palette.lavender, borderColor: palette.purple },
  categoryText: { color: palette.muted, fontSize: 11, fontWeight: "800" },
  categoryTextOn: { color: palette.purple },
  priceBox: { padding: 14, borderRadius: 15, backgroundColor: palette.blue, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceLabel: { color: palette.ink, fontSize: 12, fontWeight: "900" },
  price: { color: palette.purple, fontSize: 22, fontWeight: "900" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  switchText: { color: palette.muted, fontSize: 11, marginTop: 3 },
  error: { color: "#A5264B", fontSize: 12, lineHeight: 17 },
});
