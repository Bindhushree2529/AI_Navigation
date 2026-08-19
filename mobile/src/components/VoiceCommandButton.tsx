import React, { useState, useCallback, useRef } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  AccessibilityInfo,
} from "react-native";
import { Mic, MicOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  ensureMicrophonePermission,
  startRecording,
  stopRecording,
  sendVoiceCommand,
  speak,
} from "@/services/voiceService";

interface Props {
  onIntent: (intent: string, text?: string, response?: string) => void;
}

const TOOL_TO_INTENT: Record<string, string> = {
  startNavigation:        "START_NAVIGATION",
  stopNavigation:         "STOP_NAVIGATION",
  getCurrentLocation:     "GET_LOCATION",
  findNearestHospital:    "FIND_HOSPITAL",
  detectObjects:          "DETECT_OBJECTS",
  describeScene:          "SCENE_DESCRIPTION",
  readText:               "OCR",
  recognizeCurrency:      "CURRENCY",
  triggerSOS:             "TRIGGER_SOS",
  callCaregiver:          "CALL_CAREGIVER",
  sendLocationToCaregiver:"SEND_LOCATION",
  repeatLastResponse:     "REPEAT",
  getNavigationStatus:    "NAV_STATUS",
  generalResponse:        "GENERAL",
};

export function VoiceCommandButton({ onIntent }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [statusText, setStatusText] = useState("Voice Assistant: READY");
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const lastResponseRef = useRef("");

  const handlePress = useCallback(async () => {
    if (isRecording) return handleStop();

    const ok = await ensureMicrophonePermission();
    if (!ok) {
      setStatusText("Microphone: PERMISSION DENIED");
      speak("Microphone permission is required.");
      AccessibilityInfo.announceForAccessibility("Microphone permission is required.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setStatusText("Recording: STARTED");
      setIsRecording(true);
      await startRecording();
    } catch {
      setStatusText("Microphone: ERROR");
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleStop = useCallback(async () => {
    setIsRecording(false);
    setStatusText("Audio: RECEIVED");

    const uri = await stopRecording();
    if (!uri) {
      setStatusText("Voice Assistant: READY");
      speak("I couldn't capture audio. Please try again.");
      return;
    }

    setStatusText("Groq STT: PROCESSING");
    try {
      const data = await sendVoiceCommand(uri, historyRef.current);

      setStatusText(`Transcription: "${data.transcript}"`);

      // Update conversation history
      historyRef.current = [
        ...historyRef.current.slice(-10),
        { role: "user", content: data.transcript },
        ...(data.response ? [{ role: "assistant", content: data.response }] : []),
      ];

      const intent = TOOL_TO_INTENT[data.tool] ?? "GENERAL";
      setStatusText(`Intent: ${intent}\nTool: ${data.tool}()`);

      if (data.repeat) {
        speak(lastResponseRef.current || "Nothing to repeat.");
        setStatusText("Voice Assistant: READY");
        return;
      }

      const response = data.response ?? "";
      if (response) {
        lastResponseRef.current = response;
        setStatusText(`Response: "${response}"`);
        const LANG: Record<string, string> = {
          hi: "hi-IN", kn: "kn-IN", te: "te-IN",
          ta: "ta-IN", mr: "mr-IN", bn: "bn-IN",
          gu: "gu-IN", pa: "pa-IN",
        };
        // Only use non-English TTS if response text has non-latin script
        const hasNonLatin = /[^\u0000-\u007F]/.test(response);
        const ttsLang = hasNonLatin ? (LANG[data.language] ?? "en-US") : "en-US";
        speak(response, ttsLang);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onIntent(intent, data.transcript, response);
    } catch (err: any) {
      const msg = err?.message ?? "Voice processing failed.";
      setStatusText(`Error: ${msg}`);
      speak(msg.includes("permission") ? msg : "I couldn't process that. Please try again.");
      AccessibilityInfo.announceForAccessibility(msg);
    }
  }, [onIntent]);

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <TouchableOpacity
        style={[styles.btn, isRecording && styles.btnActive]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? "Stop recording voice command" : "Start voice command"}
        accessibilityHint="Say a command like Start Navigation, What is ahead, or Send SOS"
      >
        {isRecording ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
      </TouchableOpacity>
      <View style={styles.statusRow}>
        <Text style={styles.statusText} numberOfLines={2}>{statusText}</Text>
        {statusText.includes("PROCESSING") && (
          <ActivityIndicator style={{ marginLeft: 8 }} color="#fff" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", width: 140 },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  btnActive: { backgroundColor: "#ef4444" },
  statusRow: { marginTop: 8, flexDirection: "row", alignItems: "center" },
  statusText: { color: "#fff", fontSize: 11, width: 120 },
});
