import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

const env = {
  appName: "Iftiin Skin Care",
  appSlug: "iftiin-skin-care",
  scheme: "iftiinskincare",
  iosBundleId: "com.app.iftiinskincare",
  androidPackage: "com.app.iftiinskincare",
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "light",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#F1EFFF",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS", "CAMERA"],
    intentFilters: [{ action: "VIEW", autoVerify: true, data: [{ scheme: env.scheme, host: "*" }], category: ["BROWSABLE", "DEFAULT"] }],
  },
  web: { bundler: "metro", output: "static", favicon: "./assets/images/favicon.png" },
  plugins: [
    "expo-router",
    ["expo-image-picker", {
      photosPermission: "U oggolow Iftiin Skin Care inuu doorto sawirka wejigaaga qiimeynta gaarka ah.",
      cameraPermission: "U oggolow Iftiin Skin Care inuu sawir wejigaaga u qaado qiimeynta gaarka ah.",
    }],
    ["expo-splash-screen", { image: "./assets/images/splash-icon.png", imageWidth: 200, resizeMode: "contain", backgroundColor: "#F1EFFF" }],
    ["expo-build-properties", { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24 } }],
    "expo-audio",
    ["expo-video", { supportsBackgroundPlayback: true, supportsPictureInPicture: true }],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
};

export default config;
