import 'dotenv/config';

export default {
  expo: {
    name: process.env.EXPO_PUBLIC_APP_NAME || "doviz-app",
    slug: "doviz-app",
    version: process.env.EXPO_PUBLIC_APP_VERSION || "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      // Environment variables'ları extra içinde tanımlayalım
      apiKey: process.env.EXPO_PUBLIC_API_KEY,
      baseUrl: process.env.EXPO_PUBLIC_BASE_URL || 'https://v6.exchangerate-api.com/v6',
      testMode: process.env.EXPO_PUBLIC_TEST_MODE === 'true',
      appName: process.env.EXPO_PUBLIC_APP_NAME || 'Döviz Çevirici',
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
      nodeEnv: process.env.NODE_ENV || 'development'
    }
  }
};
