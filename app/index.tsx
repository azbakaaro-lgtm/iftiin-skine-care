import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Page, palette, PrimaryButton, SecondaryButton } from "@/components/iftiin-ui";
import { routeForRole, usePhaseSession } from "@/lib/phase1-session";
import { trpc } from "@/lib/trpc";

// Replace these with your own photos any time — paste a direct image URL
// from https://unsplash.com (open a photo, right-click it, "Copy image
// address") or any image host. Exactly 5 keeps the carousel dots tidy, but
// you can add or remove entries freely.
const HERO_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1648203276014-20f97ba1f817?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1670201203208-055d6d79db4a?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1679584169621-db3aa6c0fbd6?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1580870069867-74c57ee1bb07?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1498843053639-170ff2122f35?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
];

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);
  const width = Math.min(Dimensions.get("window").width, 900);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % HERO_IMAGES.length;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <View>
      <FlatList
        ref={listRef}
        data={HERO_IMAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        renderItem={({ item }) => <Image source={{ uri: item }} style={[styles.heroImage, { width }]} />}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />
      <View style={styles.dots}>
        {HERO_IMAGES.map((item, i) => (
          <View key={item} style={[styles.dot, i === index ? styles.dotActive : null]} />
        ))}
      </View>
    </View>
  );
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LandingScreen() {
  const { session, loaded } = usePhaseSession();
  const featured = trpc.phase1.featuredProducts.useQuery();

  useEffect(() => {
    if (loaded && session) router.replace(routeForRole(session.account.role) as never);
  }, [loaded, session]);

  return (
    <Page noPadding>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <MaterialIcons name="wb-sunny" size={22} color={palette.purple} />
          </View>
          <View>
            <Text style={styles.brandTitle}>Iftiin</Text>
            <Text style={styles.brandSub}>SKIN CARE</Text>
          </View>
        </View>

        <HeroCarousel />

        <View style={styles.body}>
          <Text style={styles.headline}>Maqaarkaaga u daryeel si khibrad leh</Text>
          <Text style={styles.subline}>Dukaamo la ansixiyay, alaab asli ah, iyo Skin Journey gaarka ah oo kuu doorta waxa ku habboon.</Text>

          <View style={styles.ctaRow}>
            <PrimaryButton label="Soo gal" icon="login" onPress={() => router.push("/login" as never)} />
            <SecondaryButton label="Isdiiwaan geli" icon="person-add" onPress={() => router.push("/create-customer-account" as never)} />
          </View>

          <View style={styles.adBanner}>
            <MaterialIcons name="local-offer" size={20} color={palette.purple} />
            <Text style={styles.adText}>Dukaamada cusub oo kasta iyo alaabtooda — dhammaan halkan ayaad ka arki kartaa, ka hor intaadan akoon abuurin.</Text>
          </View>

          <Text style={styles.sectionTitle}>Alaabta dukaamada</Text>
          <View style={styles.productGrid}>
            {(featured.data ?? []).map((product) => (
              <View key={product.id} style={styles.productCard}>
                {product.imageUrl ? (
                  <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, styles.productImageFallback]}>
                    <MaterialIcons name="spa" size={22} color={palette.purple} />
                  </View>
                )}
                <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productStore} numberOfLines={1}>{product.storeName ?? "Dukaan"}</Text>
                <Text style={styles.productPrice}>{money(product.finalPrice)}</Text>
              </View>
            ))}
            {featured.data && featured.data.length === 0 ? (
              <Text style={styles.emptyText}>Weli alaab lagama darin dukaamada.</Text>
            ) : null}
          </View>

          <View style={styles.footerCta}>
            <Text style={styles.footerTitle}>Diyaar ma u tahay?</Text>
            <PrimaryButton label="Bilow hadda" icon="arrow-forward" onPress={() => router.push("/login" as never)} />
          </View>
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingTop: 54, paddingBottom: 14 },
  logoCircle: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" },
  brandTitle: { color: palette.ink, fontSize: 17, fontWeight: "900", lineHeight: 18 },
  brandSub: { color: palette.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },

  heroImage: { height: 260, resizeMode: "cover" },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.line },
  dotActive: { backgroundColor: palette.purple, width: 18 },

  body: { paddingHorizontal: 20, paddingTop: 22, gap: 14 },
  headline: { color: palette.ink, fontSize: 24, fontWeight: "900", lineHeight: 30 },
  subline: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  ctaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  adBanner: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: palette.lavender, borderRadius: 16, padding: 14, marginTop: 6 },
  adText: { flex: 1, color: palette.ink, fontSize: 12, lineHeight: 18, fontWeight: "700" },

  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "900", marginTop: 10 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  productCard: { width: "47%", backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: palette.line, padding: 10, gap: 4 },
  productImage: { width: "100%", height: 100, borderRadius: 12 },
  productImageFallback: { backgroundColor: palette.lavender, alignItems: "center", justifyContent: "center" },
  productName: { color: palette.ink, fontSize: 12, fontWeight: "800", marginTop: 4 },
  productStore: { color: palette.muted, fontSize: 10 },
  productPrice: { color: palette.purple, fontSize: 13, fontWeight: "900" },
  emptyText: { color: palette.muted, fontSize: 13 },

  footerCta: { alignItems: "center", gap: 12, paddingVertical: 24 },
  footerTitle: { color: palette.ink, fontSize: 16, fontWeight: "900" },
});
