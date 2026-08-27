import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, EmptyState, Header, LoadingCare, Page, palette, PrimaryButton, SecondaryButton } from "@/components/iftiin-ui";
import { trpc } from "@/lib/trpc";
import { useCare } from "@/lib/skin-care-context";

type Result = {
  imageIndex: number;
  productName: string;
  brand: string;
  observedText: string;
  visibleIngredients: string[];
  category: string;
  profileFit: string;
  rationale: string;
  recommendation: "Keep" | "Review" | "Not enough information";
  confidence: "clear" | "partial" | "unclear";
};

type Target = { kind: "face" } | { kind: "product"; index: number };

export default function ProductScannerScreen() {
  const { hydrated, assessment } = useCare();
  const [faceUri, setFaceUri] = useState(assessment?.photoUri ?? "");
  const [productUris, setProductUris] = useState<string[]>([]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const scan = trpc.productScanner.analyze.useMutation();
  if (!hydrated) return <LoadingCare />;
  if (!assessment) return <Page><EmptyState icon="spa" title="Marka hore samee sawirka wejiga" detail="Baadhaha alaabtu wuxuu isticmaalaa qoraalka maqaarkaaga iyo jawaabahaaga si uu u bixiyo natiijo ku habboon." action={<PrimaryButton label="Bilow sawirka wejiga" icon="photo-camera" onPress={() => router.navigate("/(tabs)/scan" as never)} />} /></Page>;
  const scannerProfile = assessment.profile;

  async function chooseImage(target: Target, camera: boolean) {
    if (camera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") { Alert.alert("Oggolaansho loo baahan yahay", "Kamaradda waxaa loo isticmaalaa oo keliya sawirka wajigaaga ama product-ka aad rabto inaad hubiso."); return; }
    }
    const response = camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.75, cameraType: target.kind === "face" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.75 });
    if (response.canceled) return;
    const uri = response.assets[0].uri;
    if (target.kind === "face") setFaceUri(uri);
    else setProductUris((current) => {
      const next = [...current];
      if (target.index >= next.length) next.push(uri); else next[target.index] = uri;
      return next.slice(0, 4);
    });
    setResults(null);
    setError("");
  }

  async function compactImage(uri: string) {
    const source = Platform.OS === "web" && uri.startsWith("data:") ? uri : uri;
    let output = await ImageManipulator.manipulateAsync(source, [{ resize: { width: 512 } }], { compress: 0.45, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    if (!output.base64 || output.base64.length > 340000) {
      output = await ImageManipulator.manipulateAsync(source, [{ resize: { width: 400 } }], { compress: 0.35, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    }
    if (!output.base64 || output.base64.length > 340000) throw new Error("Sawirku aad ayuu u weyn yahay. Fadlan sawir ka cad oo dhow qaad.");
    return `data:image/jpeg;base64,${output.base64}`;
  }

  async function startScan() {
    if (!faceUri || productUris.length === 0) return;
    setPreparing(true);
    setError("");
    try {
      const [faceImage, ...productImages] = await Promise.all([faceUri, ...productUris].map(compactImage));
      const response = await scan.mutateAsync({
        faceImage,
        productImages,
        profile: scannerProfile,
      });
      setResults(response as Result[]);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Scan-ku hadda ma dhammaystirmi karo. Fadlan isku day mar kale.");
    } finally {
      setPreparing(false);
    }
  }

  if (results) return <ResultsScreen results={results} productUris={productUris} restart={() => { setResults(null); setProductUris([]); }} />;
  return <Page><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}><Header title="Baadhaha alaabta" subtitle="Waa ka duwan yahay sawirka wejiga, balse wuxuu adeegsanayaa qoraalka maqaarkaaga" back={() => router.back()} /><Card style={styles.info}><MaterialIcons name="auto-awesome" size={20} color={palette.purple} /><Text style={styles.infoText}>Ku dar sawirka wejigaaga iyo 1–4 sawir oo alaab ah. Sawirrada alaabta waxaa loo diraa baadhistan oo keliya si qoraalka muuqda loo akhriyo; waxyaabaha ku jira lama qiyaaso haddii qoraalku uusan caddayn.</Text></Card><Text style={styles.sectionTitle}>1. Sawirka wejiga iyo qoraalka maqaarka</Text><PhotoPicker label="Sawirka wejiga" detail="Waxa lala adeegsanayaa jawaabahaaga" uri={faceUri} onCamera={() => chooseImage({ kind: "face" }, true)} onGallery={() => chooseImage({ kind: "face" }, false)} /><Text style={styles.sectionTitle}>2. Sawirrada alaabta (1–4)</Text><Text style={styles.help}>Sawir qoraalka hore iyo liiska waxyaabaha ku jira ee dambe haddii aad rabto xog ka cad.</Text><View style={styles.productGrid}>{[0, 1, 2, 3].map((index) => <ProductSlot key={index} index={index} uri={productUris[index]} active={index <= productUris.length} onCamera={() => chooseImage({ kind: "product", index }, true)} onGallery={() => chooseImage({ kind: "product", index }, false)} onRemove={() => setProductUris((current) => current.filter((_, currentIndex) => currentIndex !== index))} />)}</View>{error ? <Text style={styles.error}>{error}</Text> : null}<PrimaryButton label={preparing || scan.isPending ? "BAADHISTU WAY SOCOTAA..." : "BILOW BAADHISTA"} icon="document-scanner" disabled={!faceUri || productUris.length === 0 || preparing || scan.isPending} onPress={startScan} /><Text style={styles.note}>Natiijooyinka waa talo daryeel maqaarka oo guud, mana aha baaritaan caafimaad.</Text></ScrollView></Page>;
}

function PhotoPicker({ label, detail, uri, onCamera, onGallery }: { label: string; detail: string; uri: string; onCamera: () => void; onGallery: () => void }) { return <Card style={styles.photoPicker}>{uri ? <Image source={{ uri }} style={styles.faceImage} /> : <View style={styles.facePlaceholder}><MaterialIcons name="face-3" size={38} color={palette.purple} /></View>}<View style={{ flex: 1, gap: 7 }}><Text style={styles.pickerTitle}>{label}</Text><Text style={styles.pickerDetail}>{detail}</Text><View style={styles.pickerActions}><MiniAction icon="photo-camera" label="Kamarad" onPress={onCamera} /><MiniAction icon="photo-library" label="Kayd" onPress={onGallery} /></View></View></Card>; }
function ProductSlot({ index, uri, active, onCamera, onGallery, onRemove }: { index: number; uri?: string; active: boolean; onCamera: () => void; onGallery: () => void; onRemove: () => void }) { if (!active) return <View style={styles.disabledSlot}><MaterialIcons name="add-photo-alternate" size={23} color="#B7B2CC" /><Text style={styles.disabledText}>Meel {index + 1}</Text></View>; return <Card style={styles.slot}>{uri ? <><Image source={{ uri }} style={styles.productImage} /><Pressable onPress={onRemove} style={styles.remove}><MaterialIcons name="close" size={17} color="#FFFFFF" /></Pressable></> : <><MaterialIcons name="inventory-2" size={28} color={palette.purple} /><Text style={styles.slotTitle}>Alaab {index + 1}</Text><View style={styles.slotActions}><MiniAction icon="photo-camera" label="Qaado" onPress={onCamera} /><MiniAction icon="photo-library" label="Dooro" onPress={onGallery} /></View></>}</Card>; }
function MiniAction({ icon, label, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.miniAction, pressed && { opacity: 0.7 }]}><MaterialIcons name={icon} size={15} color={palette.purple} /><Text style={styles.miniLabel}>{label}</Text></Pressable>; }
function ResultsScreen({ results, productUris, restart }: { results: Result[]; productUris: string[]; restart: () => void }) { const heer = (value: Result["recommendation"]) => value === "Keep" ? "Hayso" : value === "Review" ? "Dib u eeg" : "Xog kuma filna"; return <Page><ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}><Header title="Natiijada baadhista" subtitle="Kaliya waxa sawirka si cad u taageerayo" back={restart} /><Card style={styles.info}><MaterialIcons name="verified-user" size={20} color={palette.purple} /><Text style={styles.infoText}>Haddii magaca, summadda, ama waxyaabaha ku jira aysan caddeyn, natiijadu waxay sheegaysaa “Xog kuma filna” halkii ay xog qiyaas ah bixin lahayd.</Text></Card>{results.map((result) => <Card key={result.imageIndex} style={styles.resultCard}><Image source={{ uri: productUris[result.imageIndex] }} style={styles.resultImage} /><View style={styles.resultTop}><View style={{ flex: 1 }}><Text style={styles.resultName}>{result.productName}</Text><Text style={styles.resultBrand}>{result.brand}</Text></View><View style={[styles.badge, result.recommendation === "Keep" ? styles.keep : result.recommendation === "Review" ? styles.review : styles.unknown]}><Text style={styles.badgeText}>{heer(result.recommendation)}</Text></View></View><Detail label="Waxa qoraalka laga arkay" text={result.observedText} /><Detail label="Nooca alaabta" text={result.category} /><Detail label="Waxyaabaha muuqda" text={result.visibleIngredients.length ? result.visibleIngredients.join(", ") : "Waxyaabo cad lama akhrin karo."} /><Detail label="La jaanqaadka qoraalka maqaarka" text={result.profileFit} /><Detail label="Sababta ama taxaddarka" text={result.rationale} /><Text style={styles.confidence}>Kalsoonida akhriska: {result.confidence === "clear" ? "Cad" : result.confidence === "partial" ? "Qayb ahaan cad" : "Ma cadda"}</Text></Card>)}<SecondaryButton label="Baadhis kale samee" icon="refresh" onPress={restart} /><PrimaryButton label="Ku noqo hoyga" icon="home" onPress={() => router.replace("/(tabs)" as never)} /></ScrollView></Page>; }
function Detail({ label, text }: { label: string; text: string }) { return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  scroll: { gap: 14, paddingBottom: 30 }, info: { backgroundColor: palette.blue, flexDirection: "row", alignItems: "flex-start", gap: 9 }, infoText: { flex: 1, color: palette.ink, fontSize: 12, lineHeight: 18 }, sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "900", marginTop: 4 }, help: { color: palette.muted, fontSize: 12, marginTop: -8 }, photoPicker: { flexDirection: "row", gap: 13, alignItems: "center" }, faceImage: { width: 88, height: 104, borderRadius: 17, backgroundColor: palette.blue }, facePlaceholder: { width: 88, height: 104, borderRadius: 17, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" }, pickerTitle: { color: palette.ink, fontSize: 15, fontWeight: "900" }, pickerDetail: { color: palette.muted, fontSize: 11, lineHeight: 16 }, pickerActions: { flexDirection: "row", gap: 7 }, miniAction: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: palette.lavender }, miniLabel: { color: palette.purple, fontSize: 10, fontWeight: "900" }, productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, slot: { width: "47%", minHeight: 154, alignItems: "center", justifyContent: "center", padding: 10, gap: 8, overflow: "hidden" }, disabledSlot: { width: "47%", minHeight: 154, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: "#DED9EC", alignItems: "center", justifyContent: "center", gap: 6 }, disabledText: { color: "#A29DB5", fontSize: 11, fontWeight: "700" }, productImage: { width: "100%", height: 132, borderRadius: 13, backgroundColor: palette.blue }, slotTitle: { color: palette.ink, fontSize: 13, fontWeight: "900" }, slotActions: { flexDirection: "row", gap: 5 }, remove: { position: "absolute", top: 8, right: 8, width: 27, height: 27, borderRadius: 13.5, backgroundColor: "#2E2859CC", alignItems: "center", justifyContent: "center" }, error: { color: "#A5264B", fontSize: 12, lineHeight: 18, paddingHorizontal: 4 }, note: { color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: "center", paddingHorizontal: 16 }, resultCard: { gap: 11 }, resultImage: { width: "100%", height: 185, borderRadius: 16, backgroundColor: palette.blue }, resultTop: { flexDirection: "row", gap: 8, alignItems: "flex-start" }, resultName: { color: palette.ink, fontSize: 17, fontWeight: "900" }, resultBrand: { color: palette.muted, fontSize: 12, marginTop: 3 }, badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, maxWidth: 130 }, keep: { backgroundColor: "#E5F5EB" }, review: { backgroundColor: "#FFF3D9" }, unknown: { backgroundColor: palette.lavender }, badgeText: { color: palette.ink, fontSize: 10, fontWeight: "900", textAlign: "center" }, detail: { gap: 3 }, detailLabel: { color: palette.purple, fontSize: 10, fontWeight: "900", letterSpacing: 0.7 }, detailText: { color: palette.ink, fontSize: 12, lineHeight: 18 }, confidence: { color: palette.muted, fontSize: 10, fontStyle: "italic", borderTopColor: palette.line, borderTopWidth: 1, paddingTop: 9 },
});
