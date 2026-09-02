import "@/global.css";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaFrameContext, SafeAreaInsetsContext, SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import type { EdgeInsets, Rect } from "react-native-safe-area-context";
import "react-native-reanimated";

import "@/lib/_core/nativewind-pressable";
import { CartProvider } from "@/lib/cart-context";
import { LanguageProvider } from "@/lib/language-context";
import { PhaseSessionProvider } from "@/lib/phase1-session";
import { CareProvider } from "@/lib/skin-care-context";
import { ThemeProvider } from "@/lib/theme-provider";
import { createTRPCClient, trpc } from "@/lib/trpc";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };
export const unstable_settings = { initialRouteName: "index" };

export default function RootLayout() {
  // Kick off loading the vector-icon fonts via expo-font. On some web
  // builds the exported .ttf isn't picked up automatically, so icons can
  // render blank until this resolves. We don't block rendering on it —
  // that risks a permanent spinner if the load hangs for any reason — the
  // icons will simply pop in once the font finishes loading.
  useFonts({ ...MaterialIcons.font });

  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;
  const [insets] = useState<EdgeInsets>(initialInsets);
  const [frame] = useState<Rect>(initialFrame);
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } } }));
  const [trpcClient] = useState(() => createTRPCClient());

  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return { ...metrics, insets: { ...metrics.insets, top: Math.max(metrics.insets.top, 16), bottom: Math.max(metrics.insets.bottom, 12) } };
  }, [initialInsets, initialFrame]);

  const content = <GestureHandlerRootView style={{ flex: 1 }}>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <PhaseSessionProvider>
            <CartProvider>
              <CareProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" /><Stack.Screen name="login" /><Stack.Screen name="create-store-account" /><Stack.Screen name="create-customer-account" /><Stack.Screen name="admin-bootstrap" />
                  <Stack.Screen name="super-admin-dashboard" /><Stack.Screen name="super-admin-stores" /><Stack.Screen name="super-admin-customers" /><Stack.Screen name="super-admin-products" /><Stack.Screen name="super-admin-orders" /><Stack.Screen name="super-admin-payments" /><Stack.Screen name="super-admin-payment-settings" />
                  <Stack.Screen name="store-admin-dashboard" /><Stack.Screen name="store-products" /><Stack.Screen name="store-orders" /><Stack.Screen name="store-commissions" /><Stack.Screen name="product-form" /><Stack.Screen name="delivery-settings" /><Stack.Screen name="store-payment-settings" />
                  <Stack.Screen name="customer-home" /><Stack.Screen name="skin-journey" /><Stack.Screen name="skin-results" /><Stack.Screen name="skin-routine" /><Stack.Screen name="daily-skin-scan" /><Stack.Screen name="skin-progress" /><Stack.Screen name="customer-stores" /><Stack.Screen name="customer-store" /><Stack.Screen name="product-details" /><Stack.Screen name="cart" /><Stack.Screen name="order-payment" /><Stack.Screen name="my-orders" /><Stack.Screen name="order-detail" />
                  <Stack.Screen name="notifications" /><Stack.Screen name="account-profile" /><Stack.Screen name="settings" /><Stack.Screen name="change-password" /><Stack.Screen name="(tabs)" />
                </Stack>
              </CareProvider>
            </CartProvider>
          </PhaseSessionProvider>
        </LanguageProvider>
        <StatusBar style="dark" />
      </QueryClientProvider>
    </trpc.Provider>
  </GestureHandlerRootView>;

  return <ThemeProvider>
    <SafeAreaProvider initialMetrics={providerInitialMetrics}>
      {Platform.OS === "web" ? <SafeAreaFrameContext.Provider value={frame}><SafeAreaInsetsContext.Provider value={insets}>{content}</SafeAreaInsetsContext.Provider></SafeAreaFrameContext.Provider> : content}
    </SafeAreaProvider>
  </ThemeProvider>;
}
