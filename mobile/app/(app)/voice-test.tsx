import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { VoiceCommandButton } from "@/components/VoiceCommandButton";
import * as Speech from "expo-speech";
import { fetchTtsAudio } from "@/services/voiceService";

export default function VoiceTestPage() {
  const [logs, setLogs] = useState<string[]>([]);

  function addLog(line: string) {
    setLogs((s) => [line, ...s].slice(0, 50));
  }

  async function handleIntent(intent: string, text?: string) {
    addLog(`Detected Speech: "${text || ""}"`);
    addLog(`Intent: ${intent}`);
    // Example actions — speak immediate responses
    if (intent === "START_NAVIGATION") {
      addLog("Action: START_NAVIGATION");
      speak("Navigation started.");
    } else if (intent === "STOP_NAVIGATION") {
      addLog("Action: STOP_NAVIGATION");
      speak("Navigation stopped.");
    } else if (intent === "TRIGGER_SOS") {
      addLog("Action: TRIGGER_SOS");
      speak("SOS has been sent to your caregiver.");
    } else if (intent === "DETECT_OBJECTS") {
      addLog("Action: DETECT_OBJECTS (simulate camera analyze)");
      speak("Person ahead, approximately two meters away.");
    } else if (intent === "NLU_FALLBACK") {
      addLog("Action: NLU_FALLBACK — invoking LLM not implemented (deferred)");
      speak("I heard: " + (text || ""));
    } else {
      addLog(`Action: ${intent}`);
      speak("Command received: " + intent);
    }
  }

  function speak(text: string) {
    addLog(`Response: "${text}"`);
    // Use native TTS (expo-speech) for mobile-first offline-capable TTS
    Speech.speak(text, { language: "en-US" });
  }

  return (
    <ScrollView contentContainerStyle={styles.container} accessibilityLabel="Voice assistant test page">
      <Text style={styles.heading}>Voice Assistant Test</Text>
      <Text style={styles.instructions}>Tap the mic and speak commands. Logs appear below.</Text>

      <VoiceCommandButton onIntent={handleIntent} />

      <View style={styles.logBox}>
        <Text style={styles.logHeading}>Debug Logs</Text>
        {logs.map((l, i) => (
          <Text key={i} style={styles.logLine}>{l}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#000", minHeight: "100%" },
  heading: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  instructions: { color: "#9ca3af", marginBottom: 12 },
  logBox: { marginTop: 20, backgroundColor: "#111827", padding: 12, borderRadius: 8 },
  logHeading: { color: "#fff", fontWeight: "700", marginBottom: 8 },
  logLine: { color: "#e5e7eb", fontSize: 13, marginBottom: 6 },
});
