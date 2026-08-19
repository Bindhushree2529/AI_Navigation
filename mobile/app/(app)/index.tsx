import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  AccessibilityInfo,
  Platform,
} from "react-native";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { useNavigation } from "expo-router";
import { useNavigationStore } from "@/store/navigationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { analyzeFrame } from "@/services/detectionService";
import { VoiceCommandButton } from "@/components/VoiceCommandButton";
import { SosButton } from "@/components/SosButton";
import { DetectionOverlay } from "@/components/DetectionOverlay";
import { StatusBar } from "expo-status-bar";

const FRAME_INTERVAL_MS = 1500;

export default function NavigationScreen() {
  const device = useCameraDevice("back");
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSpoken, setLastSpoken] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { isNavigating, startSession, endSession } = useNavigationStore();
  const { voiceLanguage, voiceSpeed, hapticIntensity } = useSettingsStore();

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  const speak = useCallback(
    (text: string) => {
      if (text === lastSpoken) return;
      setLastSpoken(text);
      Speech.speak(text, {
        language: voiceLanguage,
        rate: voiceSpeed,
        onDone: () => setLastSpoken(""),
      });
    },
    [lastSpoken, voiceLanguage, voiceSpeed]
  );

  const triggerHaptic = useCallback(
    (type: "obstacle" | "warning" | "info") => {
      if (hapticIntensity === 0) return;
      if (type === "obstacle") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (type === "warning") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [hapticIntensity]
  );

  const captureAndAnalyze = useCallback(async () => {
    if (!cameraRef.current || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const photo = await cameraRef.current.takeSnapshot({ quality: 60 });
      const result = await analyzeFrame(photo.path);

      if (!result?.detections?.length) {
        setDetections([]);
        return;
      }

      setDetections(result.detections);

      // Announce closest critical detection
      const critical = result.detections.find(
        (d: any) => d.distanceM && d.distanceM < 2.0
      );
      const toAnnounce = critical || result.detections[0];

      if (toAnnounce?.spokenText) {
        speak(toAnnounce.spokenText);
        if (critical) triggerHaptic("obstacle");
        else triggerHaptic("info");
      }
    } catch {
      // Silently fail — don't interrupt user
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, speak, triggerHaptic]);

  // Start/stop frame analysis loop
  useEffect(() => {
    if (isNavigating) {
      intervalRef.current = setInterval(captureAndAnalyze, FRAME_INTERVAL_MS);
      speak("Navigation started. Camera is active.");
      AccessibilityInfo.announceForAccessibility("Navigation started");
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setDetections([]);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isNavigating]);

  if (!hasPermission) {
    return (
      <View style={styles.center} accessible accessibilityLabel="Camera permission required">
        <Text style={styles.permissionText}>Camera permission is required for navigation.</Text>
        <TouchableOpacity
          style={styles.permissionBtn}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Grant camera permission"
        >
          <Text style={styles.permissionBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center} accessible accessibilityLabel="No camera available">
        <Text style={styles.permissionText}>No camera device found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        accessibilityLabel="Camera viewfinder"
        accessibilityHint="Camera is analyzing your surroundings"
      />

      {/* Detection overlay */}
      <DetectionOverlay detections={detections} />

      {/* Top status bar */}
      <View style={styles.topBar} accessibilityRole="status">
        <View style={[styles.statusDot, { backgroundColor: isNavigating ? "#22c55e" : "#ef4444" }]} />
        <Text style={styles.statusText} accessibilityLabel={isNavigating ? "Navigation active" : "Navigation stopped"}>
          {isNavigating ? "Navigating" : "Stopped"}
        </Text>
        {isAnalyzing && (
          <Text style={styles.analyzingText} accessibilityLabel="Analyzing surroundings">
            Analyzing...
          </Text>
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <SosButton />

        <TouchableOpacity
          style={[styles.navBtn, isNavigating && styles.navBtnActive]}
          onPress={() => (isNavigating ? endSession() : startSession())}
          accessibilityRole="button"
          accessibilityLabel={isNavigating ? "Stop navigation" : "Start navigation"}
          accessibilityHint={isNavigating ? "Stops camera analysis and voice guidance" : "Starts camera analysis and voice guidance"}
        >
          <Text style={styles.navBtnText}>{isNavigating ? "Stop" : "Start"}</Text>
        </TouchableOpacity>

        <VoiceCommandButton onIntent={handleIntent} />
      </View>
    </View>
  );

  function handleIntent(intent: string, text?: string) {
    if (intent === "START_NAVIGATION") startSession();
    else if (intent === "STOP_NAVIGATION") endSession();
    else if (intent === "DETECT_OBJECTS") captureAndAnalyze();
    else if (intent === "TRIGGER_SOS") {
      // SOS handled by SosButton — trigger for convenience
    }
    else if (intent === "REPEAT") {
      if (lastSpoken) speak(lastSpoken);
    }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#000" },
  topBar: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  analyzingText: { color: "#94a3b8", fontSize: 12, marginLeft: "auto" },
  bottomBar: {
    position: "absolute",
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  navBtn: {
    flex: 1,
    backgroundColor: "#0ea5e9",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    minHeight: 56,
  },
  navBtnActive: { backgroundColor: "#ef4444" },
  navBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  permissionText: { color: "#fff", fontSize: 16, textAlign: "center", marginBottom: 20 },
  permissionBtn: { backgroundColor: "#0ea5e9", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14, minHeight: 48 },
  permissionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
