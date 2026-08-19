import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { api } from "@/services/api";
import { useNavigationStore } from "@/store/navigationStore";

export function SosButton() {
  const [sending, setSending] = useState(false);
  const { sessionId } = useNavigationStore();

  async function triggerSos() {
    Alert.alert(
      "Send SOS Alert?",
      "This will notify your emergency contacts and caregivers with your live location.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Send SOS", style: "destructive", onPress: sendSos },
      ]
    );
  }

  async function sendSos() {
    setSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Speech.speak("Sending SOS alert. Help is on the way.", { language: "en-US" });

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await api.post("/sos", {
        location: { lat: loc.coords.latitude, lng: loc.coords.longitude },
        sessionId,
        message: "SOS triggered from NaviAssist app",
      });
      Speech.speak("SOS sent. Your caregivers have been notified.", { language: "en-US" });
    } catch {
      Speech.speak("Failed to send SOS. Please call emergency services directly.", { language: "en-US" });
    } finally {
      setSending(false);
    }
  }

  return (
    <TouchableOpacity
      style={[styles.btn, sending && styles.btnSending]}
      onPress={triggerSos}
      disabled={sending}
      accessibilityRole="button"
      accessibilityLabel="Send SOS emergency alert"
      accessibilityHint="Sends your location to emergency contacts and caregivers"
    >
      <Text style={styles.text}>{sending ? "..." : "SOS"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  btnSending: { backgroundColor: "#991b1b" },
  text: { color: "#fff", fontSize: 13, fontWeight: "800" },
});
