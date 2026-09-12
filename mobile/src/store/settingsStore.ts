import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type BatteryMode = "normal" | "saver" | "critical";
export type AppLanguage = "en-US" | "kn-IN" | "hi-IN" | "te-IN" | "ta-IN" | "ml-IN" | "bn-IN";

interface SettingsStore {
  voiceLanguage: AppLanguage;
  voiceSpeed: number;
  voiceType: string;
  hapticIntensity: number;
  highContrast: boolean;
  offlineMode: boolean;
  darkMode: boolean;
  announceCadence: number;
  batteryMode: BatteryMode;
  batteryLevel: number | null;
  isCharging: boolean;
  isOnline: boolean;
  setVoiceLanguage: (v: AppLanguage) => void;
  setVoiceSpeed: (v: number) => void;
  setHapticIntensity: (v: number) => void;
  setHighContrast: (v: boolean) => void;
  setOfflineMode: (v: boolean) => void;
  setBatteryMode: (v: BatteryMode) => void;
  setBatteryLevel: (level: number | null, charging: boolean) => void;
  setOnline: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      voiceLanguage: "en-US",
      voiceSpeed: 1.0,
      voiceType: "female",
      hapticIntensity: 2,
      highContrast: false,
      offlineMode: false,
      darkMode: false,
      announceCadence: 3,
      batteryMode: "normal",
      batteryLevel: null,
      isCharging: false,
      isOnline: true,
      setVoiceLanguage: (v) => set({ voiceLanguage: v }),
      setVoiceSpeed: (v) => set({ voiceSpeed: v }),
      setHapticIntensity: (v) => set({ hapticIntensity: v }),
      setHighContrast: (v) => set({ highContrast: v }),
      setOfflineMode: (v) => set({ offlineMode: v }),
      setBatteryMode: (v) => set({ batteryMode: v }),
      setBatteryLevel: (level, charging) => {
        let batteryMode: BatteryMode = "normal";
        if (level !== null && level <= 10) batteryMode = "critical";
        else if (level !== null && level <= 25) batteryMode = "saver";
        set({ batteryLevel: level, isCharging: charging, batteryMode });
      },
      setOnline: (v) => set({ isOnline: v }),
    }),
    {
      name: "naviassist-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        voiceLanguage: s.voiceLanguage,
        voiceSpeed: s.voiceSpeed,
        voiceType: s.voiceType,
        hapticIntensity: s.hapticIntensity,
        highContrast: s.highContrast,
        offlineMode: s.offlineMode,
        darkMode: s.darkMode,
        announceCadence: s.announceCadence,
      }),
    }
  )
);
