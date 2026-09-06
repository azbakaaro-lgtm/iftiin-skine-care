import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getApiBaseUrl } from "@/constants/oauth";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { showAlert } from "@/lib/alert";
import { Card, EmptyState, Header, LoadingCare, Page, palette, PrimaryButton, SecondaryButton } from "@/components/iftiin-ui";
import { useCart } from "@/lib/cart-context";
import { RequireRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

type PaymentMethod = "evc_plus" | "edahab" | "premier_wallet" | "merchant";

export default function CartScreen() { return <RequireRole role="customer"><CartContent /></RequireRole>; }

function CartContent() {
  const { session } = usePhaseSession();
  const { skinJourneyId: rawSkinJourneyId } = useLocalSearchParams<{ skinJourneyId?: string }>();
  const skinJourneyId = rawSkinJourneyId && Number.isInteger(Number(rawSkinJourneyId)) ? Number(rawSkinJourneyId) : null;
  const { ready, items, deliveryArea, setDeliveryArea, changeQuantity, remove, clear } = useCart();
  const create = trpc.phase1.createOrder.useMutation();
  if (!ready) return <LoadingCare />;
  if (!items.length) return <Page><Header title="Cart" back={() => router.back()} /><EmptyState icon="shopping-cart" title="Cart-kaagu waa madhan yahay" detail="Dooro dukaan, kadib ku dar product-yada aad rabto." action={<PrimaryButton label="Eeg dukaamada" onPress={() => router.replace("/customer-stores" as never)} />} /></Page>;
  return <CartCheckout sessionToken={session!.token} skinJourneyId={skinJourneyId} items={items} deliveryArea={deliveryArea} setDeliveryArea={setDeliveryArea} changeQuantity={changeQuantity} remove={remove} clear={clear} create={create} />;
}

function CartCheckout({ sessionToken, skinJourneyId, items, deliveryArea, setDeliveryArea, changeQuantity, remove, clear, create }: { sessionToken: string; skinJourneyId: number | null; items: ReturnType<typeof useCart>["items"]; deliveryArea: string | null; setDeliveryArea: (area: string | null) => void; changeQuantity: (productId: number, quantity: number) => void; remove: (productId: number) => void; clear: () => void; create: ReturnType<typeof trpc.phase1.createOrder.useMutation> }) {
  const store = items[0];
  const options = trpc.phase1.paymentOptions.useQuery({ sessionToken, storeAdminId: store.storeAdminId });
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const subtotal = items.reduce((total, item) => total + item.originalPrice * item.quantity, 0);
  const productTotal = items.reduce((total, item) => total + item.finalPrice * item.quantity, 0);
  const discount = subtotal - productTotal;
  const areas = store.deliveryAreas.split(",").map((area) => area.trim()).filter(Boolean);
  const deliveryFee = store.deliveryEnabled && deliveryArea ? store.deliveryFee : 0;
  const total = productTotal + deliveryFee;

  async function placeOrder() {
    if (store.deliveryEnabled && !deliveryArea) { showAlert("Dooro goob", "Fadlan dooro goobta delivery-ga."); return; }
    if (!method) { showAlert("Dooro habka lacagta", "Dooro EVC Plus, eDahab, Premier Wallet, ama Merchant."); return; }
    try {
      const order = await create.mutateAsync({ sessionToken, items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })), deliveryArea, paymentMethod: method, skinJourneyId });
      clear();
      router.replace({ pathname: "/order-payment" as never, params: { orderId: String(order.id) } });
    } catch (issue) { showAlert("Dalabka lama gudbin karo", issue instanceof Error ? issue.message : "Mar kale isku day."); }
  }

  return <Page><ScrollView contentContainerStyle={styles.scroll}>
    <Header title="Cart" subtitle={store.storeName || "Dukaan"} back={() => router.back()} />
    {items.map((item) => <Card key={item.productId} style={styles.item}>
      <View style={styles.image}>{item.imageUrl ? <Image source={{ uri: `${getApiBaseUrl()}${item.imageUrl}` }} style={styles.imageFill} /> : <MaterialIcons name="inventory-2" size={21} color={palette.purple} />}</View>
      <View style={styles.itemCopy}><Text style={styles.name}>{item.name}</Text><Text style={styles.brand}>{item.brand}</Text><Text style={styles.price}>${item.finalPrice}</Text><View style={styles.quantity}><Pressable onPress={() => changeQuantity(item.productId, item.quantity - 1)} style={styles.qButton}><MaterialIcons name="remove" size={18} color={palette.purple} /></Pressable><Text style={styles.qText}>{item.quantity}</Text><Pressable onPress={() => changeQuantity(item.productId, item.quantity + 1)} style={styles.qButton}><MaterialIcons name="add" size={18} color={palette.purple} /></Pressable><Pressable onPress={() => remove(item.productId)} style={styles.remove}><MaterialIcons name="delete-outline" size={19} color="#A5264B" /></Pressable></View></View>
    </Card>)}
    {store.deliveryEnabled ? <Card style={styles.delivery}><Text style={styles.deliveryTitle}>Dooro goobta delivery-ga</Text><Text style={styles.deliveryText}>Khidmad: ${store.deliveryFee}</Text><View style={styles.areaList}>{areas.map((area) => <Pressable key={area} onPress={() => setDeliveryArea(area)} style={[styles.area, deliveryArea === area && styles.areaOn]}><Text style={[styles.areaText, deliveryArea === area && styles.areaTextOn]}>{area}</Text></Pressable>)}</View></Card> : <Card style={styles.noDelivery}><MaterialIcons name="storefront" size={20} color={palette.purple} /><Text style={styles.deliveryText}>Dukaankan delivery ma bixiyo; dalabka dukaanka ayaa laga qaadanayaa.</Text></Card>}
    <Card style={styles.summary}><Summary label="Subtotal" value={subtotal} /><Summary label="Discount" value={discount} /><Summary label="Delivery fee" value={deliveryFee} /><View style={styles.summaryLine} /><Summary label="Wadarta" value={total} bold /></Card>
    <Card style={styles.paymentCard}><Text style={styles.paymentTitle}>Dooro habka lacag-bixinta</Text><Text style={styles.paymentText}>Lambarka dukaanka laguma soo bandhigayo Iftiin. Marka xigta waxaa lagu geynayaa habka lacagta ee aad dooratay, dukaankuna wuxuu akoonkiisa ka hubinayaa helitaanka lacagta.</Text>{options.isLoading ? <Text style={styles.deliveryText}>Hababka lacagta waa la soo gelinayaa...</Text> : null}{!options.isLoading && !(options.data?.length) ? <Text style={styles.error}>Dukaankani weli ma dejin hab lacag lagu helo. La xiriir dukaanka.</Text> : null}<View style={styles.methodList}>{(options.data ?? []).map((option) => <Pressable key={option.method} onPress={() => setMethod(option.method as PaymentMethod)} style={[styles.method, method === option.method && styles.methodOn]}><MaterialIcons name={method === option.method ? "radio-button-checked" : "radio-button-unchecked"} size={19} color={palette.purple} /><View style={styles.methodCopy}><Text style={styles.methodName}>{option.label}</Text><Text style={styles.methodAccount}>Waxaa lagu geynayaa habka lacagta si ammaan ah.</Text></View></Pressable>)}</View></Card>
    <PrimaryButton label={create.isPending ? "Dalabka waa la gudbinayaa..." : "Gudbi dalabka oo bixi"} icon="account-balance-wallet" onPress={placeOrder} disabled={create.isPending || !method || !(options.data?.length)} />
    <SecondaryButton label="Nadiifi cart-ka" icon="delete-outline" onPress={() => showAlert("Nadiifi cart", "Ma tirtiraysaa dhammaan product-yada?", [{ text: "Jooji", style: "cancel" }, { text: "Tirtir", style: "destructive", onPress: clear }])} />
  </ScrollView></Page>;
}

function Summary({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) { return <View style={styles.summaryRow}><Text style={[styles.sumLabel, bold && styles.bold]}>{label}</Text><Text style={[styles.sumValue, bold && styles.total]}>${value}</Text></View>; }

const styles = StyleSheet.create({ scroll: { gap: 12, paddingBottom: 30 }, item: { flexDirection: "row", gap: 11, padding: 12 }, itemCopy: { flex: 1 }, image: { height: 66, width: 66, borderRadius: 16, overflow: "hidden", backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" }, imageFill: { width: "100%", height: "100%" }, name: { color: palette.ink, fontSize: 14, fontWeight: "900" }, brand: { color: palette.muted, fontSize: 11, marginTop: 2 }, price: { color: palette.purple, fontSize: 14, fontWeight: "900", marginTop: 4 }, quantity: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 }, qButton: { height: 27, width: 27, borderRadius: 9, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" }, qText: { color: palette.ink, fontWeight: "900", minWidth: 17, textAlign: "center" }, remove: { marginLeft: "auto" }, delivery: { gap: 7, backgroundColor: palette.blue }, noDelivery: { flexDirection: "row", gap: 9, backgroundColor: palette.lavender }, deliveryTitle: { color: palette.ink, fontWeight: "900", fontSize: 13 }, deliveryText: { color: palette.muted, fontSize: 11, lineHeight: 16 }, areaList: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 }, area: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: palette.line }, areaOn: { borderColor: palette.purple, backgroundColor: palette.lavender }, areaText: { color: palette.muted, fontSize: 11, fontWeight: "800" }, areaTextOn: { color: palette.purple }, summary: { gap: 9 }, summaryRow: { flexDirection: "row", justifyContent: "space-between" }, sumLabel: { color: palette.muted, fontSize: 13 }, sumValue: { color: palette.ink, fontSize: 13, fontWeight: "800" }, summaryLine: { height: 1, backgroundColor: palette.line }, bold: { color: palette.ink, fontWeight: "900" }, total: { color: palette.purple, fontSize: 20 }, paymentCard: { gap: 10, backgroundColor: "#FBFAFF" }, paymentTitle: { color: palette.ink, fontSize: 14, fontWeight: "900" }, paymentText: { color: palette.muted, fontSize: 11, lineHeight: 16 }, methodList: { gap: 8 }, method: { minHeight: 55, paddingHorizontal: 11, borderWidth: 1, borderColor: palette.line, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 9 }, methodOn: { borderColor: palette.purple, backgroundColor: palette.lavender }, methodCopy: { flex: 1 }, methodName: { color: palette.ink, fontSize: 12, fontWeight: "900" }, methodAccount: { color: palette.muted, fontSize: 10, marginTop: 2 }, error: { color: "#A5264B", fontSize: 11, lineHeight: 16, fontWeight: "800" } });
