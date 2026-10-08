const MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY;

export default ({ config }) => ({
  ...config,
  name: "Bite",
  slug: "bite",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#B84A33",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.bite.app",
    config: {
      googleMapsApiKey: MAPS_KEY,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#B84A33",
    },
    edgeToEdgeEnabled: true,
    package: "com.lionardleyva.bite",
    versionCode: 1,
    // "Compartir > Bite" desde Google Maps, Instagram, TikTok... (modules/share-intent)
    intentFilters: [
      {
        action: "SEND",
        category: ["DEFAULT"],
        data: [{ mimeType: "text/plain" }],
      },
    ],
    permissions: [
      "ACCESS_FINE_LOCATION",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "READ_MEDIA_IMAGES",
    ],
    config: {
      googleMaps: {
        apiKey: MAPS_KEY,
      },
    },
  },
  extra: {
    eas: {
      projectId: "56a33e34-71eb-4068-ade3-42d358c1d0ef",
    },
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || "AIzaSyC4lIS9YErPRAbjZvs-jEAjhwGPWGLqx7U",
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || "bite-ba28f.firebaseapp.com",
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || "bite-ba28f",
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || "bite-ba28f.firebasestorage.app",
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || "161393276832",
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || "1:161393276832:web:ba8edf81428a051079d6c5",
    GOOGLE_MAPS_API_KEY: MAPS_KEY,
    DIRECTIONS_PROXY_URL: process.env.DIRECTIONS_PROXY_URL,
  },
  plugins: [
    "expo-image",
    "expo-status-bar",
    "expo-location",
    [
      "expo-image-picker",
      {
        cameraPermission: "Bite necesita acceso a la camara para tomar fotos de restaurantes.",
        photosPermission: "Bite necesita acceso a tus fotos para elegir imagenes de restaurantes.",
      },
    ],
  ],
});
