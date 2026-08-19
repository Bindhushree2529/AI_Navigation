import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "@/services/api";

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("sos", {
      name: "SOS Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#ef4444",
      sound: "default",
    });
    await Notifications.setNotificationChannelAsync("navigation", {
      name: "Navigation",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Register token with backend
  await api.post("/users/push-token", { token }).catch(() => {});

  return token;
}
