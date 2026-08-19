import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "NaviAssist",
  slug: "naviassist",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0369a1",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "app.naviassist",
    infoPlist: {
      NSCameraUsageDescription: "NaviAssist uses the camera to detect objects and help you navigate safely.",
      NSMicrophoneUsageDescription: "NaviAssist uses the microphone for voice commands.",
      NSLocationWhenInUseUsageDescription: "NaviAssist uses your location for navigation and emergency alerts.",
      NSLocationAlwaysUsageDescription: "NaviAssist uses your location in the background for continuous navigation.",
    },
  },
  android: {
    package: "app.naviassist",
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#0369a1" },
    permissions: [
      "CAMERA",
      "RECORD_AUDIO",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "VIBRATE",
      "RECEIVE_BOOT_COMPLETED",
      "FOREGROUND_SERVICE",
    ],
  },
  plugins: [
    "expo-router",
    "expo-camera",
    "expo-location",
    ["expo-notifications", { icon: "./assets/notification-icon.png", color: "#0369a1" }],
    "react-native-vision-camera",
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    wsUrl: process.env.EXPO_PUBLIC_WS_URL,
    orsApiKey: process.env.ORS_API_KEY,
    eas: { projectId: "your-eas-project-id" },
  },
});
