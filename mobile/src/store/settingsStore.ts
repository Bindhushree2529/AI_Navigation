import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsStore {
  voiceLanguage: string;
  voiceSpeed: number;
  voiceType: string;
  hapticIntensity: number;
  highContrast: boolean;
  offlineMode: boolean;
  darkMode: boolean;
  announceCadence: number;
  setVoiceLanguage: (v: string) => void;
  setVoiceSpeed: (v: number) => void;
  setHapticIntensity: (v: number) => void;
  setHighContrast: (v: boolean) => void;
  setOfflineMode: (v: boolean) => void;
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
      setVoiceLanguage: (v) => set({ voiceLanguage: v }),
      setVoiceSpeed: (v) => set({ voiceSpeed: v }),
      setHapticIntensity: (v) => set({ hapticIntensity: v }),
      setHighContrast: (v) => set({ highContrast: v }),
      setOfflineMode: (v) => set({ offlineMode: v }),
    }),
    {
      name: "naviassist-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
