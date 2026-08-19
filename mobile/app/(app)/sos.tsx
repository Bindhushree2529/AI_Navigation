import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useNavigationStore } from "@/store/navigationStore";
import { format } from "date-fns";

export default function SosScreen() {
  const [sending, setSending] = useState(false);
  const { sessionId } = useNavigationStore();
  const qc = useQueryClient();

  const { data: contacts = [] } = useQuery({
    queryKey: ["emergency-contacts"],
    queryFn: () => api.get("/sos/contacts").then((r) => r.data),
  });

  const { data: history = [] } = useQuery({
    queryKey: ["sos-history"],
    queryFn: () => api.get("/sos/history").then((r) => r.data),
  });

  async function triggerSos() {
    Alert.alert("Send SOS?", "Your location will be shared with all emergency contacts.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send SOS", style: "destructive", onPress: async () => {
          setSending(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Speech.speak("Sending SOS. Help is on the way.", { language: "en-US" });
          try {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            await api.post("/sos", {
              location: { lat: loc.coords.latitude, lng: loc.coords.longitude },
              sessionId,
            });
            qc.invalidateQueries({ queryKey: ["sos-history"] });
            Speech.speak("SOS sent successfully.", { language: "en-US" });
          } catch {
            Speech.speak("Failed to send SOS. Please call emergency services.", { language: "en-US" });
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} accessibilityRole="header">Emergency</Text>

        {/* Big SOS button */}
        <TouchableOpacity
          style={[styles.sosBtn, sending && styles.sosBtnSending]}
          onPress={triggerSos}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel="Send SOS emergency alert"
          accessibilityHint="Sends your GPS location to all emergency contacts and caregivers"
        >
          <Text style={styles.sosBtnText}>{sending ? "Sending..." : "SOS"}</Text>
          <Text style={styles.sosBtnSub}>Tap to send emergency alert</Text>
        </TouchableOpacity>

        {/* Emergency contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          {contacts.length === 0 ? (
            <Text style={styles.empty}>No emergency contacts added yet.</Text>
          ) : (
            contacts.map((c: any) => (
              <View key={c.id} style={styles.contactCard} accessibilityRole="text">
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactDetail}>{c.relation} · {c.phone}</Text>
              </View>
            ))
          )}
        </View>

        {/* SOS history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent SOS Events</Text>
          {history.length === 0 ? (
            <Text style={styles.empty}>No SOS events. Stay safe!</Text>
          ) : (
            history.slice(0, 5).map((s: any) => (
              <View key={s.id} style={styles.historyCard}>
                <Text style={styles.historyDate}>{format(new Date(s.createdAt), "MMM d, HH:mm")}</Text>
                <Text style={[styles.historyStatus, s.status === "ACTIVE" && styles.statusActive]}>
                  {s.status}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#f1f5f9", marginBottom: 24 },
  sosBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 24,
    paddingVertical: 40,
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    minHeight: 120,
  },
  sosBtnSending: { backgroundColor: "#991b1b" },
  sosBtnText: { color: "#fff", fontSize: 48, fontWeight: "900" },
  sosBtnSub: { color: "#fca5a5", fontSize: 14, marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  empty: { color: "#475569", fontSize: 14, textAlign: "center", paddingVertical: 16 },
  contactCard: { backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 8 },
  contactName: { color: "#f1f5f9", fontSize: 15, fontWeight: "600" },
  contactDetail: { color: "#64748b", fontSize: 13, marginTop: 2 },
  historyCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 8 },
  historyDate: { color: "#94a3b8", fontSize: 13 },
  historyStatus: { color: "#22c55e", fontSize: 12, fontWeight: "700" },
  statusActive: { color: "#ef4444" },
});
