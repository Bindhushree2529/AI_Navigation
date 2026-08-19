import React from "react";
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettingsStore } from "@/store/settingsStore";
import Slider from "@react-native-community/slider";

const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "es-ES", label: "Spanish" },
  { code: "fr-FR", label: "French" },
  { code: "ar-SA", label: "Arabic" },
];

export default function SettingsScreen() {
  const {
    voiceLanguage, setVoiceLanguage,
    voiceSpeed, setVoiceSpeed,
    hapticIntensity, setHapticIntensity,
    highContrast, setHighContrast,
    offlineMode, setOfflineMode,
  } = useSettingsStore();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} accessibilityRole="none">
        <Text style={styles.title} accessibilityRole="header">Settings</Text>

        {/* Voice Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Language</Text>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.option, voiceLanguage === lang.code && styles.optionSelected]}
              onPress={() => setVoiceLanguage(lang.code)}
              accessibilityRole="radio"
              accessibilityState={{ checked: voiceLanguage === lang.code }}
              accessibilityLabel={lang.label}
            >
              <View style={[styles.radio, voiceLanguage === lang.code && styles.radioSelected]} />
              <Text style={styles.optionText}>{lang.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Voice Speed */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Voice Speed: {voiceSpeed.toFixed(1)}x
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={voiceSpeed}
            onValueChange={setVoiceSpeed}
            minimumTrackTintColor="#0ea5e9"
            maximumTrackTintColor="#334155"
            thumbTintColor="#0ea5e9"
            accessibilityLabel="Voice speed slider"
            accessibilityHint={`Current speed: ${voiceSpeed.toFixed(1)}x. Slide to adjust.`}
          />
        </View>

        {/* Haptic Intensity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Haptic Intensity: {["Off", "Low", "Medium", "High"][hapticIntensity]}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={3}
            step={1}
            value={hapticIntensity}
            onValueChange={(v) => setHapticIntensity(Math.round(v))}
            minimumTrackTintColor="#0ea5e9"
            maximumTrackTintColor="#334155"
            thumbTintColor="#0ea5e9"
            accessibilityLabel="Haptic intensity slider"
          />
        </View>

        {/* Toggles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>High Contrast Mode</Text>
              <Text style={styles.rowDesc}>Increases visual contrast for low vision users</Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={setHighContrast}
              trackColor={{ false: "#334155", true: "#0ea5e9" }}
              accessibilityLabel="High contrast mode"
              accessibilityRole="switch"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Offline Mode</Text>
              <Text style={styles.rowDesc}>Use on-device AI when no internet is available</Text>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: "#334155", true: "#0ea5e9" }}
              accessibilityLabel="Offline mode"
              accessibilityRole="switch"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "800", color: "#f1f5f9", marginBottom: 24 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#1e293b", marginBottom: 8 },
  optionSelected: { borderColor: "#0ea5e9", backgroundColor: "#0c4a6e22" },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#475569" },
  radioSelected: { borderColor: "#0ea5e9", backgroundColor: "#0ea5e9" },
  optionText: { color: "#e2e8f0", fontSize: 15 },
  slider: { width: "100%", height: 40 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  rowText: { flex: 1, marginRight: 16 },
  rowLabel: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
  rowDesc: { color: "#64748b", fontSize: 12, marginTop: 2 },
});
